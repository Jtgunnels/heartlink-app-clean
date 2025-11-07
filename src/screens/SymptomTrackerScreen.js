// ---------------------------------------------------------------------------
// HeartLink v3.9e-FINAL-CL – Daily Symptom Tracker (ASE 1.2 Clinical-Lock)
// Gradient Guide Pages • Conditional Orthopnea • Senior-Friendly UI
// + Surgical updates: scroll reset on mount/step change/guide close
// + Surgical additions (trend blocks for Severe baseline only + required)
// ---------------------------------------------------------------------------

import React, { useState, useMemo, useRef } from "react";
import { addCheckIn } from "../utils/addCheckin";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";
import calculateScore from "../utils/calculateScore";
import HeroHeader from "../components/HeroHeader";

const NAVY = "#0E2E4F";
const APRICOT = "#F6B78B";

export default function SymptomTrackerScreen({ navigation }) {
  // ---------------- State ----------------
  const [sob, setSob] = useState(null);
  const [edema, setEdema] = useState(null);
  const [fatigue, setFatigue] = useState(null);
  const [orthopnea, setOrthopnea] = useState(null);
  const [lowUrine, setLowUrine] = useState(null);     // kept (not shown anymore, surgical)
  const [appetiteLoss, setAppetiteLoss] = useState(null); // kept (not shown anymore, surgical)
  const [heartRate, setHeartRate] = useState("");
  const [sbp, setSbp] = useState("");
  const [dbp, setDbp] = useState("");                 // ✅ added diastolic input state
  const [weight, setWeight] = useState("");
  const [baseline, setBaseline] = useState({});
  const [step, setStep] = useState(0);
  const [guide, setGuide] = useState(null);
  const [activeField, setActiveField] = useState(null);
  const scrollRef = useRef();

  // 🆕 Trend state (lowercased before save to match algorithm expectations)
  const [sobTrend, setSobTrend] = useState(null);         // "Better" | "Same" | "Worse"
  const [edemaTrend, setEdemaTrend] = useState(null);
  const [fatigueTrend, setFatigueTrend] = useState(null);

  // Load baseline + ensure top-of-screen on mount
  React.useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("baselineSymptoms");
        if (stored) setBaseline(JSON.parse(stored));
      } catch (e) {
        console.log("Baseline load error:", e);
      }
    })();

    // ✅ scroll reset on mount
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 50);
  }, []);

  // ---------- Logic ----------
  const orthopneaPertinent =
    baseline?.orthopnea === false && (sob === "Moderate" || sob === "Severe");

  // Normalize baseline levels for Severe checks (handles schema variants)
  const baseSOB = baseline?.baselineSob ?? baseline?.sobLevel ?? baseline?.sob ?? null;
  const baseEdema = baseline?.baselineEdema ?? baseline?.edemaLevel ?? baseline?.edema ?? null;
  const baseFatigue = baseline?.baselineFatigue ?? baseline?.fatigueLevel ?? baseline?.fatigue ?? null;

  const steps = useMemo(() => {
    // 🛠️ Surgical change: remove standalone ORTHO step (orthopnea asked inline under SOB only)
    return ["SOB", "EDEMA", "FATIGUE", "OPTIONAL"];
  }, [orthopneaPertinent]);

  const totalSteps = steps.length;
  const currentStepId = steps[step];
  const progressText = `Step ${step + 1} of ${totalSteps}`;

  // ---------- Submit ----------
