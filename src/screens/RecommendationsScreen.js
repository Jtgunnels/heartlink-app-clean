// ---------------------------------------------------------------------------
// HeartLink v4.1-CL (ASE 1.3 Clinical-Lock)
// RecommendationsScreen.js – Logo-aligned header + scroll reset
// © 2025 HeartLink Health LLC
// Surgical update: Removed secondary contextual summary card that duplicated
// information already present in SymptomDetailsScreen.
// ---------------------------------------------------------------------------

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
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import HeroHeader from "../components/HeroHeader";
import DebugPanel from "../components/DebugPanel";
import { theme } from "../theme";
import generateReasonSummary from "../utils/generateReasonSummary";

/* ---------- Shade logic (white → navy scale) ---------- */
function getShadeFromSSI(ssi) {
  if (ssi < 2) return "#E7F3FA";
  if (ssi < 4) return "#C8E0F0";
  if (ssi < 6) return "#9AC1DA";
  return "#5B93BF";
}

/* ---------- Card text ---------- */
function getCardText(ssi) {
  if (ssi < 2)
    return {
      title: "Everything looks steady today.",
      message:
        "Your check-in lines up with your usual pattern. Keep following your normal daily habits and stay mindful of how you feel.",
    };
  if (ssi < 4)
    return {
      title: "A small change worth noticing.",
      message:
        "A few readings look a bit different than normal. Keep following your usual schedule and watch whether things return toward your baseline.",
    };
  if (ssi < 6)
    return {
      title: "Noticeable change from your baseline.",
      message:
        "There’s a clear difference in your check-in compared to your baseline. Be cautious over the next 24–48 hours — track your breathing, swelling, and energy closely and see whether things begin to settle back toward normal.",
    };
  return {
    title: "Significant difference from your baseline.",
    message:
      "Your check-in shows a strong, ongoing change from your usual pattern. Pay close attention to your breathing, swelling, and weight during the next 12–24 hours and record what you notice.",
  };
}

/* ---------- Main component ---------- */
export default function RecommendationsScreen() {
  const [status, setStatus] = useState(null);
  const [entry, setEntry] = useState(null);
  const [baseline, setBaseline] = useState({});
  const [prevWeights, setPrevWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isFocused) {
      loadResults();
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: 0, animated: false });
      }
    }
  }, [isFocused]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const latestRaw = await AsyncStorage.getItem("latestScore");
      const baselineRaw = await AsyncStorage.getItem("baselineSymptoms");
      const historyRaw = await AsyncStorage.getItem("checkInHistory");

      if (latestRaw) setStatus(JSON.parse(latestRaw));
      if (baselineRaw) setBaseline(JSON.parse(baselineRaw));

      if (historyRaw) {
        const history = JSON.parse(historyRaw) || [];
        const last = history.at(-1) || null;
        const weights = history
          .slice(-5)
          .map((h) => h.weightToday)
          .filter((n) => typeof n === "number");
        setEntry(last);
        setPrevWeights(weights);
      }
    } catch (e) {
      console.log("Error loading results:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0E2E4F" />
      </View>
    );

  const ssi = status?.ssi ?? 0;
  const { title, message } = getCardText(ssi);
  const shade = getShadeFromSSI(ssi);
  const { summaryParagraph } = generateReasonSummary(entry || {}, status?.category || "N/A", {
    baseline,
    prevWeights,
  });

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        {/* ---------- Header ---------- */}
        <HeroHeader
          title="Your Daily Summary"
          subtitle="How today’s check-in compares with your usual pattern."
        />

        {/* ---------- Primary Summary Card ---------- */}
        <View style={[styles.card, { backgroundColor: shade }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => navigation.navigate("SymptomDetails")}
            activeOpacity={0.9}
          >
            <Text style={styles.detailsText}>View More Details</Text>
          </TouchableOpacity>
        </View>

        {/* ---------- Gradient Legend ---------- */}
        <View style={styles.legendContainer}>
          <LinearGradient
            colors={["#E7F3FA", "#C8E0F0", "#9AC1DA", "#5B93BF"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.legendBar}
          />
          <View style={styles.legendLabels}>
            <Text style={styles.legendLabelLeft}>Near baseline</Text>
            <Text style={styles.legendLabelRight}>More change from usual</Text>
          </View>
        </View>

        {/* ❌ Removed contextual summary card to avoid duplication with SymptomDetailsScreen */}

        {/* ---------- Disclaimer ---------- */}
        <Text style={styles.disclaimer}>
          This information is for personal awareness and wellness tracking only. It is not a
          medical evaluation or advice.
        </Text>

        <DebugPanel />
      </ScrollView>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBF7",
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 50,
    paddingBottom: theme.spacing.lg,
  },
  card: {
    borderRadius: 22,
    paddingVertical: 36,
    paddingHorizontal: 26,
    width: "92%",
    minHeight: 240,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    ...theme.typography.h2,
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    ...theme.typography.body,
    textAlign: "center",
    opacity: 0.95,
    marginBottom: 22,
  },
  detailsButton: {
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
  detailsText: {
    ...theme.typography.h3,
    color: "#0E2E4F",
    fontWeight: "700",
    textAlign: "center",
  },
  legendContainer: {
    width: "90%",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 8,
  },
  legendBar: {
    height: 12,
    width: "100%",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  legendLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 6,
    marginTop: 8,
  },
  legendLabelLeft: {
    fontSize: 15,
    color: "#1A3452",
    fontWeight: "500",
  },
  legendLabelRight: {
    fontSize: 15,
    color: "#1A3452",
    fontWeight: "500",
    textAlign: "right",
  },
  disclaimer: {
    ...theme.typography.small,
    fontSize: 15,
    textAlign: "center",
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xl,
    fontStyle: "italic",
    lineHeight: 22,
    maxWidth: 360,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
