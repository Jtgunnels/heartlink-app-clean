// src/components/TrendAnalysis.jsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const mockTrend = [
  { date: "10/03", Stability: 92 },
  { date: "10/10", Stability: 89 },
  { date: "10/17", Stability: 90 },
  { date: "10/24", Stability: 94 },
  { date: "10/31", Stability: 96 },
];

export default function TrendAnalysis() {
  return (
    <div
      className="trend-analysis"
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        marginBottom: "40px",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        30-Day Stability Trend
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockTrend}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[80, 100]} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="Stability"
            stroke="#19588F"
            strokeWidth={3}
            dot={{ r: 5, stroke: "#45B8A1", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
