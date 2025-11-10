// src/components/ReportsSummaryCards.jsx
// HeartLink Provider Platform — Updated Summary Cards (Production-Ready)

import React from "react";
import "./ReportsSummaryCards.css";

export default function ReportsSummaryCards({ overview = {} }) {
  const {
    totalPatients = 0,
    activePatients = 0,
    stablePopulation = 0,
    atRiskPopulation = 0,
    avgEngagement = 0,
    adherenceTrend = 0,
    avgWellness = 0,
  } = overview;

  const cards = [
    {
      title: "Active Patients",
      value: activePatients || totalPatients,
      suffix: "",
      color: "#19588F",
    },
    {
      title: "Stable Population",
      value: Number.isFinite(stablePopulation)
        ? `${stablePopulation}%`
        : "0%",
      color: "#45B8A1",
    },
    {
      title: "At-Risk Population",
      value: Number.isFinite(atRiskPopulation)
        ? `${atRiskPopulation}%`
        : "0%",
      color: "#F26868",
    },
    {
      title: "Average Daily Engagement",
      value: Number.isFinite(avgEngagement)
        ? `${avgEngagement}%`
        : "0%",
      color: "#F6AE2D",
    },
    {
      title: "Adherence Trend Δ",
      value: `${adherenceTrend >= 0 ? "+" : ""}${adherenceTrend}%`,
      color: adherenceTrend >= 0 ? "#45B8A1" : "#F26868",
    },
  ];

  return (
    <div className="summary-cards">
      {cards.map((card) => (
        <div key={card.title} className="summary-card">
          <h3 style={{ color: card.color }}>{card.value}</h3>
          <p>{card.title}</p>
        </div>
      ))}
    </div>
  );
}
