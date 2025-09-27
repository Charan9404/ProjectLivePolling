// src/components/Teacher/NewQuestion.js
import React, { useState } from "react";
import { socket } from "../../socket";

export default function NewQuestion({ pollCode }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  function setOptionValue(i, v) {
    const copy = [...options];
    copy[i] = v;
    setOptions(copy);
  }

  function addOption() {
    setOptions((o) => [...o, ""]);
  }

  function removeOption(i) {
    if (options.length <= 2) return;
    setOptions((o) => o.filter((_, idx) => idx !== i));
  }

  function submit(e) {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter((o) => o !== "");
    if (!question.trim() || cleanOptions.length < 2) {
      alert("Enter a question and at least 2 options");
      return;
    }
    socket.emit("teacher_new_question", {
      pollCode,
      question: question.trim(),
      options: cleanOptions,
      duration: 60,
    });
    setQuestion("");
    setOptions(["", ""]);
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 20 }}>
      <h4>Ask New Question</h4>
      <div>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Enter question"
          style={{ width: "100%", marginBottom: 8 }}
        />
      </div>
      {options.map((opt, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input
            value={opt}
            onChange={(e) => setOptionValue(i, e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="button" onClick={() => removeOption(i)}>
            −
          </button>
        </div>
      ))}
      <button type="button" onClick={addOption} style={{ marginTop: 8 }}>
        + Add option
      </button>
      <div style={{ marginTop: 12 }}>
        <button type="submit">Start New Question</button>
      </div>
    </form>
  );
}
