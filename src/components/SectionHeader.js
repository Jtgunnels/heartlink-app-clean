// src/components/SectionHeader.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../theme";

export default function SectionHeader({ title, subtitle }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.sub}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.md },
  title: { ...theme.typography.h2, color: theme.colors.primary },
  sub: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
