// src/theme/index.js
// HeartLink — Global Theme (Option C: Warm Trust Blue + Coral Accents)

export const theme = {
  colors: {
    // --- Brand Core ---
    primary: "#19588F",       // Deep Cerulean Blue
    secondary: "#45B8A1",     // Seafoam Green
    accent: "#F26868",        // Coral (Heart) Red

    // --- Neutrals ---
    background: "#FFFBF7",    // Ivory White
    surface: "#FFFFFF",
    border: "#E6E1DA",
    text: "#343A3F",          // Slate Gray
    textSecondary: "#5C646A",
    shadow: "rgba(0,0,0,0.1)",

    // --- Status / Zone backgrounds ---
    greenBg: "#DFF7DF",
    yellowBg: "#FFF6CC",
    orangeBg: "#FFE2A8",
    redBg: "#F7BFC3",
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  radius: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
  },

  typography: {
    headline1: { fontSize: 30, fontWeight: "700", color: "#19588F" },
    headline2: { fontSize: 24, fontWeight: "600", color: "#19588F" },
    headline3: { fontSize: 18, fontWeight: "600", color: "#19588F" },
    body: { fontSize: 16, color: "#343A3F", lineHeight: 22 },
    small: { fontSize: 14, color: "#5C646A", lineHeight: 18 },
  },

  shadowStyle: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  gradients: {
    hero: ["#19588F", "#45B8A1"],   // Blue → Seafoam (default)
    accent: ["#19588F", "#F26868"], // Blue → Coral (for call-to-action / highlights)
  },
};
