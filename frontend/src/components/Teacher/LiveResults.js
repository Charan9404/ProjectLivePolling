// src/components/Teacher/LiveResults.js
import React, { useEffect, useState } from 'react';
import { socket } from '../../socket';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, ResponsiveContainer } from 'recharts';
import NewQuestion from './NewQuestion';

export default function LiveResults({ pollCode }) {
  const [answersMap, setAnswersMap] = useState({}); // { option: count }
  const [options, setOptions] = useState([]);
  const [question, setQuestion] = useState('');
  const [studentsCount, setStudentsCount] = useState(0);

  useEffect(() => {
    function toCounts(answers) {
      const counts = {};
      Object.values(answers || {}).forEach((opt) => {
        counts[opt] = (counts[opt] || 0) + 1;
      });
      return counts;
    }

    socket.on('joined_poll_ack', ({ students }) => {
      setStudentsCount(Object.keys(students || {}).length);
    });

    socket.on('joined_poll', ({ question, options }) => {
      setQuestion(question);
      setOptions(options);
    });

    socket.on('update_results', ({ answers }) => {
      const counts = toCounts(answers);
      setAnswersMap(counts);
    });

    socket.on('new_question', ({ question, options }) => {
      // reset state when new question starts
      setQuestion(question);
      setOptions(options);
      setAnswersMap({});
    });

    // request current poll state
    socket.emit('teacher_subscribe', { pollCode });

    return () => {
      socket.off('update_results');
      socket.off('joined_poll');
      socket.off('joined_poll_ack');
      socket.off('new_question');
    };
  }, [pollCode]);

  const data = (options || []).map((opt) => ({
    name: opt,
    count: answersMap[opt] || 0,
  }));

  return (
    <div>
      <h3>Poll Code: <code>{pollCode}</code></h3>
      <div><strong>Question:</strong> {question}</div>
      <div style={{ marginTop: 8 }}><strong>Students joined:</strong> {studentsCount}</div>

      <div style={{ height: 300, marginTop: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis dataKey="name" type="category" />
            <Tooltip />
            <Bar dataKey="count">
              <LabelList dataKey="count" position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* New Question Form */}
      <NewQuestion pollCode={pollCode} />
    </div>
  );
}
