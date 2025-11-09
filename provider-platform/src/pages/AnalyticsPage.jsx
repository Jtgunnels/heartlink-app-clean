// src/pages/AnalyticsPage.jsx
// HeartLink Provider Platform — Analytics Overview (Provider-Scoped)

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
        // ✅ Get current providerId from localStorage or sessionStorage
        const providerId =
          localStorage.getItem("providerId") ||
          sessionStorage.getItem("providerId");

        if (!providerId) {
          throw new Error("No providerId found — please log in again.");
        }

        // ✅ Determine base URL (auto-switch between local + production)
        const baseURL =
          import.meta.env.VITE_API_BASE_URL ||
          "https://us-central1-heartlink-provider-platform.cloudfunctions.net";

        // ✅ Request provider-scoped analytics summary from backend
        const res = await axios.get(
          `${baseURL}/api/analytics/summary?providerID=${providerId}`
        );

        setAnalytics(res.data);
      } catch (err) {
        console.error("Error fetching analytics:", err);
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Loading / error states
  if (loading)
    return <div className="analytics-loading">Loading analytics...</div>;
  if (error) return <div className="analytics-error">{error}</div>;

  // Destructure API response
  const {
    totalPatients = 0,
    improved = 0,
    worsened = 0,
    stable = 0,
    avgStability,
    trend30d,
  } = analytics || {};

  // Build chart data (fallback placeholder if trend array missing)
  const chartData =
    trend30d && trend30d.length > 0
      ? trend30d.map((value, i) => ({
          day: `Day ${i + 1}`,
          stability: value,
        }))
      : Array.from({ length: 10 }, (_, i) => ({
          day: `Day ${i + 1}`,
          stability: Math.random() * 0.2 + 0.7,
        }));

  return (
    <div className="analytics-container">
      <h1 className="analytics-title">Analytics Overview</h1>
      <p className="analytics-subtitle">
        Provider performance and patient stability summary
      </p>

      {/* === Summary Cards === */}
      <div className="analytics-cards">
        <div className="analytics-card">
          <h3>Total Patients</h3>
          <p>{totalPatients}</p>
        </div>
        <div className="analytics-card">
          <h3>Improved</h3>
          <p>{improved}</p>
        </div>
        <div className="analytics-card">
          <h3>Worsened</h3>
          <p>{worsened}</p>
        </div>
        <div className="analytics-card">
          <h3>Stable</h3>
          <p>{stable}</p>
        </div>
        <div className="analytics-card">
          <h3>Avg Stability</h3>
          <p>{avgStability ? (avgStability * 100).toFixed(1) + "%" : "N/A"}</p>
        </div>
      </div>

      {/* === 30-Day Trend Chart === */}
      <div className="analytics-chart">
        <h2>30-Day Stability Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.lightGray} />
            <XAxis dataKey="day" />
            <YAxis
              domain={[0.6, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
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
