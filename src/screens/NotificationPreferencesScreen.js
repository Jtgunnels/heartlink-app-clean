// HeartLink v4.1-CL — ASE 1.3 (Clinical-Lock)
// Notification Preferences – Header Alignment + Instant Scroll Reset (matches ProgressScreen)

import React, { useRef, useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";
import HeroHeader from "../components/HeroHeader";

const NAVY = "#0E2E4F";

export default function NotificationPreferencesScreen() {
  const [enabled, setEnabled] = useState(true);
  const navigation = useNavigation();

  // ✅ instant scroll reset
  const scrollRef = useRef(null);
  const isFocused = useIsFocused();
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
        {/* ✅ HeroHeader aligned like ProgressScreen */}
        <HeroHeader
          title="Notification Preferences"
          subtitle="HeartLink can send daily reminders to help you stay consistent with your check-ins."
        />

        {/* ---------- Content ---------- */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.sectionTitle}>Allow Notifications</Text>
            <Switch
              trackColor={{ false: "#ccc", true: NAVY }}
              thumbColor="#fff"
              ios_backgroundColor="#ccc"
              onValueChange={() => setEnabled(!enabled)}
              value={enabled}
            />
          </View>

          <Text style={styles.body}>
            Notifications are local to your device. You can turn them on or off here or in your phone’s settings anytime.
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

/* ---------- Styles (unaltered except alignment consistency) ---------- */
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
    paddingVertical: 26,
    paddingHorizontal: 22,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: { ...theme.typography.h2, color: NAVY },
  body: { ...theme.typography.body, color: "#1E1E1E" },
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
