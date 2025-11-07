import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import "./AnalyticsPage.css";
import { colors } from "../theme/colors";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5050/api/analytics/summary?providerID=demoProvider"
        );
        setAnalytics(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Failed to load analytics data");
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div className="analytics-loading">Loading analytics...</div>;
  if (error) return <div className="analytics-error">{error}</div>;

  const { totalPatients, improved, worsened, stable, avgStability, trend30d } =
    analytics;

  // Build chart data — simulate 30 days if not included in backend yet
  const chartData =
    trend30d && trend30d.length > 0
      ? trend30d.map((value, i) => ({
          day: `Day ${i + 1}`,
          stability: value,
        }))
      : Array.from({ length: 10 }, (_, i) => ({
          day: `Day ${i + 1}`,
          stability: Math.random() * 0.2 + 0.7, // placeholder if no data
        }));

  return (
    <div className="analytics-container">
      <h1 className="analytics-title">Analytics Overview</h1>
      <p className="analytics-subtitle">
        Provider performance and patient stability summary
      </p>

      <div className="analytics-cards">
        <div className="analytics-card">
          <h3>Total Patients</h3>
          <p>{totalPatients || 0}</p>
        </div>
        <div className="analytics-card">
          <h3>Improved</h3>
          <p>{improved || 0}</p>
        </div>
        <div className="analytics-card">
          <h3>Worsened</h3>
          <p>{worsened || 0}</p>
        </div>
        <div className="analytics-card">
          <h3>Stable</h3>
          <p>{stable || 0}</p>
        </div>
        <div className="analytics-card">
          <h3>Avg Stability</h3>
          <p>{avgStability ? (avgStability * 100).toFixed(1) + "%" : "N/A"}</p>
        </div>
      </div>

      <div className="analytics-chart">
        <h2>30-Day Stability Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.lightGray} />
            <XAxis dataKey="day" />
            <YAxis domain={[0.6, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <Tooltip
              formatter={(v) => `${(v * 100).toFixed(1)}%`}
              labelStyle={{ color: colors.textDark }}
            />
            <Line
              type="monotone"
              dataKey="stability"
              stroke={colors.primary}
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
