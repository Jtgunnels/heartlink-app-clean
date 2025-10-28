// src/components/PrimaryButton.js
// HeartLink — Unified Calm CTA System

import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

export default function PrimaryButton({
  title,
  onPress,
  variant = "primary", // 'primary' | 'secondary' | 'accent'
  style,
  disabled = false,
}) {
  const buttonStyles = [
    styles.base,
    variant === "primary" && styles.primary,
    variant === "secondary" && styles.secondary,
    variant === "accent" && styles.accent,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.textBase,
    variant === "primary" && styles.textOnLight,
    variant === "secondary" && styles.textOnLight,
    variant === "accent" && styles.textOnAccent,
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  // 💠 Primary — Soft Indigo Mist
  primary: { backgroundColor: "#6E7DC5" },

  // 🌿 Secondary — Mint Whisper
  secondary: { backgroundColor: "#73C9C1" },

  // 🍑 Accent — Apricot Glow
  accent: { backgroundColor: "#FFD79A" },

  textBase: { fontWeight: "700", fontSize: 16, letterSpacing: 0.3 },
  textOnLight: { color: "#FFFFFF" },
  textOnAccent: { color: "#5C6BC0" },
  disabled: { opacity: 0.6 },
});
