"use client"

import { useEffect, useState } from "react"
import { socket } from "../../socket"
import PollQuestion from "./PollQuestion"
import PollResults from "./PollResults"

export default function JoinPoll() {
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [joined, setJoined] = useState(false)
  const [poll, setPoll] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [results, setResults] = useState(null)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const [students, setStudents] = useState({})

  useEffect(() => {
    const savedName = localStorage.getItem("poll_student_name")
    if (savedName) setName(savedName)

    socket.on("joined_poll", ({ question, options, duration, startTime }) => {
      setPoll({ question, options, duration })
      setStartTime(startTime)
      setJoined(true)
      setHasSubmitted(false)
      setResults(null)
      setIsJoining(false)
      setError("")
    })

    socket.on("joined_poll_ack", ({ students }) => {
      setStudents(students || {})
    })

    socket.on("update_results", ({ answers }) => {
      setResults(answers)
    })

    socket.on("new_question", ({ question, options, duration, startTime }) => {
      setPoll({ question, options, duration })
      setStartTime(startTime)
      setHasSubmitted(false)
      setResults(null)
    })

    socket.on("error", (message) => {
      setError(message)
      setIsJoining(false)
    })

    return () => {
      socket.off("joined_poll")
      socket.off("joined_poll_ack")
      socket.off("update_results")
      socket.off("new_question")
      socket.off("error")
    }
  }, [])

  function handleJoin(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Please enter your name")
      return
    }
    if (!code.trim()) {
      setError("Please enter the poll code")
      return
    }
    if (code.trim().length !== 6) {
      setError("Poll code must be 6 digits")
      return
    }

    setError("")
    setIsJoining(true)
    localStorage.setItem("poll_student_name", name.trim())
    socket.emit("student_join", { pollCode: code.trim(), studentName: name.trim() })
  }

  function onAnswered() {
    setHasSubmitted(true)
  }

  if (joined && poll) {
    return (
      <div>
        <div
          style={{
            background: "#e6fffa",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            border: "1px solid #81e6d9",
          }}
        >
          <div style={{ fontWeight: "600", color: "#234e52" }}>Connected to Poll: {code}</div>
          <div style={{ fontSize: "0.9rem", color: "#2c7a7b", marginTop: "4px" }}>
            {Object.keys(students).length} student{Object.keys(students).length !== 1 ? "s" : ""} joined
          </div>
        </div>

        <PollQuestion
          pollCode={code}
          name={name}
          question={poll.question}
          options={poll.options}
          duration={poll.duration}
          startTime={startTime}
          onAnswered={onAnswered}
          hasSubmitted={hasSubmitted}
        />
        <PollResults results={results} />
      </div>
    )
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleJoin}>
        <div className="form-group">
          <label className="label">Your Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Enter your name..."
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label className="label">Poll Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="input"
            placeholder="Enter 6-digit poll code..."
            maxLength="6"
            style={{
              fontFamily: "monospace",
              fontSize: "1.2rem",
              textAlign: "center",
              letterSpacing: "0.1em",
            }}
          />
          <div style={{ fontSize: "0.8rem", color: "#718096", marginTop: "4px" }}>
            Ask your teacher for the 6-digit code
          </div>
        </div>

        <button
          type="submit"
          className="button"
          disabled={isJoining}
          style={{ width: "100%", fontSize: "1.1rem", padding: "16px" }}
        >
          {isJoining ? "Joining..." : "Join Poll"}
        </button>
      </form>

      <div style={{ marginTop: "2rem", padding: "1rem", background: "#f7fafc", borderRadius: "8px" }}>
        <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem", color: "#4a5568" }}>
          How to join:
        </h4>
        <ol style={{ fontSize: "0.9rem", color: "#718096", paddingLeft: "1rem" }}>
          <li>Enter your name (this will be visible to others)</li>
          <li>Get the 6-digit poll code from your teacher</li>
          <li>Click "Join Poll" to participate</li>
        </ol>
      </div>
    </div>
  )
}
