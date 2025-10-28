// HeartLink v4.1-CL — ASE 1.3 (Clinical-Lock)
// OrientationScreen – Accessibility Upgrade for 55–80 Age Group
// Unified typography with Baseline, Tracker, and Recommendations screens

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../theme";
import HeroHeader from "../components/HeroHeader";

const NAVY = "#0E2E4F";
const APRICOT = "#F6B78B";

export default function OrientationScreen({ onContinue }) {
  const navigation = useNavigation();

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem("seenOrientation", "true");
      if (typeof onContinue === "function") onContinue();
      navigation.replace("BaselineInfo");
    } catch (e) {
      console.log("Error saving orientation state", e);
    }
  };

  return (
    <LinearGradient
      colors={["#f9fbfc", "#b7c9d8"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* ✅ Global unified header */}
        <HeroHeader
          title="Welcome to HeartLink"
          subtitle="HeartLink helps you track your daily heart failure symptoms and weight so you can notice changes early and stay in control of your health."
        />

        <View style={styles.contentCard}>
          <Text style={styles.sectionHeader}>What You’ll Do Each Day</Text>
          <Text style={styles.body}>
            Each day, you’ll spend less than a minute completing a simple
            check-in. You’ll answer quick questions about how you’re feeling and
            record your weight if you have a scale.
          </Text>

          <Text style={styles.sectionHeader}>How HeartLink Helps</Text>
          <Text style={styles.body}>
            Based on your answers, HeartLink shows a daily summary that helps
            you see whether your symptoms are stable or changing. It’s a way to
            stay aware and spot patterns before they become problems.
          </Text>

          <Text style={styles.sectionHeader}>Your Privacy Matters</Text>
          <Text style={styles.body}>
            Everything you record stays securely on your phone. HeartLink does
            not share, sell, or upload your data anywhere.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <Text style={styles.continueText}>Let’s Get Started</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 50,              // ✅ added to align header vertically
    paddingBottom: theme.spacing.lg,
  },

  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: "100%",
    borderColor: "rgba(14,46,79,0.15)",
    borderWidth: 1,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  /* ---------- Typography ---------- */
  sectionHeader: {
    ...theme.typography.h2, // 26 pt
    color: NAVY,
    textAlign: "left",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  body: {
    ...theme.typography.body, // 20 pt
    color: "#1E1E1E",
    lineHeight: 28,
    marginBottom: theme.spacing.md,
  },

  /* ---------- CTA Button ---------- */
  continueButton: {
    backgroundColor: APRICOT,
    borderRadius: 50,
    paddingVertical: 20,
    paddingHorizontal: 70,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  continueText: {
    ...theme.typography.h2, // 26 pt
    color: NAVY,
    textAlign: "center",
    fontWeight: "700",
  },
});
