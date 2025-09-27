// src/components/Student/PollQuestion.js
import React, { useEffect, useState, useRef } from 'react';
import { socket } from '../../socket';

export default function PollQuestion({ pollCode, name, question, options, onAnswered, hasSubmitted }) {
  const DURATION = 60; // default seconds, you can make configurable
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [disabled, setDisabled] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // reset when question changes
    setSelected(null);
    setDisabled(false);
    setTimeLeft(DURATION);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setDisabled(true);
          // emit time_up so server can send results
          socket.emit('time_up', { pollCode, studentName: name });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [question, pollCode, name]);

  useEffect(() => {
    if (hasSubmitted) {
      setDisabled(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [hasSubmitted]);

  function submit() {
    if (selected === null) {
      alert('Select an option');
      return;
    }
    socket.emit('submit_answer', { pollCode, studentName: name, answer: selected });
    setDisabled(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (onAnswered) onAnswered();
  }

  return (
    <div style={{ marginTop: 12, padding: 12, border: '1px solid #ddd' }}>
      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{question}</div>
      <div>Time left: {timeLeft}s</div>
      <div style={{ marginTop: 8 }}>
        {options.map((opt, i) => (
          <div key={i} style={{ marginTop: 6 }}>
            <label style={{ opacity: disabled && selected !== opt ? 0.6 : 1 }}>
              <input
                type="radio"
                name="pollOption"
                value={opt}
                disabled={disabled}
                checked={selected === opt}
                onChange={() => setSelected(opt)}
              />
              {' '}{opt}
            </label>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={submit} disabled={disabled}>Submit Answer</button>
      </div>
    </div>
  );
}
