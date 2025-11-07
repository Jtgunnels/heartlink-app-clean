// src/screens/HomeScreen.js
// HeartLink v4.1-CL — ASE 1.3 (Clinical-Lock)
// Accessibility Upgrade for 55–80 Age Group — Large Type and Comfortable Layout

import React from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme"; // ✅ confirmed valid import path

const { height } = Dimensions.get("window");
const NAVY = "#0E2E4F";
const APRICOT = "#F6B78B";

export default function HomeScreen({ navigation }) {
  return (
    <LinearGradient
      colors={["#f9fbfc", "#b7c9d8"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {/* 🫀 Logo + Tagline */}
        <View style={styles.heroContainer}>
          <Image
            source={require("../../assets/logos/heartlink_full_light.png")} // ✅ confirmed asset path
            style={styles.logo}
          />
          <Text style={styles.subtitle}>Confidence through awareness.</Text>
        </View>

        {/* ✅ Primary CTA */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("SymptomTracker")} // ✅ navigation target verified
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>Start Daily Check-In</Text>
        </TouchableOpacity>

        {/* ℹ️ Secondary Link */}
        <TouchableOpacity
          onPress={() => navigation.navigate("AboutHeartLink")}
          activeOpacity={0.85}
        >
          <Text style={styles.linkText}>Learn About HeartLink</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: height * 0.08,
    paddingHorizontal: 28,
  },

  /* ---------- Hero Section ---------- */
  heroContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: "82%",
    height: undefined,
    aspectRatio: 3.5,
    resizeMode: "contain",
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    ...theme.typography.h3, // 22 pt — readable under logo
    color: NAVY,
    textAlign: "center",
    fontWeight: "600",
    opacity: 0.9,
    lineHeight: 30,
    marginTop: -2,
  },

  /* ---------- Primary CTA ---------- */
  primaryButton: {
    backgroundColor: APRICOT,
    borderRadius: 50,
    paddingVertical: 20,
    paddingHorizontal: 70,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    marginBottom: height * 0.05,
  },
  primaryButtonText: {
    ...theme.typography.h2, // 26 pt — consistent with large buttons
    color: NAVY,
    fontWeight: "700",
    textAlign: "center",
  },

  /* ---------- Secondary Link ---------- */
  linkText: {
    ...theme.typography.body, // 20 pt
    color: NAVY,
    fontWeight: "600",
    textAlign: "center",
    textDecorationLine: "underline",
    opacity: 0.9,
    marginBottom: 8,
  },
});