async function handleSubmit() {
  try {
    const entry = {
      sobLevel: sob,
      edemaLevel: edema,
      fatigueLevel: fatigue,
      orthopnea: orthopnea === "Yes",
      sobTrend: sobTrend ? sobTrend.toLowerCase() : null,
      edemaTrend: edemaTrend ? edemaTrend.toLowerCase() : null,
      fatigueTrend: fatigueTrend ? fatigueTrend.toLowerCase() : null,
      weight: weight ? parseFloat(weight) : null,          // legacy/readability
      weightToday: weight ? parseFloat(weight) : null,   
      heartRate: heartRate ? Number(heartRate) : null,
      sbp: sbp ? Number(sbp) : null,
      dbp: dbp ? Number(dbp) : null,
      lowUrine: lowUrine === "Yes",
      appetiteLoss: appetiteLoss === "Yes",
      date: new Date().toISOString(),
    };

    // Save locally (keep your existing history logic)
    const stored = await AsyncStorage.getItem("checkInHistory");
    const history = stored ? JSON.parse(stored) : [];

    const calcInput = {
      sob: entry.sobLevel,
      edema: entry.edemaLevel,
      fatigue: entry.fatigueLevel,
      orthopnea: entry.orthopnea,
      sobTrend: entry.sobTrend,
      edemaTrend: entry.edemaTrend,
      fatigueTrend: entry.fatigueTrend,
      heartRate: entry.heartRate,
      sbp: entry.sbp,
      dbp: entry.dbp,
      weightToday: entry.weight,
      weight: entry.weight,
    };

    const calcBaseline = {
      sob: baseline.baselineSob ?? baseline.sobLevel ?? baseline.sob ?? null,
      edema: baseline.baselineEdema ?? baseline.edemaLevel ?? baseline.edema ?? null,
      fatigue: baseline.baselineFatigue ?? baseline.fatigueLevel ?? baseline.fatigue ?? null,
      orthopnea: typeof baseline.orthopnea === "boolean" ? baseline.orthopnea : false,
      baselineWeight: baseline.baselineWeight,
    };

    const score = calculateScore(calcInput, calcBaseline, {
      categories: history.map((h) => h.category),
      wsSeries: history.map((h) => h.weightedSymptoms ?? 0),
      normalizedScores: history.map((h) => h.normalized ?? 0),
    });

    const newEntry = { ...entry, ...score };
    history.push(newEntry);
    await AsyncStorage.setItem("checkInHistory", JSON.stringify(history));
    await AsyncStorage.setItem("latestScore", JSON.stringify(score));

    // 🆕 Firestore sync  -------------------------------------------
    const patientId = "PAT001"; // later replace with Auth or real ID
    await addCheckIn(patientId, newEntry);
    // --------------------------------------------------------------

    Alert.alert("Check-In Submitted", "Your daily check-in was saved successfully.");
    navigation.navigate("Recommendations", { score });
  } catch (e) {
    console.log("Save error:", e);
    Alert.alert("Error", "Unable to save your check-in.");
  }
}
  const handleNext = () => {
    // Required fields on SOB/EDEMA/FATIGUE
    const requiredStep = steps[step];
    if (requiredStep === "SOB" && !sob) {
      Alert.alert("Incomplete", "Please answer how your breathing is today before continuing.");
      return;
    }
    if (requiredStep === "EDEMA" && !edema) {
      Alert.alert("Incomplete", "Please answer if you’ve noticed swelling before continuing.");
      return;
    }
    if (requiredStep === "FATIGUE" && !fatigue) {
      Alert.alert("Incomplete", "Please answer how your energy level is today before continuing.");
      return;
    }

    // 🆕 Required trend validations (only if that symptom's baseline = Severe)
    if (requiredStep === "SOB" && baseSOB === "Severe" && !sobTrend) {
      Alert.alert(
        "Incomplete",
        "Please indicate whether your breathing is better, same, or worse compared with your baseline."
      );
      return;
    }
    if (requiredStep === "EDEMA" && baseEdema === "Severe" && !edemaTrend) {
      Alert.alert(
        "Incomplete",
        "Please indicate whether your swelling is better, same, or worse compared with your baseline."
      );
      return;
    }
    if (requiredStep === "FATIGUE" && baseFatigue === "Severe" && !fatigueTrend) {
      Alert.alert(
        "Incomplete",
        "Please indicate whether your energy level is better, same, or worse compared with your baseline."
      );
      return;
    }

    // ✅ scroll reset when changing steps
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 10);

    if (step < totalSteps - 1) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () =>
    step > 0
      ? (setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 10), setStep(step - 1))
      : navigation.goBack();

  // ---------- Shared UI ----------
  const renderYesNo = (label, value, setter) => (
    <View style={styles.questionBlock}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.pillGroup}>
        {["Yes", "No"].map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.pillButton, value === opt && styles.pillSelected]}
            onPress={() => setter(opt)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, value === opt && styles.pillTextSelected]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderOptionButtons = (value, setter, options) => (
    <View style={styles.card}>
      {options.map((opt) => {
        const sel = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.optionRow, sel && styles.optionRowSel]}
            onPress={() => setter(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.optionTitle]}>{opt.value}</Text>
            <Text style={styles.optionDesc}>{opt.example}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // 🆕 Uniform trend selector using your existing pill styling
  const renderTrendSelector = (label, value, setter) => (
    <View style={styles.questionBlock}>
      <Text style={styles.label}>Compared with your baseline, is your {label}:</Text>
      <View style={styles.pillGroup}>
        {["Better", "Same", "Worse"].map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.pillButton, value === opt && styles.pillSelected]}
            onPress={() => setter(opt)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, value === opt && styles.pillTextSelected]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ---------- Guide Overlay (Full Page, Table Style) ----------
  const renderGuide = () => {
    if (!guide) return null;

    const guides = {
      SOB: {
        title: "Breathing Level Guide",
        rows: [
          ["None", "You do not feel short of breath with any activity, including brisk walking or daily tasks."],
          ["Mild", "You only notice shortness of breath with more strenuous activities like walking up stairs or heavy lifting."],
          ["Moderate", "You feel shortness of breath with less than normal activities, including walking at a normal pace, showering, or doing light housework."],
          ["Severe", "You feel short of breath even while resting. Any movement, or sometimes just talking, can make it worse. You may need help with basic tasks."],
        ],
      },
      EDEMA: {
        title: "Swelling Level Guide",
        rows: [
          ["None", "Your legs and feet look normal."],
          ["Mild", "You may notice a little swelling but this quickly resolved with rest or elevation."],
          ["Moderate", "Swelling becomes more noticeable and extends higher up the legs. You might see a clear imprint if you press on the swollen area."],
          ["Severe", "Swelling is present all the time and can be present up to the thighs and event the abdomen. The swelling makes it hard to put on shoes or socks. Pressing the area with your finger will leave a deep imprint."],
        ],
      },
      FATIGUE: {
        title: "Energy Level Guide",
        rows: [
          ["None", "Normal energy for your usual activities."],
          ["Mild", "You feel a little more tired than usual, but still can do all your regular activities. You may need to take short breaks or rest more often."],
          ["Moderate", "You feel tired much of the time. You feel drained after doing daily activities like walking, shopping, or doing housework."],
          ["Severe", "You feel exhausted most or all of the time, even when resting. You may struggle to get out of bed, dress, or take care of yourself."],
        ],
      },
    };

    const { title, rows } = guides[guide];

    return (
      <View style={styles.overlayWrapper}>
        <LinearGradient
          colors={["#ffffff", "#e6edf2"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.overlayBackground}
        />
        <ScrollView contentContainerStyle={styles.overlayScroll}>
          <View style={styles.overlayContent}>
            <Text style={styles.overlayTitle}>{title}</Text>

            <View style={styles.tableWrapper}>
              {rows.map(([label, desc], i) => (
                <View
                  key={label}
                  style={[
                    styles.tableRow,
                    i % 2 === 1 && { backgroundColor: "#F9FBFC" },
                  ]}
                >
                  <Text style={styles.tableLevel}>{label}</Text>
                  <Text style={styles.tableDesc}>{desc}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => {
                setGuide(null);
                // ✅ scroll reset when leaving guide
                setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 10);
              }}
            >
              <Text style={styles.overlayButtonText}>Return to Check-In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // ---------- Steps ----------
  const renderStep = () => {
    switch (currentStepId) {
      case "SOB":
        return (
          <>
            <Text style={styles.progress}>{progressText}</Text>
            <Text style={styles.header}>How is your breathing today?</Text>
            {renderOptionButtons(sob, setSob, [
              { value: "None", example: "You breathe comfortably during normal activity." },
              { value: "Mild", example: "Shortness of breath with brisk walking or climbing stairs." },
              { value: "Moderate", example: "You get short of breath with light activity like walking, showering, or light chores." },
              { value: "Severe", example: "You feel short of breath while resting, sitting or talking." },
            ])}
            <TouchableOpacity style={styles.guideButton} onPress={() => setGuide("SOB")}>
              <Text style={styles.guideButtonText}>Tap here to see what each level means</Text>
            </TouchableOpacity>

            {baseline?.orthopnea === false && (sob === "Moderate" || sob === "Severe") && (
              <View style={styles.questionBlock}>
                <Text style={styles.label}>Are you having trouble lying flat to sleep?</Text>
                <View style={styles.pillGroup}>
                  {["Yes", "No"].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pillButton, orthopnea === opt && styles.pillSelected]}
                      onPress={() => setOrthopnea(opt)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, orthopnea === opt && styles.pillTextSelected]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Trend block — only if baseline SOB is Severe */}
            {baseSOB === "Severe" &&
              renderTrendSelector("breathing", sobTrend, setSobTrend)}
          </>
        );

      // 🗑️ Surgical removal of the standalone ORTHO step
      // (case "ORTHO": ... ) was removed intentionally to prevent duplicate page.

      case "EDEMA":
        return (
          <>
            <Text style={styles.progress}>{progressText}</Text>
            <Text style={styles.header}>Have you noticed swelling in your feet or legs today?</Text>
            {renderOptionButtons(edema, setEdema, [
              { value: "None", example: "Legs and feet look normal without visible swelling." },
              { value: "Mild", example: "A little swelling that goes away with rest and elevation." },
              { value: "Moderate", example: "Noticeable swelling that moves higher up the legs and leaves an imprint when pressed." },
              { value: "Severe", example: "Constant swelling even up to the thighs or abdomen; deep imprint remains after pressure." },
            ])}
            <TouchableOpacity style={styles.guideButton} onPress={() => setGuide("EDEMA")}>
              <Text style={styles.guideButtonText}>Tap here to see what each level means</Text>
            </TouchableOpacity>

            {/* Trend block — only if baseline Edema is Severe */}
            {baseEdema === "Severe" &&
              renderTrendSelector("swelling", edemaTrend, setEdemaTrend)}
          </>
        );

      case "FATIGUE":
        return (
          <>
            <Text style={styles.progress}>{progressText}</Text>
            <Text style={styles.header}>How is your energy level today?</Text>
            {renderOptionButtons(fatigue, setFatigue, [
              { value: "None", example: "Normal energy for your day." },
              { value: "Mild", example: "Less than normal energy but able to perform daily activities." },
              { value: "Moderate", example: "You feel drained after daily activities like walking, shopping, or doing chores." },
              { value: "Severe", example: "Exhausted most of the day, even at rest." },
            ])}
            <TouchableOpacity style={styles.guideButton} onPress={() => setGuide("FATIGUE")}>
              <Text style={styles.guideButtonText}>Tap here to see what each level means</Text>
            </TouchableOpacity>

            {/* Trend block — only if baseline Fatigue is Severe */}
            {baseFatigue === "Severe" &&
              renderTrendSelector("energy level", fatigueTrend, setFatigueTrend)}
          </>
        );

      case "OPTIONAL":
        return (
          <>
            <Text style={styles.progress}>{progressText}</Text>
            <Text style={styles.header}>Optional: Other Observations</Text>

            {/* ✅ Removed the first two questions as requested */}

            <Text style={styles.subHeader}>Optional: Record your vitals</Text>

            <View style={styles.vitalsGroup}>
              {/* Heart Rate */}
              <View style={styles.inputBlock}>
                <Text style={styles.label}>Resting Heart Rate</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={heartRate}
                  placeholder="e.g. 72"
                  onChangeText={setHeartRate}
                  onFocus={() => setActiveField("heartRate")}
                  onBlur={() => setActiveField(null)}
                />
              </View>

              {/* ✅ Complete Blood Pressure (Systolic/Diastolic) */}
              <View style={styles.inputBlock}>
                <Text style={styles.label}>Blood Pressure (Top / Bottom)</Text>
                <View style={styles.bpRow}>
                  <TextInput
                    style={[styles.input, styles.bpInput]}
                    keyboardType="number-pad"
                    value={sbp}
                    placeholder="Systolic"
                    onChangeText={setSbp}
                    onFocus={() => setActiveField("sbp")}
                    onBlur={() => setActiveField(null)}
                  />
                  <Text style={styles.bpSeparator}>/</Text>
                  <TextInput
                    style={[styles.input, styles.bpInput]}
                    keyboardType="number-pad"
                    value={dbp}
                    placeholder="Diastolic"
                    onChangeText={setDbp}
                    onFocus={() => setActiveField("dbp")}
                    onBlur={() => setActiveField(null)}
                  />
                </View>
              </View>

              {/* Weight */}
              <View style={styles.inputBlock}>
                <Text style={styles.label}>Current Weight (lbs)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={weight}
                  placeholder="e.g. 162.5"
                  onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ""))}
                  onFocus={() => setActiveField("weight")}
                  onBlur={() => setActiveField(null)}
                />
              </View>
            </View>

            {/* Floating Done bar (unified, cross-platform) */}
            {activeField && (
              <View style={styles.doneBarOverlay}>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    setActiveField(null);
                  }}
                >
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        );

      default:
        return null;
    }
  }; // <-- closes renderStep()

  // ---------- Navigation ----------
  const renderNav = () => (
    <View style={styles.navRow}>
      {step > 0 ? (
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonBack]}
          onPress={handleBack}
        >
          <Text style={styles.navButtonText}>Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 110 }} />
      )}

      <TouchableOpacity
        style={[
          styles.navButton,
          step === totalSteps - 1 ? styles.navButtonSubmit : styles.navButtonNext,
        ]}
        onPress={handleNext}
      >
        <Text
          style={[
            styles.navButtonText,
            { color: step === totalSteps - 1 ? NAVY : "#FFFFFF" },
          ]}
        >
          {step === totalSteps - 1 ? "Submit" : "Next"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ---------- Component Return ----------
  return (
    <LinearGradient colors={["#f9fbfc", "#b7c9d8"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContainer}
            style={{ flex: 1 }}
          >
            {/* ✅ unified header */}
            <HeroHeader
              title="Daily Check-In"
              subtitle="Track your heart symptoms and weight to notice early changes."
            />

            {/* ✅ your existing steps and navigation */}
            <View style={{ width: "100%", marginTop: 6 }}>
              {renderStep()}
              {renderNav()}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {renderGuide()}
    </LinearGradient>
  );
} // <-- closes function SymptomTrackerScreen

// ---------------------------- Styles ----------------------------
const styles = StyleSheet.create({
  // --- Progress & Headers ---
  progress: { textAlign: "center", color: NAVY, fontSize: 16, marginBottom: 8, fontWeight: "600" },
  header: { textAlign: "center", color: NAVY, fontSize: 22, fontWeight: "700", marginBottom: 12 },
  subHeader: { textAlign: "center", color: theme.colors.textSecondary, fontSize: 17, marginBottom: 8 },

  // --- Category Cards (uniform across steps 1–3) ---
  card: { backgroundColor: "#FFFFFF", borderRadius: 14, paddingVertical: 6, paddingHorizontal: 10, marginVertical: 6 },
  optionRow: { borderWidth: 1, borderColor: "#D6D9DC", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 6, backgroundColor: "#FFFFFF" },
  optionRowSel: { borderColor: NAVY, backgroundColor: "#F0F6FB" },
  optionTitle: { fontSize: 16, fontWeight: "700", color: NAVY, marginBottom: 2 },
  optionDesc: { fontSize: 14, color: "#444", lineHeight: 19 },

  // --- Yes/No blocks ---
  questionBlock: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginTop: 10, borderColor: "#E0E4EA", borderWidth: 1 },
  label: { color: NAVY, fontSize: 17, fontWeight: "700", marginBottom: 6 },
  pillGroup: { flexDirection: "row", gap: 12, justifyContent: "center" },
  pillButton: { borderWidth: 1, borderColor: NAVY, borderRadius: 25, paddingVertical: 8, paddingHorizontal: 24 },
  pillSelected: { backgroundColor: NAVY },
  pillText: { color: NAVY, fontWeight: "600", fontSize: 16 },
  pillTextSelected: { color: "#fff", fontWeight: "700" },

  // --- Vitals (vertical layout) ---
  vitalsGroup: { marginTop: 10, gap: 14 },
  inputBlock: { flex: 1 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "#FFFFFF", width: "100%" },

  // ✅ New compact BP row (surgical addition)
  bpRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  bpInput: { flex: 1, textAlign: "center" },
  bpSeparator: { fontSize: 18, fontWeight: "700", color: NAVY },

  // --- Floating Done bar (cross-platform) ---
  doneBarOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#EEF2F7",
    borderTopWidth: 1,
    borderTopColor: "#D9E1EC",
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "flex-end",
    zIndex: 200,
    elevation: 8,
  },
  doneButton: { backgroundColor: NAVY, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 22 },
  doneText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // --- Scroll Container (keep header low like original) ---
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 0,           // keep header position identical to your original
    paddingBottom: 120,
  },

  // --- Navigation Buttons ---
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  navButton: {
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 36,
    elevation: 3,
  },
  navButtonBack: { backgroundColor: NAVY },
  navButtonNext: { backgroundColor: APRICOT },
  navButtonSubmit: { backgroundColor: APRICOT },
  navButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 18, textAlign: "center" },

  // --- Guide Link ---
  guideButton: { alignItems: "center", marginTop: 10, marginBottom: 6 },
  guideButtonText: { color: NAVY, fontSize: 18, fontWeight: "700", textDecorationLine: "underline" },

  // --- Full-Screen Guide Overlay (table style) ---
  overlayWrapper: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF", zIndex: 50 },
  overlayBackground: { ...StyleSheet.absoluteFillObject },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-start", paddingBottom: 120 },
  overlayContent: { paddingHorizontal: 28, paddingTop: 50 },
  overlayTitle: { fontSize: 24, fontWeight: "800", color: NAVY, textAlign: "center", marginBottom: 28 },
  tableWrapper: { borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  tableRow: { paddingVertical: 14, paddingHorizontal: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E0E4EA" },
  tableLevel: { fontSize: 18, fontWeight: "700", color: NAVY, marginBottom: 4 },
  tableDesc: { fontSize: 16, color: "#2B2B2B", lineHeight: 23 },
  overlayButton: { marginTop: 32, backgroundColor: NAVY, borderRadius: 50, alignSelf: "center", paddingVertical: 18, paddingHorizontal: 44 },
  overlayButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", textAlign: "center" },
});
