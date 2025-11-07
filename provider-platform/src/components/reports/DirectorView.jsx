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
      

      {/* === KPI Summary Grid === */}
      <div className="kpi-grid">
        {cards.map((card, index) => (
          <div
            className="kpi-card"
            key={index}
            style={{
              borderTop: `4px solid ${card.color}`,
              backgroundColor: "#FFFFFF",
              borderRadius: "16px",
              boxShadow: "0 3px 8px rgba(0, 0, 0, 0.06)",
              padding: "20px 24px",
              flex: "1 1 220px",
              minWidth: "220px",
              maxWidth: "250px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p
              className="kpi-label"
              style={{
                fontSize: "14px",
                color: "#6B7280",
                marginBottom: "6px",
              }}
            >
              {card.label}
            </p>
            <h3
              className="kpi-value"
              style={{
                fontSize: "24px",
                fontWeight: "600",
                color: "#111827",
              }}
            >
              {card.value}
            </h3>
          </div>
        ))}
      </div>

      {/* === Section Divider === */}
      <div className="reports-section-divider" />
    </section>
  );
}
