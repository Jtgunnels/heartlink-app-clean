import { colors } from "../theme/colors";

export default function HeroHeader() {
  return (
    <header
      style={{
        padding: "28px 16px",
        textAlign: "center",
        background: `linear-gradient(180deg, ${colors.ivory}, ${colors.deepBlue}15)`,
        borderBottom: `1px solid ${colors.lightGray}`,
      }}
    >
      <h1
        style={{
          margin: 0,
          color: colors.deepBlue,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.2px",
        }}
      >
        HeartLink • Provider Portal
      </h1>
      <p
        style={{
          margin: "8px 0 0",
          color: colors.grayText,
          opacity: 0.8,
          fontSize: 14,
        }}
      >
        Review enrolled patients by code (no PHI)
      </p>
    </header>
  );
}
