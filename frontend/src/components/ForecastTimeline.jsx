import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ForecastTimeline = ({ data }) => {
  const getDay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={getDay} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="composite_index" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ForecastTimeline;
