// src/components/DebugPanel.js
// HeartLink Debug Panel — v4.1-CL / ASE 1.3
// Compares active score vs shadow algorithm for internal validation

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from "react-native";
import { useDebug } from "../context/DebugContext";

export default function DebugPanel() {
  const { devMode, scoreResult, shadowResult } = useDebug();
  const [collapsed, setCollapsed] = useState(true);
  const [heightAnim] = useState(new Animated.Value(0));

  if (!devMode || !scoreResult) return null;

  const toggleCollapse = () => {
    const toValue = collapsed ? 1 : 0;
    Animated.timing(heightAnim, {
      toValue,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
    setCollapsed(!collapsed);
  };

  const interpolateHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const vPrimary = "v4.1-CL (ASE 1.3)";
  const vShadow = shadowResult ? "v3.9e-CL" : null;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleCollapse} activeOpacity={0.8} style={styles.header}>
        <Text style={styles.title}>
          Developer Debug{vShadow ? `: ${vPrimary} vs ${vShadow}` : `: ${vPrimary}`}
        </Text>
        <Text style={styles.chevron}>{collapsed ? "v" : "^"}</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.body, { height: interpolateHeight, opacity: heightAnim }]}>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>{vPrimary}</Text>
            <Text style={styles.value}>
              {scoreResult?.category ?? "—"} ({scoreResult?.ssi?.toFixed?.(2) ?? "—"})
            </Text>
          </View>

          {shadowResult && (
            <View style={styles.col}>
              <Text style={[styles.label, { color: "#666" }]}>{vShadow}</Text>
              <Text style={[styles.value, { color: "#666" }]}>
                {shadowResult?.category ?? "—"} ({shadowResult?.normalized ?? "—"})
              </Text>
            </View>
          )}
        </View>

        {shadowResult && scoreResult?.category !== shadowResult?.category && (
          <Text style={styles.warn}>⚠ Categories differ between versions!</Text>
        )}

        <Text style={styles.subTitle}>Recent Calculation</Text>
        <Text style={styles.reasonText}>
          SSI: {scoreResult?.ssi?.toFixed?.(2) ?? "—"} | Category: {scoreResult?.category ?? "—"}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(14,46,79,0.15)",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#F0F4F8",
  },
  title: { color: "#0E2E4F", fontWeight: "800", fontSize: 15 },
  chevron: { color: "#0E2E4F", fontWeight: "800", fontSize: 16 },
  body: { overflow: "hidden", paddingHorizontal: 12 },
  row: { flexDirection: "row", justifyContent: "space-around", marginBottom: 6, marginTop: 6 },
  col: { alignItems: "center", flex: 1 },
  label: { fontWeight: "700", color: "#0E2E4F" },
  value: { color: "#0E2E4F" },
  subTitle: {
    textAlign: "center",
    color: "#0E2E4F",
    fontWeight: "700",
    marginTop: 6,
    textDecorationLine: "underline",
  },
  reasonText: { fontSize: 13, color: "#0E2E4F", textAlign: "center", marginTop: 2 },
  warn: { color: "#D32F2F", fontWeight: "700", textAlign: "center", marginTop: 6 },
});
