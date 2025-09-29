require('dotenv').config()
const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const { createPoll, getPoll, submitAnswer, removeStudent, saveQuestionToHistory } = require("./polls")
const { connectToDatabase, savePollHistory, getPollHistory, getPollDetails, getPollStats } = require("./database")

const app = express()
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "http://localhost:3001",
    "https://project-live-polling.vercel.app",
    "https://project-live-polling-m4tvy3ggg-charan9404s-projects.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "http://localhost:3001",
      "https://project-live-polling.vercel.app",
      "https://project-live-polling-m4tvy3ggg-charan9404s-projects.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
})

// Initialize database connection
connectToDatabase().catch(console.error)

// Helper function to save poll to history
async function savePollToHistory(poll, pollCode) {
  try {
    // Add pollCode to the poll data
    const pollData = { ...poll, pollCode }
    await savePollHistory(pollData)
    console.log(`Poll ${pollCode} saved to history`)
  } catch (error) {
    console.error(`Failed to save poll to history:`, error)
  }
}

setInterval(async () => {
  const { polls } = require("./polls")
  const now = Date.now()
  for (const [pollCode, poll] of Object.entries(polls)) {
    if (poll.isActive && poll.startTime && now - poll.startTime > poll.duration * 1000 + 5000) {
      poll.isActive = false
      io.to(pollCode).emit("time_up", { answers: poll.answers })
      console.log(`Poll ${pollCode} timed out automatically`)
      
      // Save poll to history
      try {
        await savePollToHistory(poll, pollCode)
        console.log(`Poll ${pollCode} saved to history after timeout`)
      } catch (error) {
        console.error(`Failed to save poll ${pollCode} to history:`, error)
      }
    }
  }
}, 1000)

