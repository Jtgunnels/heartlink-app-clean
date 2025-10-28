// HeartLink v4.1-CL — ASE 1.3 (Clinical-Lock)
// Symptom Details Screen — single summary card + return button + scroll reset

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import HeroHeader from "../components/HeroHeader";
import { theme } from "../theme";
import generateReasonSummary from "../utils/generateReasonSummary";

function getShadeFromSSI(ssi) {
  if (ssi < 2) return "#E7F3FA";
  if (ssi < 4) return "#C8E0F0";
  if (ssi < 6) return "#9AC1DA";
  return "#5B93BF";
}

export default function SymptomDetailsScreen() {
  const [summary, setSummary] = useState(null);
  const [shade, setShade] = useState("#E7F3FA");
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const scrollRef = useRef(null); // ✅ for scroll reset

  useEffect(() => {
    if (isFocused) {
      loadDetails();
      // ✅ reset scroll position on re-focus
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: 0, animated: false });
      }
    }
  }, [isFocused]);

  async function loadDetails() {
    try {
      setLoading(true);
      const latestRaw = await AsyncStorage.getItem("latestScore");
      const entryRaw = await AsyncStorage.getItem("checkInHistory");
      const baselineRaw = await AsyncStorage.getItem("baselineSymptoms");

      const latest = latestRaw ? JSON.parse(latestRaw) : {};
      const baseline = baselineRaw ? JSON.parse(baselineRaw) : {};
      const history = entryRaw ? JSON.parse(entryRaw) || [] : [];
      const entry = history[history.length - 1] || {};

      const { summaryParagraph } = generateReasonSummary(entry, latest?.category, {
        baseline,
        prevWeights: history.map((h) => h.weightToday).filter((n) => typeof n === "number"),
      });

      setSummary(summaryParagraph);
      setShade(getShadeFromSSI(latest?.ssi ?? 0));
    } catch (err) {
      console.log("Error loading details:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0E2E4F" />
      </View>
    );
  }

  const handleReturn = () => {
    navigation.navigate("Recommendations");
    // ✅ ensure Recommendations scroll resets to top
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: false });
    }, 150);
  };

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        <HeroHeader title="Symptom Details" subtitle="Review what you reported today." />

        <View style={[styles.card, { backgroundColor: shade }]}>
          <Text style={styles.cardTitle}>Key Findings From Today</Text>
          <Text style={styles.cardText}>
            {summary || "Your reported symptoms were similar to your usual pattern."}
          </Text>

          <TouchableOpacity style={styles.returnButton} activeOpacity={0.9} onPress={handleReturn}>
            <Text style={styles.returnText}>Return to Summary</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          This information reflects your self-reported symptoms and is for awareness only.
        </Text>
      </ScrollView>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFBF7" },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 50,
    paddingBottom: theme.spacing.lg,
  },
  card: {
    width: "92%",
    borderRadius: 22,
    paddingVertical: 36,
    paddingHorizontal: 28,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    alignItems: "center",
  },
  cardTitle: {
    color: "#0E2E4F",
    fontSize: 22, // ✅ increased for older adults
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
  },
  cardText: {
    color: "#0E2E4F",
    fontSize: 18, // ✅ accessible body text
    lineHeight: 28,
    textAlign: "center",
    marginBottom: 28,
  },
  returnButton: {
    backgroundColor: "#F6B78B",
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 44,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  returnText: {
    color: "#0E2E4F",
    fontWeight: "700",
    fontSize: 18, // ✅ improved tap-text size
    textAlign: "center",
  },
  disclaimer: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: theme.spacing.xl,
    fontStyle: "italic",
    lineHeight: 22,
    maxWidth: 360,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
