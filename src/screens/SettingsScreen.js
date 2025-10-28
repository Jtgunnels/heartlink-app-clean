// HeartLink v4.1-CL — ASE 1.3 (Clinical-Lock)
// SettingsScreen – Apply ProgressScreen header alignment + instant scroll reset

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useIsFocused } from "@react-navigation/native"; // ⬅️ add useIsFocused
import { theme } from "../theme";
import HeroHeader from "../components/HeroHeader";

const NAVY = "#0E2E4F";
const APRICOT = "#F6B78B";

export default function SettingsScreen() {
  const [devMode, setDevMode] = useState(false);
  const navigation = useNavigation();

  // ⬇️ match ProgressScreen: scrollRef + instant reset on focus
  const scrollRef = useRef(null);
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused && scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [isFocused]);

  const handleResetBaseline = () => {
    Alert.alert(
      "Update Baseline Information",
      "This will let you update your saved baseline responses. Would you like to continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Continue",
          onPress: async () => {
            await AsyncStorage.removeItem("baselineSymptoms");
            navigation.navigate("BaselineInfo");
          },
        },
      ]
    );
  };

  const handleClearLatestScore = async () => {
    await AsyncStorage.removeItem("latestScore");
    await AsyncStorage.removeItem("checkInHistory");
    Alert.alert("History Cleared", "Your latest scores and check-ins have been cleared.");
  };

  const handleLongPress = () => setDevMode(true);

  return (
    <LinearGradient
      colors={["#f9fbfc", "#b7c9d8"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      {/* ⬇️ attach ref and use the same contentContainer padding as ProgressScreen */}
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        <HeroHeader
          title="Settings"
          subtitle="Manage your notifications, privacy, and saved information here."
        />

        {/* ---------- Buttons Section ---------- */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.buttonTransparent}
            onPress={() => navigation.navigate("NotificationPreferences")}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonTextTransparent}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonTransparent}
            onPress={() => navigation.navigate("AboutHeartLink")}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonTextTransparent}>About HeartLink</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonTransparent}
            onPress={() => navigation.navigate("PrivacyPolicy")}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonTextTransparent}>Privacy Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={handleResetBaseline}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonTextSecondary}>Update My Baseline Info</Text>
          </TouchableOpacity>
        </View>

        {/* Hidden Developer Mode Trigger */}
        <TouchableOpacity onLongPress={handleLongPress} style={styles.hiddenTrigger}>
          <Text style={styles.hiddenTriggerText}> </Text>
        </TouchableOpacity>

        {devMode && (
          <View style={styles.devSection}>
            <Text style={styles.devTitle}>Developer Options</Text>
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={handleClearLatestScore}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonTextSecondary}>Clear All Saved Data</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.disclaimer}>
          HeartLink stores your data securely on your device. No information is shared or
          transmitted externally.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  gradient: { flex: 1 },

  // ⬇️ match ProgressScreen spacing so headers align identically
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    padding: theme.spacing.lg,
    paddingTop: 50,
    paddingBottom: theme.spacing.lg,
  },

  section: {
    width: "100%",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },

  /* Transparent navy-border buttons */
  buttonTransparent: {
    backgroundColor: "transparent",
    borderColor: NAVY,
    borderWidth: 1.4,
    borderRadius: 44,
    paddingVertical: 18,
    paddingHorizontal: 60,
    marginVertical: 8,
    width: "100%",
  },
  buttonTextTransparent: {
    ...theme.typography.h3,
    color: NAVY,
    textAlign: "center",
    fontWeight: "700",
  },

  /* White background button */
  buttonSecondary: {
    backgroundColor: "#FFFFFF",
    borderColor: NAVY,
    borderWidth: 1.4,
    borderRadius: 44,
    paddingVertical: 18,
    paddingHorizontal: 60,
    marginVertical: 12,
    width: "100%",
  },
  buttonTextSecondary: {
    ...theme.typography.h3,
    color: NAVY,
    textAlign: "center",
    fontWeight: "700",
  },

  hiddenTrigger: { marginTop: 10, marginBottom: 5 },
  hiddenTriggerText: { color: "transparent", fontSize: 12 },

  devSection: {
    backgroundColor: "#E7F6EC",
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 22,
    width: "100%",
    marginBottom: theme.spacing.lg,
  },
  devTitle: {
    ...theme.typography.h3,
    color: NAVY,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },

  disclaimer: {
    ...theme.typography.small,
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 24,
    marginTop: theme.spacing.xl,
    maxWidth: 360,
  },
});
