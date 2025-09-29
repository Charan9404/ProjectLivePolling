import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import socket from '../socket';

function StudentView() {
  const { pollId } = useParams();
  const [responses, setResponses] = useState([]);
  const [results, setResults] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const studentId = 'student-1'; // This should come from the auth context or similar

  useEffect(() => {
    socket.emit('join-poll', { pollId, studentId });

    return () => {
      socket.emit('leave-poll', { pollId, studentId });
    };
  }, [pollId, studentId]);

  useEffect(() => {
    socket.on('poll-results', ({ responses, complete }) => {
      setResults(responses);
      // Only disable input if this student has submitted or poll is complete
      if (complete || responses.some(([id]) => id === studentId)) {
        setIsSubmitted(true);
      }
    });

    socket.on('poll-ended', () => {
      setIsActive(false);
    });

    return () => {
      socket.off('poll-results');
      socket.off('poll-ended');
    };
  }, [studentId]);

  const handleSubmit = (response) => {
    socket.emit('submit-response', { pollId, studentId, response });
    setIsSubmitted(true);
  };

  if (!isActive) {
    return <div>The poll has ended.</div>;
  }

  return (
    <div>
      <h1>Student View</h1>
      {results.map(([id, response]) => (
        <div key={id}>
          {id}: {response}
        </div>
      ))}
      {!isSubmitted && (
        <button onClick={() => handleSubmit('My Response')}>Submit Response</button>
      )}
    </div>
  );
}

export default StudentView;