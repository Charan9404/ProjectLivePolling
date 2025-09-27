const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const { createPoll, getPoll, submitAnswer, removeStudent } = require("./polls")

const app = express()
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://your-frontend-domain.com"]
        : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true,
  },
})

setInterval(() => {
  const { polls } = require("./polls")
  const now = Date.now()
  for (const [pollCode, poll] of Object.entries(polls)) {
    if (poll.startTime && now - poll.startTime > poll.duration * 1000 + 5000) {
      poll.isActive = false
      io.to(pollCode).emit("time_up", { answers: poll.answers })
    }
  }
}, 1000)

io.on("connection", (socket) => {
  console.log("✅ New connection:", socket.id)
  console.log("✅ Connection origin:", socket.handshake.headers.origin)

  socket.on("teacher_create_poll", ({ question, options, duration }) => {
    try {
      if (!question?.trim() || !Array.isArray(options) || options.length < 2) {
        return socket.emit("error", "Invalid poll data. Need question and at least 2 options.")
      }

      const cleanOptions = options.map((opt) => opt?.trim()).filter((opt) => opt)
      if (cleanOptions.length < 2) {
        return socket.emit("error", "Need at least 2 valid options.")
      }

      const pollCode = createPoll(socket.id, question.trim(), cleanOptions, duration || 60)
      socket.join(pollCode)
      socket.emit("poll_created", { pollCode })
      console.log(`Poll ${pollCode} created by teacher ${socket.id}`)
    } catch (error) {
      console.error("Error creating poll:", error)
      socket.emit("error", "Failed to create poll")
    }
  })

  socket.on("teacher_new_question", ({ pollCode, question, options, duration = 60 }) => {
    const poll = getPoll(pollCode)
    if (!poll) return socket.emit("error", "Poll not found")

    if (poll.teacherId !== socket.id) {
      return socket.emit("error", "Unauthorized")
    }

    if (!question?.trim() || !Array.isArray(options) || options.length < 2) {
      return socket.emit("error", "Invalid question data")
    }

    const cleanOptions = options.map((opt) => opt?.trim()).filter((opt) => opt)
    if (cleanOptions.length < 2) {
      return socket.emit("error", "Need at least 2 valid options")
    }

    const allAnswered = Object.keys(poll.answers).length === Object.keys(poll.students).length
    if (poll.isActive && !allAnswered && Object.keys(poll.students).length > 0) {
      return socket.emit("error", "Wait until all students answer or time runs out")
    }

    poll.question = question.trim()
    poll.options = cleanOptions
    poll.answers = {}
    poll.startTime = Date.now()
    poll.duration = duration
    poll.isActive = true

    io.to(pollCode).emit("new_question", {
      question: poll.question,
      options: poll.options,
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

    io.to(pollCode).emit("joined_poll_ack", { students: poll.students })

    socket.emit("joined_poll", {
      question: poll.question,
      options: poll.options,
      duration: poll.duration,
    })

    console.log(`Student ${cleanName} joined poll ${pollCode}`)
  })

  socket.on("submit_answer", ({ pollCode, studentName, answer }) => {
    const poll = getPoll(pollCode)
    if (!poll) return socket.emit("error", "Poll not found")

    if (!poll.isActive) return socket.emit("error", "Poll is not active")

    if (poll.students[socket.id] !== studentName) {
      return socket.emit("error", "Unauthorized")
    }

    if (!poll.options.includes(answer)) {
      return socket.emit("error", "Invalid answer option")
    }

    submitAnswer(pollCode, studentName, answer)

    io.to(pollCode).emit("update_results", { answers: poll.answers })
    console.log(`Student ${studentName} answered: ${answer}`)
  })

  socket.on("time_up", ({ pollCode }) => {
    const poll = getPoll(pollCode)
    if (!poll) return

    if (poll.teacherId !== socket.id) return

    poll.isActive = false
    io.to(pollCode).emit("update_results", { answers: poll.answers })
    console.log(`Time up for poll ${pollCode}`)
  })

  socket.on("teacher_subscribe", ({ pollCode }) => {
    const poll = getPoll(pollCode)
    if (!poll || poll.teacherId !== socket.id) return

    socket.join(pollCode)
    socket.emit("poll_state", {
      question: poll.question,
      options: poll.options,
      answers: poll.answers,
      students: poll.students,
      duration: poll.duration,
      isActive: poll.isActive,
    })
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

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id)

    const { polls } = require("./polls")
    for (const [pollCode, poll] of Object.entries(polls)) {
      if (poll.students[socket.id]) {
        const studentName = poll.students[socket.id]
        delete poll.students[socket.id]
        delete poll.answers[studentName]
        io.to(pollCode).emit("joined_poll_ack", { students: poll.students })
        console.log(`Student ${studentName} disconnected from poll ${pollCode}`)
      }
    }
  })
})

app.get("/", (req, res) => {
  res.json({
    message: "🚀 Live Polling Backend is running!",
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  })
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
  console.log(`✅ Live Polling Backend running on http://localhost:${PORT}`)
  console.log(`✅ Socket.IO server ready for connections`)
})
