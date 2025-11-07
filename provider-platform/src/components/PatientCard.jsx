import React from "react";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export default function PatientCard({
  title,
  subtitle,
  value,
  backgroundColor,
  patient,
  onClick,
}) {
  const isSummaryCard = !!title && !!value; // determines dashboard metric card mode

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: backgroundColor || colors.ivory,
        borderRadius: spacing.radiusMedium,
        padding: spacing.l,
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        textAlign: "center",
        color: colors.textDark,
        cursor: onClick ? "pointer" : "default",
        minWidth: 240,
        transition: "transform 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1.0)")}
    >
      {isSummaryCard ? (
        <>
          <h2
            style={{
              fontSize: typography.title,
              fontWeight: typography.weightSemiBold,
              marginBottom: spacing.s,
              color: colors.navy,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: 40,
              fontWeight: typography.weightBold,
              marginBottom: spacing.s,
            }}
          >
            {value}
          </p>
          <p
            style={{
              fontSize: typography.subtitle,
              color: colors.textMuted,
            }}
          >
            {subtitle}
          </p>
        </>
      ) : (
        <>
          <h3
            style={{
              fontSize: typography.subtitle,
              fontWeight: typography.weightMedium,
              color: colors.textDark,
            }}
          >
            Tap to view patient details
          </h3>
          <p
            style={{
              fontSize: typography.small,
              color: colors.textMuted,
              marginTop: spacing.s,
            }}
          >
            {patient?.code || "No Data"}
          </p>
        </>
      )}
    </div>
  );
}
