// HeartLink v4.1-CL — ASE 1.3 (Clinical-Lock)
// Privacy Policy – Header Alignment + Instant Scroll Reset (matches ProgressScreen)

import React, { useRef, useEffect } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";
import HeroHeader from "../components/HeroHeader";

const NAVY = "#0E2E4F";

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const isFocused = useIsFocused();

  // ✅ instant scroll reset on focus (identical logic)
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
        {/* ✅ Header alignment consistent with ProgressScreen */}
        <HeroHeader
          title="Privacy Policy"
          subtitle="Learn how HeartLink keeps your data private and secure on your device."
        />

        {/* ---------- Content ---------- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.body}>
            HeartLink follows strict privacy guidelines to keep your information safe.
    Your personal data stays on your device and under your control. We never
    sell or use your identifiable information for advertising or marketing.
          </Text>

          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.body}>
           No account or login is required. Any data you enter — such as symptoms,
    weights, or vitals — is securely stored on your device for your use only.
    You may export or share your data at any time through app features you
    choose to use.
          </Text>

          <Text style={styles.sectionTitle}>Anonymous Data Sharing</Text>
          <Text style={styles.body}>
           To help improve care coordination, HeartLink may share anonymous, aggregated
    data trends with partnered home health and clinical organizations through
    the HeartLink Provider Portal. These shared insights never include names,
    contact information, or any data that could identify you personally.
    Information is de-identified and used only to support quality improvement,
    clinical research, or service optimization.
          </Text>

          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.body}>
           You remain in full control of your data. You can delete all information
    stored by HeartLink at any time in Settings or by uninstalling the app.
    Deleting the app permanently removes your local data.
          </Text>

           <Text style={styles.sectionTitle}>Transparency</Text>
  <Text style={styles.body}>
    HeartLink uses no advertising, behavioral tracking, or analytics that
    identify users. Any shared data is stripped of identifiers and cannot be
    linked back to you.
  </Text>

          <Text style={styles.footer}>
            © {new Date().getFullYear()} HeartLink. All rights reserved.
          </Text>
        </View>

        {/* ---------- Return Button ---------- */}
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

/* ---------- Styles (unchanged content) ---------- */
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingTop: 50, // ✅ header alignment standard
    paddingBottom: theme.spacing.lg,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 24,
    width: "100%",
  },
  sectionTitle: { ...theme.typography.h2, color: NAVY, marginTop: 10 },
  body: { ...theme.typography.body, color: "#1E1E1E", marginBottom: 12 },
  footer: {
    ...theme.typography.small,
    textAlign: "center",
    color: "#666",
    marginTop: theme.spacing.lg,
    fontStyle: "italic",
  },
  backButton: {
    backgroundColor: NAVY,
    borderRadius: 44,
    paddingVertical: 18,
    paddingHorizontal: 60,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  backButtonText: { ...theme.typography.h3, color: "#fff", textAlign: "center" },
});