io.on("connection", (socket) => {
  console.log("New connection:", socket.id)
  console.log("Connection origin:", socket.handshake.headers.origin)

  socket.on("teacher_create_poll", ({ question, options, duration, expectedResponses }) => {
    try {
      if (!question?.trim() || !Array.isArray(options) || options.length < 2) {
        return socket.emit("error", "Invalid poll data. Need question and at least 2 options.")
      }

      // Validate options structure: { text, isCorrect }
      const validOptions = options.filter(opt => opt?.text?.trim() && typeof opt.isCorrect === 'boolean')
      if (validOptions.length < 2) {
        return socket.emit("error", "Need at least 2 valid options with text and correct/incorrect marking.")
      }

      const pollCode = createPoll(socket.id, question.trim(), validOptions, duration || 300, expectedResponses)
      socket.join(pollCode)
      socket.emit("poll_created", { pollCode })
      console.log(`Poll ${pollCode} created by teacher ${socket.id}`)
    } catch (error) {
      console.error("Error creating poll:", error)
      socket.emit("error", "Failed to create poll")
    }
  })

  socket.on("teacher_new_question", ({ pollCode, question, options, duration = 300, expectedResponses }) => {
    const poll = getPoll(pollCode)
    if (!poll) return socket.emit("error", "Poll not found")

    if (poll.teacherId !== socket.id) {
      return socket.emit("error", "Unauthorized")
    }

    if (!question?.trim() || !Array.isArray(options) || options.length < 2) {
      return socket.emit("error", "Invalid question data")
    }

    // Validate options structure: { text, isCorrect }
    const validOptions = options.filter(opt => opt?.text?.trim() && typeof opt.isCorrect === 'boolean')
    if (validOptions.length < 2) {
      return socket.emit("error", "Need at least 2 valid options with text and correct/incorrect marking")
    }

    // Check if all expected responses received or all joined students answered
    const currentAnswers = Object.keys(poll.answers).length
    const joinedStudents = Object.keys(poll.students).length
    const expected = poll.expectedResponses || joinedStudents
    
    const allExpectedAnswered = expected && currentAnswers >= expected
    const allJoinedAnswered = joinedStudents > 0 && currentAnswers >= joinedStudents
    
    if (poll.isActive && !allExpectedAnswered && !allJoinedAnswered) {
      return socket.emit("error", "Wait until all expected students answer or time runs out")
    }

    // Save current question to history before starting new one
    if (poll.question && poll.question.trim()) {
      saveQuestionToHistory(pollCode)
    }

    poll.question = question.trim()
    poll.options = validOptions
    poll.answers = {}
    poll.startTime = Date.now()
    poll.duration = duration
    poll.expectedResponses = expectedResponses || poll.expectedResponses
    poll.isActive = true
    
    console.log(`Poll ${pollCode} reactivated for new question. isActive: ${poll.isActive}`)

    // Send new_question to all clients in the room (including teacher)
    console.log(`🎯 Sending new_question to poll ${pollCode} with ${Object.keys(poll.students).length} students`)
    console.log(`🎯 Students in room:`, Object.keys(poll.students))
    console.log(`🎯 New question data:`, {
      question: poll.question,
      options: poll.options,
      duration,
      startTime: poll.startTime
    })
    
    // Send to all clients in the room
    const roomClients = io.sockets.adapter.rooms.get(pollCode)
    console.log(`🎯 Room ${pollCode} has ${roomClients ? roomClients.size : 0} clients`)
    
    if (roomClients) {
      console.log(`🎯 Room clients:`, Array.from(roomClients))
    }
    
    // BULLETPROOF: Send new_question to ALL clients in the room
    io.to(pollCode).emit("new_question", {
      question: poll.question,
      options: poll.options,
      duration,
      startTime: poll.startTime,
      messages: poll.messages || [],
    })
    console.log(`🎯✅ SENT new_question event to room ${pollCode}`)
    
    // Also send to teacher specifically if they're subscribed
    if (poll.teacherId) {
      const teacherSocket = io.sockets.sockets.get(poll.teacherId)
      if (teacherSocket) {
        teacherSocket.emit("new_question", {
          question: poll.question,
          options: poll.options,
          duration,
          startTime: poll.startTime,
          messages: poll.messages || [],
        })
        console.log(`🎯 Also sent new_question to teacher ${poll.teacherId}`)
      }
    }
    
    // Also send the startTime back to the teacher specifically
    socket.emit("question_started", {
      startTime: poll.startTime,
      duration,
    })
    
    console.log(`New question started in poll ${pollCode}`)
  })

  socket.on("student_join", ({ pollCode, studentName }) => {
    const poll = getPoll(pollCode)
    if (!poll) return socket.emit("error", "Poll not found")

    if (!studentName?.trim()) {
      return socket.emit("error", "Please enter a valid name")
    }

    const cleanName = studentName.trim()
    const existingNames = Object.values(poll.students)
    if (existingNames.includes(cleanName)) {
      return socket.emit("error", "Name already taken. Please choose a different name.")
    }

    poll.students[socket.id] = cleanName
    socket.join(pollCode)

    console.log(`🎯 Student ${cleanName} joined poll ${pollCode}`)
    console.log(`🎯 Current students in poll:`, Object.keys(poll.students))
    console.log(`🎯 Room ${pollCode} now has ${io.sockets.adapter.rooms.get(pollCode)?.size || 0} clients`)

    io.to(pollCode).emit("joined_poll_ack", { students: poll.students })

    socket.emit("joined_poll", {
      question: poll.question,
      options: poll.options,
      duration: poll.duration,
      startTime: poll.startTime,
    })

    console.log(`Student ${cleanName} joined poll ${pollCode}`)
  })

  socket.on("submit_answer", ({ pollCode, studentName, answer }) => {
    console.log(`🎯🎯🎯 RECEIVED SUBMIT_ANSWER:`, { pollCode, studentName, answer })
    
    const poll = getPoll(pollCode)
    if (!poll) {
      console.log(`❌ Poll not found: ${pollCode}`)
      return socket.emit("error", "Poll not found")
    }

    if (!poll.isActive) {
      console.log(`❌ Poll not active: ${pollCode}`)
      return socket.emit("error", "Poll is not active")
    }

    if (poll.students[socket.id] !== studentName) {
      console.log(`❌ Unauthorized: ${studentName} not found in students for socket ${socket.id}`)
      console.log(`❌ Current students:`, poll.students)
      return socket.emit("error", "Unauthorized")
    }

    if (!poll.options.some(option => option.text === answer)) {
      console.log(`❌ Invalid answer: ${answer} not in options:`, poll.options.map(o => o.text))
      return socket.emit("error", "Invalid answer option")
    }

    console.log(`✅ All validations passed for ${studentName}`)
    submitAnswer(pollCode, studentName, answer)

    console.log(`🎯🎯🎯 SENDING UPDATE_RESULTS TO POLL ${pollCode}:`, {
      answers: poll.answers,
      options: poll.options,
      question: poll.question
    })
    
    // Send ONLY answers to all students - don't send options/question to prevent UI corruption
    io.to(pollCode).emit("update_results", { 
      answers: poll.answers
    })
    console.log(`Student ${studentName} answered: ${answer}`)
  })

  // Note: time_up events are handled by the setInterval function above
  // This socket handler is not needed as it causes duplicate processing


  socket.on("teacher_subscribe", ({ pollCode }) => {
    console.log(`Teacher subscribing to poll: ${pollCode}`)
    const poll = getPoll(pollCode)
    if (!poll || poll.teacherId !== socket.id) {
      console.log(`Teacher subscription failed: poll not found or unauthorized`)
      return
    }

    socket.join(pollCode)
    console.log(`Teacher joined poll room: ${pollCode}`)
    const pollState = {
      question: poll.question,
      options: poll.options,
      answers: poll.answers,
      students: poll.students,
      duration: poll.duration,
      startTime: poll.startTime,
      expectedResponses: poll.expectedResponses,
      isActive: poll.isActive,
      messages: poll.messages || [],
      questionHistory: poll.questionHistory || [],
    }
    
    console.log(`🎯 Sending poll state to teacher:`, {
      question: pollState.question,
      questionHistory: pollState.questionHistory,
      questionHistoryLength: pollState.questionHistory.length
    })
    
    socket.emit("poll_state", pollState)
    console.log(`Sent poll state to teacher:`, { answers: poll.answers, students: poll.students })
  })

  // Chat: teacher -> everyone
  socket.on("teacher_send_message", ({ pollCode, text }) => {
    const poll = getPoll(pollCode)
    if (!poll || poll.teacherId !== socket.id || !text?.trim()) return

    const message = { id: Date.now().toString(), from: "teacher", name: "Teacher", text: text.trim(), ts: Date.now() }
    poll.messages = poll.messages || []
    poll.messages.push(message)
    io.to(pollCode).emit("chat_message", { message })
  })

  // Chat: student -> teacher only
  socket.on("student_send_message", ({ pollCode, text }) => {
    console.log(`Student sending message:`, { pollCode, text })
    const poll = getPoll(pollCode)
    if (!poll || !text?.trim()) {
      console.log(`Invalid poll or empty text`)
      return
    }

    const studentName = poll.students[socket.id]
    if (!studentName) {
      console.log(`Student not found in poll`)
      return
    }

    const message = { id: Date.now().toString(), from: "student", name: studentName, text: text.trim(), ts: Date.now() }
    poll.messages = poll.messages || []
    poll.messages.push(message)
    console.log(`Message created:`, message)

    // send to teacher socket and back to student
    const teacherSocket = io.sockets.sockets.get(poll.teacherId)
    if (teacherSocket) {
      teacherSocket.emit("chat_message", { message })
      console.log(`Sent to teacher: ${poll.teacherId}`)
    }
    
    // Also send back to the student so they can see their own message
    socket.emit("chat_message", { message })
    console.log(`Sent back to student: ${socket.id}`)
  })

  socket.on("remove_student", ({ pollCode, studentId }) => {
    const poll = getPoll(pollCode)
    if (!poll || poll.teacherId !== socket.id) return

    removeStudent(pollCode, studentId)

    const studentSocket = io.sockets.sockets.get(studentId)
    if (studentSocket) {
      studentSocket.leave(pollCode)
      studentSocket.emit("error", "You have been removed from the poll")
    }

    io.to(pollCode).emit("joined_poll_ack", { students: poll.students })
    console.log(`Student ${studentId} removed from poll ${pollCode}`)
  })

  socket.on("disconnect", async () => {
    console.log("Disconnected:", socket.id)

    const { polls } = require("./polls")
    for (const [pollCode, poll] of Object.entries(polls)) {
      if (poll.students[socket.id]) {
        const studentName = poll.students[socket.id]
        delete poll.students[socket.id]
        delete poll.answers[studentName]
        io.to(pollCode).emit("joined_poll_ack", { students: poll.students })
        console.log(`Student ${studentName} disconnected from poll ${pollCode}`)
        
        // Save poll if teacher disconnected or if poll has responses
        if (poll.teacherId === socket.id || Object.keys(poll.answers).length > 0) {
          await savePollToHistory(poll, pollCode)
        }
      }
    }
  })
})

