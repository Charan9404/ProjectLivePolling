"use client"

import { useState } from "react"
import CreatePoll from "./components/Teacher/CreatePoll"
import LiveResults from "./components/Teacher/LiveResults"
import JoinPoll from "./components/Student/JoinPoll"
import "./styles.css"

function App() {
  const [role, setRole] = useState("")
  const [teacherPollCode, setTeacherPollCode] = useState(null)

  if (!role) {
    return (
      <div className="container">
        <div className="card">
          <h1 className="title">🗳️ Live Polling System</h1>
          <p style={{ textAlign: "center", marginBottom: "2rem", color: "#718096", fontSize: "1.1rem" }}>
            Create interactive polls and get real-time responses from your audience
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setRole("teacher")} className="button">
              👨‍🏫 Create Poll (Teacher)
            </button>
            <button onClick={() => setRole("student")} className="button">
              👨‍🎓 Join Poll (Student)
            </button>
          </div>

          <div style={{ marginTop: "2rem", padding: "1rem", background: "#f7fafc", borderRadius: "8px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem", color: "#4a5568" }}>
              ✨ Features
            </h3>
            <ul style={{ fontSize: "0.9rem", color: "#718096", listStyle: "none", padding: 0 }}>
              <li>• Real-time polling with live results</li>
              <li>• Multiple choice questions</li>
              <li>• Timer-based responses</li>
              <li>• Interactive charts and analytics</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  if (role === "teacher") {
    return (
      <div className="container">
        <div className="card">
          <button
            onClick={() => {
              setRole("")
              setTeacherPollCode(null)
            }}
            className="back-button"
          >
            ← Back to Home
          </button>
          <h2 className="subtitle">👨‍🏫 Teacher Dashboard</h2>
          {!teacherPollCode ? (
            <CreatePoll onCreated={(code) => setTeacherPollCode(code)} />
          ) : (
            <LiveResults pollCode={teacherPollCode} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <button onClick={() => setRole("")} className="back-button">
          ← Back to Home
        </button>
        <h2 className="subtitle">👨‍🎓 Join Poll</h2>
        <JoinPoll />
      </div>
    </div>
  )
}

export default App
