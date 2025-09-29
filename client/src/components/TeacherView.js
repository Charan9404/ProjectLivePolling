import React, { useEffect, useState } from 'react';
import { socket } from '../socket';

function TeacherView() {
  const [results, setResults] = useState([]);
  const [pollStatus, setPollStatus] = useState('ongoing');

  useEffect(() => {
    socket.on('poll-results', ({ responses, complete }) => {
      setResults(responses);
      if (complete) {
        setPollStatus('ended');
      }
    });

    return () => {
      socket.off('poll-results');
    };
  }, []);

  return (
    <div>
      <h1>Teacher View</h1>
      <div>
        <h2>Poll Results</h2>
        {pollStatus === 'ended' ? (
          <div>
            <h3>Poll has ended</h3>
            <ul>
              {results.map((result, index) => (
                <li key={index}>{result}</li>
              ))}
            </ul>
          </div>
        ) : (
          <h3>Poll is ongoing</h3>
        )}
      </div>
    </div>
  );
}

export default TeacherView;