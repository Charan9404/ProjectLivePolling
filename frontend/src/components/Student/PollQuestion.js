// src/components/Student/PollQuestion.js
import React, { useEffect, useState, useRef } from 'react';
import { socket } from '../../socket';

export default function PollQuestion({ pollCode, name, question, options, onAnswered, hasSubmitted, duration = 60, startTime }) {
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [disabled, setDisabled] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // reset when question changes
    setSelected(null);
    setDisabled(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const updateTimer = () => {
      if (startTime) {
        // Calculate remaining time based on server start time
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, duration - elapsed);
        
        if (remaining <= 0) {
          setDisabled(true);
          socket.emit('time_up', { pollCode, studentName: name });
          return 0;
        }
        return Math.ceil(remaining);
      } else {
        // Fallback to local timer if no startTime provided
        setTimeLeft(prev => {
          if (prev <= 1) {
            setDisabled(true);
            socket.emit('time_up', { pollCode, studentName: name });
            return 0;
          }
          return prev - 1;
        });
        return timeLeft;
      }
    };

    // Initial calculation
    const initialTime = updateTimer();
    setTimeLeft(initialTime);

    timerRef.current = setInterval(() => {
      const newTime = updateTimer();
      setTimeLeft(newTime);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [question, pollCode, name, duration, startTime]);

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
