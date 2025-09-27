// src/components/Student/PollResults.js
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, ResponsiveContainer } from 'recharts';

export default function PollResults({ results }) {
  const counts = useMemo(() => {
    const c = {};
    if (!results) return c;
    Object.values(results).forEach(opt => c[opt] = (c[opt] || 0) + 1);
    return c;
  }, [results]);

  if (!results) return <div style={{ marginTop: 12 }}>Results will appear here after submission or time up.</div>;

  const data = Object.keys(counts).map(opt => ({ name: opt, count: counts[opt] }));

  return (
    <div style={{ marginTop: 12 }}>
      <h4>Results</h4>
      <div style={{ height: 220 }}>
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
    </div>
  );
}
