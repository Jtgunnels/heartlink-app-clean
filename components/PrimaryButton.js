// src/components/PrimaryButton.js
// HeartLink — Unified Calm CTA System
// Implements three tone-safe button variants: Indigo (Primary), Mint (Secondary), and Apricot (Accent)

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
  primary: {
    backgroundColor: "#6E7DC5", // calm indigo
  },

  // 🌿 Secondary — Mint Whisper
  secondary: {
    backgroundColor: "#73C9C1", // desaturated mint
  },

  // 🍑 Accent — Apricot Glow
  accent: {
    backgroundColor: "#FFD79A", // soft apricot
  },

  // Text colors
  textBase: {
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  textOnLight: {
    color: "#FFFFFF", // for Indigo / Mint buttons
  },
  textOnAccent: {
    color: "#5C6BC0", // indigo text on apricot
  },

  // Disabled
  disabled: {
    opacity: 0.6,
  },
});
