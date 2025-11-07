import React from "react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { colors } from "../../theme/colors";

const ASE_COLORS = {
  Green: colors.statusGreen,
  Yellow: colors.statusYellow,
  Orange: colors.statusOrange,
  Red: colors.statusRed,
};

export default function PatientSnapshotCard({
  patient,
  context = "dashboard", // "dashboard" | "directory" | "report"
  onSelect,
  showTrend = true,
  showReason = true,
}) {
  const {
    id,
    name,
    status,
    aseCategory,
    adherenceRate,
    wellnessIndex,
    lastCheckIn,
    reasonSummary,
    trend = [],
  } = patient || {};

  const accent = ASE_COLORS[aseCategory] || colors.border;
  const compact = context !== "directory";
  const clickable = typeof onSelect === "function";

  return (
    <div
      className={`snapshot-card ${context}`}
      onClick={clickable ? onSelect : undefined}
      style={{
        background: "#fff",
        borderRadius: 12,
        borderLeft: `6px solid ${accent}`,
        boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
        padding: 14,
        cursor: clickable ? "pointer" : "default",
      }}
      title={clickable ? "View patient" : undefined}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: compact ? 14 : 16,
            color: colors.deepBlue,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "70%",
          }}
          title={name}
        >
          {name || "—"}
        </div>
        <span
          style={{
            background: accent,
            color: "#000",
            borderRadius: 8,
            padding: "2px 8px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {aseCategory || "—"}
        </span>
      </div>

      {/* Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginTop: 8,
        }}
      >
        <Metric label="Adherence" value={adherenceRate != null ? `${Math.round(adherenceRate)}%` : "—"} />
        <Metric label="Wellness" value={wellnessIndex != null ? Number(wellnessIndex).toFixed(2) : "—"} />
        <Metric label="Last Check-In" value={lastCheckIn || "—"} />
      </div>

      {/* Trend */}
      {showTrend && trend.length > 0 && (
        <div style={{ height: 44, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <Line
                type="monotone"
                dataKey="adherence"
                stroke={colors.deepBlue}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Reason summary */}
      {showReason && reasonSummary && (
        <div
          style={{
            marginTop: 8,
            color: colors.grayText,
            fontSize: 12,
            textOverflow: "ellipsis",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
          title={reasonSummary}
        >
          {reasonSummary}
        </div>
      )}

      {/* Footer action (hidden in report mode) */}
      {context !== "report" && clickable && (
        <div style={{ marginTop: 10, textAlign: "right" }}>
          <button
            onClick={onSelect}
            style={{
              background: colors.deepBlue,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {context === "directory" ? "Details" : "View"}
          </button>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#7A8C99" }}>{label}</div>
      <div style={{ fontWeight: 700, color: colors.grayText }}>{value}</div>
    </div>
  );
}
