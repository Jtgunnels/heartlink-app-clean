import React from "react";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export default function PageFooter() {
  return (
    <footer
      className="page-footer"
      style={{
        textAlign: "center",
        padding: spacing.md,
        backgroundColor: colors.backgroundLight,
        color: colors.textMuted,
        fontFamily: typography.secondary,
        fontSize: typography.caption,
        borderTop: `1px solid ${colors.borderLight}`,
      }}
    >
      HeartLink Clinical Summary is a general wellness tool and is not intended
      to diagnose or treat medical conditions.
    </footer>
  );
}
