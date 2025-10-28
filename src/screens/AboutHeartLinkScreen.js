// HeartLink v4.1-CL — ASE 1.3 (Clinical-Lock)
// AboutHeartLinkScreen – Aligned with ProgressScreen header + instant scroll reset

import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import HeroHeader from "../components/HeroHeader";
import { theme } from "../theme";

export default function AboutHeartLinkScreen() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const isFocused = useIsFocused();

  // ✅ instant scroll reset on screen focus
  useEffect(() => {
    if (isFocused && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [isFocused]);

  return (
    <LinearGradient
      colors={["#f9fbfc", "#b7c9d8"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        {/* ✅ Header aligned exactly like ProgressScreen */}
        <HeroHeader
          title="About HeartLink"
          subtitle="Learn how HeartLink supports your daily heart health management."
        />

        {/* ---------- Content ---------- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.body}>
            HeartLink is a personal health companion app for heart failure patients.
            Our mission is to help you stay aware of daily symptoms and weight changes so you can catch early warning signs before they become serious.
          </Text>

          <Text style={styles.sectionTitle}>Why HeartLink?</Text>
          <Text style={styles.body}>
            Daily symptom and weight tracking reduces hospital readmissions and helps you notice patterns sooner. HeartLink turns this routine into an easy digital habit.
          </Text>

          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.body}>
            Each day you’ll log symptoms like breathing changes, swelling, fatigue, and weight. HeartLink then compares them to your baseline and shows a simple color-coded summary.
          </Text>
          <Text style={styles.bullet}>
            • Green – At baseline {"\n"}• Yellow – Small changes {"\n"}• Orange – Follow up soon {"\n"}• Red – Contact your provider
          </Text>

          <Text style={styles.sectionTitle}>Privacy and Control</Text>
          <Text style={styles.body}>
            All information stays securely on your device — no accounts, servers, or ads. You can erase your data any time in Settings.
          </Text>

          <Text style={styles.sectionTitle}>Our Promise</Text>
          <Text style={styles.body}>
            HeartLink is a wellness tool, not a medical device. It supports but does not replace your doctor’s care.
          </Text>

          <Text style={styles.footerQuote}>
            “HeartLink is your heart’s early-warning friend — helping ensure small changes don’t turn into big setbacks.”
          </Text>
        </View>

        {/* ---------- Return Button (unchanged design) ---------- */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Settings")}
          activeOpacity={0.9}
        >
          <Text style={styles.backButtonText}>Back to Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

/* ---------- Styles (unaltered content) ---------- */
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingTop: 50,
    paddingBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: "100%",
  },
  sectionTitle: { ...theme.typography.h2, color: "#0E2E4F", marginTop: 14 },
  body: { ...theme.typography.body, color: "#1E1E1E", marginBottom: 14 },
  bullet: { ...theme.typography.body, color: "#1E1E1E", marginBottom: 14 },
  footerQuote: {
    ...theme.typography.small,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: theme.spacing.lg,
  },
  backButton: {
    backgroundColor: "#0E2E4F",
    borderRadius: 44,
    paddingVertical: 18,
    paddingHorizontal: 60,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  backButtonText: { ...theme.typography.h3, color: "#fff", textAlign: "center" },
});
