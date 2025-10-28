// ---------------------------------------------------------------------------
// HeartLink Provider Platform – PatientCard
// ---------------------------------------------------------------------------
// Displays individual patient summary with category color + hover animation
// ---------------------------------------------------------------------------

import React from "react";
import { colors } from "../theme/colors";

export default function PatientCard({ code, category = "neutral", onOpen }) {
  // Category color mapping
  const categoryMap = {
    green: { bg: "#E9F7EF", border: "#45B8A1", label: "Stable" },
    yellow: { bg: "#FFF8E1", border: "#FFCC00", label: "Monitor" },
    orange: { bg: "#FFE5CC", border: "#FF9900", label: "Follow Up" },
    red: { bg: "#FFE6E6", border: "#F26868", label: "Contact Provider" },
    neutral: { bg: "#F5F6FA", border: "#B0BEC5", label: "No Data" },
  };

  const style = categoryMap[category.toLowerCase()] || categoryMap.neutral;

  return (
    <div
      onClick={onOpen}
      style={{
        background: style.bg,
        borderLeft: `6px solid ${style.border}`,
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        padding: "16px 20px",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            margin: 0,
            color: "#0E2E4F",
            fontWeight: 600,
          }}
        >
          {code}
        </h3>
        <span
          style={{
            fontSize: 13,
            color: style.border,
            fontWeight: 600,
          }}
        >
          {style.label}
        </span>
      </div>

      <p
        style={{
          fontSize: 13,
          color: "rgba(14,46,79,0.75)",
          margin: 0,
        }}
      >
        Tap to view patient details
      </p>
    </div>
  );
}
