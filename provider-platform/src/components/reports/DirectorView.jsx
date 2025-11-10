// HeartLink Provider Platform — DirectorView (Production-Ready)
// Unified KPI Summary for "HeartLink Program Insights"
// Strictly visual updates: layout centering + spacing per Master List vFinal++

import React from "react";

export default function DirectorView({ data = {}, loading, error }) {
  if (loading) return <div className="skeleton skeleton-director" />;
  if (error) return <p className="error-box">Unable to load summary.</p>;

  const cards = [
    {
      label: "Stable Population (%)",
      value:
        typeof data?.stablePopulation === "number"
          ? `${Math.round(data.stablePopulation)}%`
          : "—",
      color: "#45B8A1", // Green
    },
    {
      label: "At-Risk Population (%)",
      value:
        typeof data?.atRiskPopulation === "number"
          ? `${Math.round(data.atRiskPopulation)}%`
          : "—",
      color: "#F26868", // Red
    },
    {
      label: "Average Engagement (%)",
      value:
        typeof data?.avgEngagement === "number"
          ? `${Math.round(data.avgEngagement)}%`
          : "—",
      color: "#19588F", // Blue
    },
    {
      label: "Program Adherence Trend (%)",
      value:
        typeof data?.adherenceTrend === "number"
          ? `${data.adherenceTrend > 0 ? "+" : ""}${Math.round(
              data.adherenceTrend
            )}%`
          : "—",
      color: "#FDBA74", // Orange
    },
  ];

  return (
    <section className="director-view">
      {/* === Page Header === */}
    
      {/* === Section Divider === */}
      <div className="reports-section-divider" />
    </section>
  );
}
