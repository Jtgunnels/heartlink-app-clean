// components/ScreenLayout.js
// HeartLink v4.1-CL — ASE 1.3 (Clinical-Lock)
// Final Fix: Proper rendering of scrollable/fixed content with gradient + safe area

import React, { useRef, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";

export default function ScreenLayout({
  children,
  scrollable = true,
  style,
  contentStyle,
  scrollResetKey,
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  // ✅ Auto-scroll to top when step/page changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [scrollResetKey]);

  const Container = scrollable ? ScrollView : View;

  const containerProps = scrollable
    ? {
        ref: scrollRef,
        contentContainerStyle: [
          styles.scrollContent,
          { paddingTop: insets.top + theme.spacing.md },
          contentStyle,
        ],
        keyboardShouldPersistTaps: "handled",
      }
    : {
        style: [
          styles.fixedContent,
          { paddingTop: insets.top + theme.spacing.md },
          contentStyle,
        ],
      };

  return (
    <LinearGradient
      colors={["#f9fbfc", "#b7c9d8"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.gradient, style]}
    >
      <SafeAreaView style={styles.safeArea}>
        <Container {...containerProps}>{children}</Container>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  fixedContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
});
