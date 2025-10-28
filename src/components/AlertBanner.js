// src/components/AlertBanner.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../theme";

export default function AlertBanner({ level = "green", children }) {
  const map = {
    green: {
      bg: theme.colors.greenBg,
      icon: "check-circle",
      color: theme.colors.secondary, // mint teal
    },
    yellow: {
      bg: theme.colors.yellowBg,
      icon: "warning-amber",
      color: theme.colors.accent, // apricot
    },
    orange: {
      bg: theme.colors.orangeBg,
      icon: "report",
      color: theme.colors.accent,
    },
    red: {
      bg: theme.colors.redBg,
      icon: "error",
      color: "#D32F2F", // deeper red for clarity
    },
  };

  const st = map[level] ?? map.green;

  return (
    <View style={[styles.wrap, { backgroundColor: st.bg }]}>
      <MaterialIcons name={st.icon} size={20} color={st.color} />
      <Text style={[styles.text, { color: st.color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  text: {
    ...theme.typography.body,
    fontWeight: "600",
  },
});
