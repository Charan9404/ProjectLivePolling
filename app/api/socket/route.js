import { Server } from "socket.io"

let io
const polls = {}

function createPoll(teacherId, question, options, duration = 60) {
  const pollCode = Math.floor(100000 + Math.random() * 900000).toString()
  polls[pollCode] = {
    teacherId,
    question,
    options,
    answers: {},
    students: {},
    startTime: Date.now(),
    duration,
    isActive: true,
    questionHistory: [], // Array of previous questions with their results
  }
  return pollCode
}

function getPoll(pollCode) {
  return polls[pollCode]
}

function submitAnswer(pollCode, studentName, answer) {
  const poll = polls[pollCode]
  if (poll) poll.answers[studentName] = answer
}

function removeStudent(pollCode, studentId) {
  const poll = polls[pollCode]
  if (poll && poll.students[studentId]) {
    const studentName = poll.students[studentId]
    delete poll.students[studentId]
    delete poll.answers[studentName]
  }
}

function saveQuestionToHistory(pollCode) {
  const poll = polls[pollCode]
  if (!poll || !poll.question) return

  // Save current question to history before starting new one
  const questionEntry = {
    question: poll.question,
    options: poll.options,
    answers: { ...poll.answers }, // Copy current answers
    students: { ...poll.students }, // Copy current students
    startTime: poll.startTime,
    endTime: Date.now(),
    duration: poll.duration,
    totalResponses: Object.keys(poll.answers).length,
    correctAnswers: poll.options.filter(opt => opt.isCorrect).map(opt => opt.text),
  }

  poll.questionHistory.push(questionEntry)
}

export async function GET() {
  return new Response("Socket.IO server running", { status: 200 })
}

export async function POST(req) {
  if (!io) {
    const { createServer } = await import("http")
    const { parse } = await import("url")

    const server = createServer()
    io = new Server(server, {
      cors: { origin: "*" },
      path: "/api/socket",
    })

    io.on("connection", (socket) => {
      console.log("New connection:", socket.id)

      socket.on("teacher_create_poll", ({ question, options, duration }) => {
        const pollCode = createPoll(socket.id, question, options, duration)
        socket.join(pollCode)
        socket.emit("poll_created", { pollCode })
      })

      socket.on("teacher_new_question", ({ pollCode, question, options, duration = 60 }) => {
        const poll = getPoll(pollCode)
        if (!poll) return socket.emit("error", "Poll not found")

        const allAnswered = Object.keys(poll.answers).length === Object.keys(poll.students).length
        if (poll.isActive && !allAnswered) {
          return socket.emit("error", "Wait until all students answer or time runs out")
        }

        // Save current question to history before starting new one
        if (poll.question && poll.question.trim()) {
          saveQuestionToHistory(pollCode)
        }

        poll.question = question
        poll.options = options
        poll.answers = {}
        poll.startTime = Date.now()
        poll.duration = duration
        poll.isActive = true

        io.to(pollCode).emit("new_question", { question, options, duration })
      })

      socket.on("student_join", ({ pollCode, studentName }) => {
        const poll = getPoll(pollCode)
        if (!poll) return socket.emit("error", "Poll not found")

        poll.students[socket.id] = studentName
        socket.join(pollCode)

        io.to(pollCode).emit("joined_poll_ack", { students: poll.students })
        socket.emit("joined_poll", {
          question: poll.question,
          options: poll.options,
          duration: poll.duration,
        })
      })

      socket.on("submit_answer", ({ pollCode, studentName, answer }) => {
        submitAnswer(pollCode, studentName, answer)
        const poll = getPoll(pollCode)
        if (poll) {
          io.to(pollCode).emit("update_results", { answers: poll.answers })
        }
      })

      socket.on("time_up", ({ pollCode }) => {
        const poll = getPoll(pollCode)
        if (poll) {
          io.to(pollCode).emit("update_results", { answers: poll.answers })
        }
      })

      socket.on("teacher_subscribe", ({ pollCode }) => {
        const poll = getPoll(pollCode)
        if (poll) {
          socket.emit("poll_state", {
            question: poll.question,
            options: poll.options,
            answers: poll.answers,
            students: poll.students,
            duration: poll.duration,
            questionHistory: poll.questionHistory || [],
          })
        }
      })

      socket.on("remove_student", ({ pollCode, studentId }) => {
        removeStudent(pollCode, studentId)
        const poll = getPoll(pollCode)
        if (poll) {
          io.to(pollCode).emit("joined_poll_ack", { students: poll.students })
        }
      })

      socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id)
        for (const code in polls) {
          const poll = polls[code]
          if (poll && poll.students[socket.id]) {
            delete poll.students[socket.id]
            io.to(code).emit("joined_poll_ack", { students: poll.students })
          }
        }
      })
    })

    server.listen(5005)
  }

  return new Response("Socket.IO initialized", { status: 200 })
}
