import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { theme } from "../theme";

export default function HeroHeader({ title, subtitle }) {
  return (
    <View style={styles.container}>
      {/* ✅ Logo (pulled from assets path) */}
      <Image
        source={require("../../assets/logos/heartlink_full_light.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    width: "100%",
  },
  logo: {
    width: 200,
    height: 55,
    marginBottom: 12,
  },
  title: {
    color: "#0E2E4F",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 340,
  },
});
