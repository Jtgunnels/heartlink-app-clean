import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../theme";

export default function AlertBanner({ level="green", children }) {
  const map = {
    green:  { bg: theme.colors.greenBg,  icon: "check-circle", color: theme.colors.success },
    yellow: { bg: theme.colors.yellowBg, icon: "warning-amber", color: theme.colors.warning },
    orange: { bg: theme.colors.orangeBg, icon: "report",       color: theme.colors.warning },
    red:    { bg: theme.colors.redBg,    icon: "error",        color: theme.colors.danger  },
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
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: 14, marginBottom: 12,
  },
  text: { ...theme.typography.h3 },
});
