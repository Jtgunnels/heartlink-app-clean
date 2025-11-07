import React from "react";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export default function PageHeader({ title, subtitle }) {
  return (
    <header
      className="page-header"
      style={{
        textAlign: "center",
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.backgroundLight,
      }}
    >
      <h1
        style={{
          color: colors.primary,
          fontFamily: typography.primary,
          fontSize: typography.headerXL,
          marginBottom: spacing.xs,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            color: colors.textSecondary,
            fontFamily: typography.secondary,
            fontSize: typography.body,
            marginTop: 0,
          }}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}
