// src/pages/TeacherPage.js
import { useState } from "react";
import CreatePoll from "./components/Teacher/CreatePoll";
import LiveResults from "../components/Teacher/LiveResults";

export default function TeacherPage() {
  const [pollCode, setPollCode] = useState(null);

  return (
    <div style={{ padding: 20 }}>
      <h2>Teacher Dashboard</h2>
      {!pollCode ? (
        <CreatePoll onCreated={(code) => setPollCode(code)} />
      ) : (
        <LiveResults pollCode={pollCode} />
      )}
    </div>
  );
}
