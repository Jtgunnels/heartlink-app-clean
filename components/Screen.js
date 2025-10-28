// src/components/Screen.js
import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, lightColors as colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

export default function Screen({ children, style }) {
  return (
    <LinearGradient
      colors={gradients.hero}        // 💙 new Deep Cerulean → Seafoam blend
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, style]}>{children}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background, // warm ivory fallback
    padding: spacing.lg,
  },
});
