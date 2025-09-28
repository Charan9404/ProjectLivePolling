"use client"

import { useState, useEffect } from "react"
import { socket } from "../../socket"

export default function CreatePoll({ onCreated }) {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [duration, setDuration] = useState(60)
  const [pollCode, setPollCode] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    socket.on("poll_created", ({ pollCode }) => {
      setPollCode(pollCode)
      setIsCreating(false)
      setError("")
      if (onCreated) onCreated(pollCode)
    })

    socket.on("error", (message) => {
      setError(message)
      setIsCreating(false)
    })

    return () => {
      socket.off("poll_created")
      socket.off("error")
    }
  }, [onCreated])

  function setOptionValue(i, v) {
    const copy = [...options]
    copy[i] = v
    setOptions(copy)
  }

  function addOption() {
    if (options.length < 6) {
      setOptions((o) => [...o, ""])
    }
  }

  function removeOption(i) {
    if (options.length <= 2) return
    setOptions((o) => o.filter((_, idx) => idx !== i))
  }

  function submit(e) {
    e.preventDefault()
    const cleanOptions = options.map((o) => o.trim()).filter((o) => o !== "")
    if (!question.trim()) {
      setError("Please enter a poll question")
      return
    }
    if (cleanOptions.length < 2) {
      setError("Please provide at least 2 answer options")
      return
    }
    setError("")
    setIsCreating(true)
    socket.emit("teacher_create_poll", {
      question: question.trim(),
      options: cleanOptions,
      duration: duration,
    })
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <form onSubmit={submit}>
        <div className="form-group">
          <label className="label">Poll Question</label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="input"
            placeholder="What would you like to ask your audience?"
            maxLength={200}
          />
          <div style={{ fontSize: "0.8rem", color: "#718096", marginTop: "4px" }}>{question.length}/200 characters</div>
        </div>

        <div className="form-group">
          <label className="label">Time Limit (seconds)</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input">
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={90}>1.5 minutes</option>
            <option value={120}>2 minutes</option>
            <option value={180}>3 minutes</option>
          </select>
        </div>

        <div className="form-group">
          <label className="label">Answer Options</label>
          {options.map((opt, i) => (
            <div key={i} className="option-row">
              <input
                value={opt}
                onChange={(e) => setOptionValue(i, e.target.value)}
                className="option-input"
                placeholder={`Option ${i + 1}`}
                maxLength={100}
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="remove-button"
                disabled={options.length <= 2}
                title="Remove option"
              >
                ×
              </button>
            </div>
          ))}

          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="button button-secondary"
              style={{ marginTop: "12px", width: "100%" }}
            >
              ➕ Add Another Option
            </button>
          )}

          <div style={{ fontSize: "0.8rem", color: "#718096", marginTop: "8px" }}>You can add up to 6 options</div>
        </div>

        <button
          type="submit"
          className="button"
          disabled={isCreating}
          style={{ width: "100%", fontSize: "1.1rem", padding: "16px" }}
        >
          {isCreating ? "Creating Poll..." : "Create Poll & Start"}
        </button>
      </form>

      {pollCode && (
        <div className="poll-code">
          <div style={{ marginBottom: "8px", fontWeight: "600", color: "#4a5568", fontSize: "1.1rem" }}>
            Poll Created Successfully!
          </div>
          <div style={{ marginBottom: "12px", color: "#718096" }}>Share this code with your students:</div>
          <div className="poll-code-number">{pollCode}</div>
          <div style={{ marginTop: "12px", fontSize: "0.9rem", color: "#718096" }}>
            Students can join at this URL or enter the code manually
          </div>
        </div>
      )}
    </div>
  )
}
