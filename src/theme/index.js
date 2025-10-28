// src/theme/index.js
// HeartLink — Soft Indigo Mist Theme (Unified Pastel Palette)

import { moderateScale } from "react-native-size-matters";
import { animations } from "./animations";

export const theme = {
  colors: {
    // 🌤️ Brand Core
    primary: "#5C6BC0",       // Soft Indigo
    secondary: "#4DB6AC",     // Mint Teal
    accent: "#FFB74D",        // Apricot
    background: "#E0F2F1",    // Pale Mint Background
    backgroundAlt: "#FFF8E1", // Cream alternate
    surface: "#FFFFFF",       // Cards / Panels
    border: "#D9E2EC",        // Soft neutral border
    text: "#2E2E2E",          // Charcoal gray
    textSecondary: "#5F6368", // Muted gray
    success: "#81C784",
    warning: "#FFD54F",
    danger: "#E57373",
    shadow: "rgba(0,0,0,0.08)",

    // Zone backgrounds
    greenBg: "#E8F5E9",
    yellowBg: "#FFF3E0",
    orangeBg: "#FFE0B2",
    redBg: "#FFCDD2",
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
    h1: { fontSize: moderateScale(30), fontWeight: "700", fontFamily: "System" },
    h2: { fontSize: moderateScale(22), fontWeight: "600", fontFamily: "System" },
    h3: { fontSize: moderateScale(18), fontWeight: "600", fontFamily: "System" },
    body: { fontSize: moderateScale(16), fontWeight: "400", fontFamily: "System" },
    small: { fontSize: moderateScale(14), fontWeight: "400", fontFamily: "System" },
  },

  shadowStyle: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  animations,
};

// 🌈 Unified Pastel Gradient
export const gradientBackground = {
  colors: ["#5C6BC0", "#E0F2F1"], // Indigo → Mint fade
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
};
