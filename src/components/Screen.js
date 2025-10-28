// ---------------------------------------------------------------------------
// HeartLink — Global Screen Wrapper (Unified Gradient, SafeArea + Scroll Option)
// Ensures identical spacing and header alignment across all screens.
// ---------------------------------------------------------------------------

import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";

export default function Screen({ children, style, scrollable = false }) {
  return (
    <LinearGradient
      colors={["#f9fbfc", "#b7c9d8"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        {scrollable ? (
          <ScrollView
            contentContainerStyle={[styles.container, style]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.container, style]}>{children}</View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg, // 16px side padding
    paddingTop: theme.spacing.lg,        // top spacing (matches RecommendationsScreen)
    paddingBottom: theme.spacing.xl,     // comfortable scroll end padding
    backgroundColor: "transparent",
  },
});
