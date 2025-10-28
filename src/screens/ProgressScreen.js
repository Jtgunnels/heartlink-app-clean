// HeartLink v4.3-CL — ASE 1.3 (Clinical-Lock)
// ProgressScreen – Accessibility Upgrade (55–80 Age Group) + Scroll Reset + Return Button

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LineChart } from "react-native-chart-kit";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { theme } from "../theme";
import HeroHeader from "../components/HeroHeader";

export default function ProgressScreen() {
  const [scores, setScores] = useState([]);
  const [weights, setWeights] = useState([]);
  const [labels, setLabels] = useState([]);
  const [filter, setFilter] = useState("30D");
  const scrollRef = useRef(null);
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  useEffect(() => {
    if (isFocused) {
      loadHistory();
      // ✅ reset scroll position
      if (scrollRef.current) scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [isFocused]);

  async function loadHistory() {
    try {
      const historyRaw = await AsyncStorage.getItem("checkInHistory");
      if (!historyRaw) return;
      const history = JSON.parse(historyRaw);
      const valid = history.filter(
        (h) =>
          Number.isFinite(parseFloat(h.score)) &&
          Number.isFinite(parseFloat(h.weightToday ?? h.weight))
      );
      if (valid.length === 0) {
        setScores([]); setWeights([]); setLabels([]); return;
      }
      const s = valid.map((h) => parseFloat(h.score));
      const w = valid.map((h) => parseFloat(h.weightToday ?? h.weight));
      const d = valid.map((h, i) =>
        i % Math.ceil(valid.length / 5) === 0
          ? new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : ""
      );
      setScores(s); setWeights(w); setLabels(d);
    } catch (e) { console.log("Error loading chart data", e); }
  }

  const hasValidData =
    scores.length > 0 && weights.length > 0 &&
    !scores.some(isNaN) && !weights.some(isNaN);

  function filterData() {
    let range = filter === "7D" ? 7 : filter === "30D" ? 30 : scores.length;
    const start = Math.max(scores.length - range, 0);
    return {
      scores: scores.slice(start),
      weights: weights.slice(start),
      labels: labels.slice(start),
    };
  }

  const { scores: fScores, weights: fWeights, labels: fLabels } = filterData();
  const chartWidth = Dimensions.get("window").width - 80;
  const chartHeight = 260;

  const handleReturn = () => {
    navigation.navigate("Recommendations");
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 150);
  };

  return (
    <LinearGradient
      colors={["#f9fbfc", "#b7c9d8"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
        <HeroHeader
          title="Your Progress"
          subtitle="These charts show how your symptoms and weight have changed over time."
        />

        {/* ---------- Filter Buttons ---------- */}
        <View style={styles.filterRow}>
          {["7D", "30D", "ALL"].map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.filterButton, filter === opt && styles.filterButtonActive]}
              onPress={() => setFilter(opt)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.filterText, filter === opt && styles.filterTextActive]}
              >
                {opt === "7D" ? "7 Days" : opt === "30D" ? "30 Days" : "All Time"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ---------- Charts ---------- */}
        {hasValidData ? (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.subHeader}>Symptom Pattern Over Time</Text>
              <LineChart
                data={{ labels: fLabels.length > 0 ? fLabels : ["", "", "", "", ""],
                        datasets: [{ data: fScores }] }}
                width={chartWidth}
                height={chartHeight}
                fromZero
                withVerticalLabels
                chartConfig={{
                  backgroundGradientFrom: "#FFF",
                  backgroundGradientTo: "#FFF",
                  color: (o=1)=>`rgba(14,46,79,${o})`,
                  labelColor: (o=1)=>`rgba(14,46,79,${o})`,
                  decimalPlaces: 0,
                  propsForDots:{ r:"3.5", strokeWidth:"1.5", stroke:"#0E2E4F", fill:"#0E2E4F" },
                  propsForLabels:{ fontSize:15, fontWeight:"600" },
                  propsForBackgroundLines:{ strokeWidth:0 },
                }}
                bezier
                style={styles.chart}
              />
              <Text style={styles.chartNote}>
                This line reflects your daily symptom pattern. Higher points indicate
                more reported symptoms than your usual pattern.
              </Text>
            </View>

            <View style={styles.chartDivider} />

            <View style={styles.chartCard}>
              <Text style={styles.subHeader}>Weight Trend</Text>
              <LineChart
                data={{ labels: fLabels, datasets: [{ data: fWeights }] }}
                width={chartWidth}
                height={chartHeight}
                yAxisSuffix=" lbs"
                chartConfig={{
                  backgroundGradientFrom: "#FFF",
                  backgroundGradientTo: "#FFF",
                  decimalPlaces: 1,
                  color: (o=1)=>`rgba(14,46,79,${o})`,
                  labelColor: (o=1)=>`rgba(14,46,79,${o})`,
                  propsForDots:{ r:"3.5", strokeWidth:"1.5", stroke:"#0E2E4F", fill:"#0E2E4F" },
                  propsForBackgroundLines:{ strokeWidth:0 },
                }}
                bezier
                style={styles.chart}
              />
              <Text style={styles.chartNote}>
                This line reflects your weight over time. Gradual increases can signal
                fluid changes, while stable readings show consistency.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.emptyEmoji}>📉</Text>
            <Text style={styles.noDataTitle}>No Check-Ins Yet</Text>
            <Text style={styles.noDataSubtitle}>
              Complete your first daily check-in to start tracking your progress.
            </Text>
          </View>
        )}

        {/* ---------- Return Button ---------- */}
        <TouchableOpacity style={styles.returnButton} onPress={handleReturn} activeOpacity={0.9}>
          <Text style={styles.returnText}>Return to Summary</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          These charts are for self-tracking only and do not replace medical advice.
          Contact your healthcare provider if your symptoms change.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  gradient:{ flex:1 },
  scroll:{ alignItems:"center", padding:theme.spacing.lg, paddingTop:50, paddingBottom:theme.spacing.lg },

  filterRow:{ flexDirection:"row", justifyContent:"center", marginBottom:theme.spacing.md },
  filterButton:{
    borderWidth:1, borderColor:"#0E2E4F", borderRadius:30,
    paddingVertical:10, paddingHorizontal:24, marginHorizontal:6, backgroundColor:"#FFF",
  },
  filterButtonActive:{ backgroundColor:"#0E2E4F" },
  filterText:{ fontSize:18, color:"#0E2E4F", textAlign:"center", fontWeight:"600" },
  filterTextActive:{ color:"#FFF" },

  chartCard:{
    backgroundColor:"#FFF",
    borderRadius:theme.radius.lg,
    paddingVertical:28,
    paddingHorizontal:22,
    marginBottom:theme.spacing.lg,
    borderColor:"rgba(14,46,79,0.15)",
    borderWidth:1,
    width:"95%",
  },
  subHeader:{
    fontSize:22, fontWeight:"700", textAlign:"center", color:"#0E2E4F",
    marginBottom:theme.spacing.sm,
  },
  chart:{ borderRadius:theme.radius.md },
  chartDivider:{
    height:1, backgroundColor:"rgba(14,46,79,0.1)",
    width:"85%", alignSelf:"center", marginVertical:theme.spacing.md,
  },
  chartNote:{
    fontSize:17, color:theme.colors.textSecondary, textAlign:"center",
    marginTop:theme.spacing.xs, lineHeight:24,
  },
  noDataContainer:{ alignItems:"center", justifyContent:"center", marginTop:theme.spacing.xl },
  emptyEmoji:{ fontSize:70, opacity:0.4, marginBottom:theme.spacing.md },
  noDataTitle:{ fontSize:20, fontWeight:"700", color:"#0E2E4F" },
  noDataSubtitle:{
    fontSize:17, color:theme.colors.textSecondary,
    textAlign:"center", width:"80%", marginTop:4, lineHeight:24,
  },
  returnButton:{
    backgroundColor:"#F6B78B", borderRadius:40,
    paddingVertical:14, paddingHorizontal:46,
    marginTop:theme.spacing.md, shadowColor:"#000",
    shadowOpacity:0.1, shadowRadius:5, shadowOffset:{ width:0, height:3 }, elevation:3,
  },
  returnText:{
    color:"#0E2E4F", fontWeight:"700", fontSize:18, textAlign:"center",
  },
  disclaimer:{
    fontSize:15, textAlign:"center", color:theme.colors.textSecondary,
    marginTop:theme.spacing.xl, fontStyle:"italic", lineHeight:22, maxWidth:360,
  },
});
