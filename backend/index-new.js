require('dotenv').config()
const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const { connectToDatabase, savePollHistory, getPollHistory, getPollDetails, getPollStats } = require("./database")
const { createPoll, getPoll, addStudent, removeStudent, submitAnswer, getPollState, updatePollQuestion, deactivatePoll, getAllPolls } = require("./poll-state-manager")

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
    const pollData = { ...poll, pollCode }
    await savePollHistory(pollData)
    console.log(`Poll ${pollCode} saved to history`)
  } catch (error) {
    console.error(`Failed to save poll to history:`, error)
  }
}

// Poll timeout checker
setInterval(async () => {
  const polls = getAllPolls()
  const now = Date.now()
  for (const [pollCode, poll] of Object.entries(polls)) {
    if (poll.isActive && poll.startTime && now - poll.startTime > poll.duration * 1000 + 5000) {
      deactivatePoll(pollCode)
      io.to(pollCode).emit("time_up", { answers: poll.answers })
      console.log(`Poll ${pollCode} timed out automatically`)
      
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

  // Teacher creates poll
  socket.on("teacher_create_poll", ({ question, options, duration, expectedResponses }) => {
    try {
      if (!question?.trim() || !Array.isArray(options) || options.length < 2) {
        return socket.emit("error", "Invalid poll data. Need question and at least 2 options.")
      }

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

  // Teacher starts new question
  socket.on("teacher_new_question", ({ pollCode, question, options, duration = 300, expectedResponses }) => {
    const poll = getPoll(pollCode)
    if (!poll) return socket.emit("error", "Poll not found")

    if (poll.teacherId !== socket.id) {
      return socket.emit("error", "Unauthorized")
    }

    const validOptions = options.filter(opt => opt?.text?.trim() && typeof opt.isCorrect === 'boolean')
    if (validOptions.length < 2) {
      return socket.emit("error", "Need at least 2 valid options with text and correct/incorrect marking")
    }

    const success = updatePollQuestion(pollCode, question.trim(), validOptions, duration, expectedResponses)
    if (!success) {
      return socket.emit("error", "Failed to update poll question")
    }

    // Send new question to all students
    io.to(pollCode).emit("new_question", {
      question: poll.question,
      options: poll.options,
      duration: poll.duration,
      startTime: poll.startTime,
      messages: poll.messages || [],
    })

    console.log(`New question started in poll ${pollCode}`)
  })

  // Student joins poll
  socket.on("student_join", ({ pollCode, studentName }) => {
    const poll = getPoll(pollCode)
    if (!poll) {
      return socket.emit("error", "Poll not found")
    }

    if (!studentName?.trim()) {
      return socket.emit("error", "Please enter a valid name")
    }

    const cleanName = studentName.trim()
    const existingNames = Object.values(poll.students)
    if (existingNames.includes(cleanName)) {
      return socket.emit("error", "Name already taken. Please choose a different name.")
    }

    addStudent(pollCode, socket.id, cleanName)
    socket.join(pollCode)

    console.log(`Student ${cleanName} joined poll ${pollCode}`)

    io.to(pollCode).emit("joined_poll_ack", { students: poll.students })

    socket.emit("joined_poll", {
      question: poll.question,
      options: poll.options,
      duration: poll.duration,
      startTime: poll.startTime,
    })

    console.log(`Student ${cleanName} joined poll ${pollCode}`)
  })

  // Student submits answer
  socket.on("submit_answer", ({ pollCode, studentName, answer }) => {
    console.log(`🎯 RECEIVED SUBMIT_ANSWER:`, { pollCode, studentName, answer })
    
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
      return socket.emit("error", "Unauthorized")
    }

    if (!poll.options.some(option => option.text === answer)) {
      console.log(`❌ Invalid answer: ${answer} not in options:`, poll.options.map(o => o.text))
      return socket.emit("error", "Invalid answer option")
    }

    console.log(`✅ All validations passed for ${studentName}`)
    const success = submitAnswer(pollCode, studentName, answer)
    
    if (success) {
      // Send ONLY answers to all students - no UI corruption
      io.to(pollCode).emit("update_results", { 
        answers: poll.answers
      })
      console.log(`Student ${studentName} answered: ${answer}`)
    }
  })

  // Teacher subscribes to poll
  socket.on("teacher_subscribe", ({ pollCode }) => {
    console.log(`Teacher subscribing to poll: ${pollCode}`)
    const poll = getPoll(pollCode)
    if (!poll || poll.teacherId !== socket.id) {
      console.log(`Teacher subscription failed: poll not found or unauthorized`)
      return
    }

    socket.join(pollCode)
    console.log(`Teacher joined poll room: ${pollCode}`)
    
    const pollState = getPollState(pollCode)
    socket.emit("poll_state", pollState)
    console.log(`Sent poll state to teacher:`, { answers: poll.answers, students: poll.students })
  })

  // Get poll history
  socket.on("get_poll_history", async ({ teacherId }) => {
    try {
      const history = await getPollHistory(teacherId)
      socket.emit("poll_history", history)
    } catch (error) {
      console.error("Error fetching poll history:", error)
      socket.emit("error", "Failed to fetch poll history")
    }
  })

  // Get poll details
  socket.on("get_poll_details", async ({ pollCode }) => {
    try {
      const details = await getPollDetails(pollCode)
      socket.emit("poll_details", details)
    } catch (error) {
      console.error("Error fetching poll details:", error)
      socket.emit("error", "Failed to fetch poll details")
    }
  })

  // Get poll stats
  socket.on("get_poll_stats", async ({ teacherId }) => {
    try {
      const stats = await getPollStats(teacherId)
      socket.emit("poll_stats", stats)
    } catch (error) {
      console.error("Error fetching poll stats:", error)
      socket.emit("error", "Failed to fetch poll stats")
    }
  })

  // Chat message
  socket.on("chat_message", ({ pollCode, message, senderName }) => {
    const poll = getPoll(pollCode)
    if (!poll) return

    const chatMessage = {
      from: 'student',
      name: senderName,
      text: message,
      ts: Date.now()
    }

    poll.messages = poll.messages || []
    poll.messages.push(chatMessage)

    io.to(pollCode).emit("chat_message", chatMessage)
  })

  // Teacher chat message
  socket.on("teacher_chat_message", ({ pollCode, message }) => {
    const poll = getPoll(pollCode)
    if (!poll || poll.teacherId !== socket.id) return

    const chatMessage = {
      from: 'teacher',
      name: 'Teacher',
      text: message,
      ts: Date.now()
    }

    poll.messages = poll.messages || []
    poll.messages.push(chatMessage)

    io.to(pollCode).emit("chat_message", chatMessage)
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id)
    
    // Remove student from all polls
    const polls = getAllPolls()
    for (const [pollCode, poll] of Object.entries(polls)) {
      if (poll.students[socket.id]) {
        removeStudent(pollCode, socket.id)
        io.to(pollCode).emit("joined_poll_ack", { students: poll.students })
        console.log(`Student disconnected from poll ${pollCode}`)
      }
    }
  })
})

const PORT = process.env.PORT || 5005
server.listen(PORT, () => {
  console.log(`Live Polling Backend running on http://localhost:${PORT}`)
  console.log("Socket.IO server ready for connections")
})