app.get("/", (req, res) => {
  res.json({
    message: "Live Polling Backend is running!",
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  })
})

// Poll History API Endpoints
app.get("/api/poll-history/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params
    const { limit = 20 } = req.query
    
    const history = await getPollHistory(teacherId, parseInt(limit))
    res.json({ success: true, data: history })
  } catch (error) {
    console.error("Error fetching poll history:", error)
    res.status(500).json({ success: false, error: "Failed to fetch poll history" })
  }
})

// Get all polls (for debugging)
app.get("/api/poll-history-all", async (req, res) => {
  try {
    const { limit = 20 } = req.query
    const history = await getPollHistory(null, parseInt(limit))
    res.json({ success: true, data: history })
  } catch (error) {
    console.error("Error fetching all poll history:", error)
    res.status(500).json({ success: false, error: "Failed to fetch poll history" })
  }
})

app.get("/api/poll-details/:pollCode/:teacherId", async (req, res) => {
  try {
    const { pollCode, teacherId } = req.params
    const poll = await getPollDetails(pollCode, teacherId)
    
    if (!poll) {
      return res.status(404).json({ success: false, error: "Poll not found" })
    }
    
    res.json({ success: true, data: poll })
  } catch (error) {
    console.error("Error fetching poll details:", error)
    res.status(500).json({ success: false, error: "Failed to fetch poll details" })
  }
})

app.get("/api/poll-stats/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params
    const stats = await getPollStats(teacherId)
    res.json({ success: true, data: stats })
  } catch (error) {
    console.error("Error fetching poll stats:", error)
    res.status(500).json({ success: false, error: "Failed to fetch poll stats" })
  }
})

app.get("/api/poll/:code", (req, res) => {
  const poll = getPoll(req.params.code)
  if (!poll) {
    return res.status(404).json({ error: "Poll not found" })
  }

  res.json({
    pollCode: req.params.code,
    question: poll.question,
    options: poll.options,
    studentCount: Object.keys(poll.students).length,
    answerCount: Object.keys(poll.answers).length,
    isActive: poll.isActive,
  })
})

const PORT = process.env.PORT || 5005
server.listen(PORT, () => {
  console.log(`Live Polling Backend running on http://localhost:${PORT}`)
  console.log(`Socket.IO server ready for connections`)
})
