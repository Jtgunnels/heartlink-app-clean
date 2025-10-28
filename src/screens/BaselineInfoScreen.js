// ---------------------------------------------------------------------------
// HeartLink v4.1-CL — ASE 1.3 (Clinical-Lock)
// BaselineInfoScreen – Accessibility Upgrade + Guide Overlay Integration
// Surgical merge: SymptomTrackerScreen guide links + overlay added
// ---------------------------------------------------------------------------

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import { theme } from "../theme";
import HeroHeader from "../components/HeroHeader";

const NAVY = "#0E2E4F";
const APRICOT = "#F6B78B";

export default function BaselineInfoScreen({ navigation, onBaselineComplete }) {
  const [step, setStep] = useState(0);
  const [sob, setSob] = useState(null);
  const [edema, setEdema] = useState(null);
  const [fatigue, setFatigue] = useState(null);
  const [orthopnea, setOrthopnea] = useState(null);
  const [weight, setWeight] = useState("");
  const [guide, setGuide] = useState(null);
  const scrollRef = useRef();

  useEffect(() => {
    (async () => {
      const existing = await AsyncStorage.getItem("baselineSymptoms");
      if (existing) console.log("Baseline already exists");
    })();
  }, []);
   useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 50);
  }, [step]);

  const handleNext = () => {
    if (step === 0 && !sob)
      return Alert.alert("Required", "Please select your baseline breathing level.");
    if (step === 1 && !edema)
      return Alert.alert("Required", "Please select your baseline swelling level.");
    if (step === 2 && !fatigue)
      return Alert.alert("Required", "Please select your baseline fatigue level.");
    if (step === 3 && !orthopnea)
      return Alert.alert("Required", "Please answer the lying flat question.");
    if (step === 4) {
      if (!weight)
        return Alert.alert("Required", "Please select your usual baseline weight.");
      return handleSave();
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSave = async () => {
    try {
      const baselineData = {
        baselineSob: sob,
        baselineEdema: edema,
        baselineFatigue: fatigue,
        baselineWeight: parseFloat(weight),
        orthopnea: orthopnea === "Yes",
      };
      await AsyncStorage.setItem("baselineSymptoms", JSON.stringify(baselineData));
      if (typeof onBaselineComplete === "function") await onBaselineComplete();

      Alert.alert("Baseline Saved", "Your baseline has been saved successfully.", [
        {
          text: "Continue",
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: "MainTabs", state: { routes: [{ name: "Home" }] } }],
            }),
        },
      ]);
    } catch (err) {
      console.error("Error saving baseline info:", err);
      Alert.alert("Error", "Unable to save baseline information. Please try again.");
    }
  };

  // ---------- Render helpers ----------
  const renderOptionButtons = (value, setter, options) => (
    <View style={styles.card}>
      {options.map((opt) => {
        const sel = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.optionRow, sel && styles.optionRowSel]}
            onPress={() => setter(opt.value)}
            activeOpacity={0.85}
          >
            <Text style={styles.optionTitle}>{opt.value}</Text>
            <Text style={styles.optionDesc}>{opt.example}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderYesNo = (label, value, setter) => (
    <View style={styles.questionBlock}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.pillGroup}>
        {["Yes", "No"].map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.pillButton, value === opt && styles.pillSelected]}
            onPress={() => setter(opt)}
            activeOpacity={0.85}
          >
            <Text style={[styles.pillText, value === opt && styles.pillTextSelected]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ---------- Guide Overlay ----------
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

  // ---------- Render Steps ----------
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Text style={styles.progress}>Step 1 of 5</Text>
            <Text style={styles.header}>
              At your normal baseline, how much shortness of breath do you usually have?
            </Text>
            {renderOptionButtons(sob, setSob, [
              { value: "None", example: "You breathe comfortably during normal activity." },
              { value: "Mild", example: "Shortness of breath with brisk walking or climbing stairs." },
              { value: "Moderate", example: "You get short of breath with light activity like walking, showering, or light chores." },
              { value: "Severe", example: "You feel short of breath while resting, sitting or talking." },
            ])}
            <TouchableOpacity style={styles.guideButton} onPress={() => setGuide("SOB")}>
              <Text style={styles.guideButtonText}>Tap here to see what each level means</Text>
            </TouchableOpacity>
          </>
        );

      case 1:
        return (
          <>
            <Text style={styles.progress}>Step 2 of 5</Text>
            <Text style={styles.header}>
              At your baseline, how much swelling do you usually notice in your feet, ankles, or legs?
            </Text>
            {renderOptionButtons(edema, setEdema, [
              { value: "None", example: "Legs and feet look normal without visible swelling." },
              { value: "Mild", example: "A little swelling that goes away with rest and elevation." },
              { value: "Moderate", example: "Noticeable swelling that moves higher up the legs and leaves an imprint when pressed." },
              { value: "Severe", example: "Constant swelling even up to the thighs or abdomen; deep imprint remains after pressure." },
            ])}
            <TouchableOpacity style={styles.guideButton} onPress={() => setGuide("EDEMA")}>
              <Text style={styles.guideButtonText}>Tap here to see what each level means</Text>
            </TouchableOpacity>
          </>
        );

      case 2:
        return (
          <>
            <Text style={styles.progress}>Step 3 of 5</Text>
            <Text style={styles.header}>
              At your baseline, how tired or fatigued do you generally feel?
            </Text>
            {renderOptionButtons(fatigue, setFatigue, [
              { value: "None", example: "Normal energy for your day." },
              { value: "Mild", example: "Less than normal energy but able to perform daily activities." },
              { value: "Moderate", example: "You feel drained after daily activities like walking, shopping, or doing chores." },
              { value: "Severe", example: "Exhausted most of the day, even at rest." },
            ])}
            <TouchableOpacity style={styles.guideButton} onPress={() => setGuide("FATIGUE")}>
              <Text style={styles.guideButtonText}>Tap here to see what each level means</Text>
            </TouchableOpacity>
          </>
        );

      case 3:
        return (
          <>
            <Text style={styles.progress}>Step 4 of 5</Text>
            {renderYesNo(
              "At your usual baseline, do you have trouble lying flat to sleep (shortness of breath when lying down)?",
              orthopnea,
              setOrthopnea
            )}
          </>
        );

      case 4:
        return (
          <>
            <Text style={styles.progress}>Step 5 of 5</Text>
            <Text style={styles.header}>What is your usual weight when you’re feeling well?</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={weight} onValueChange={(v) => setWeight(v)}>
                <Picker.Item label="Select weight" value="" />
                {Array.from({ length: 321 }, (_, i) => i + 80).map((w) => (
                  <Picker.Item key={w} label={`${w} lbs`} value={w.toString()} />
                ))}
              </Picker>
            </View>
          </>
        );

      default:
        return null;
    }
  };

  // ---------- Return ----------
  return (
    <LinearGradient colors={["#f9fbfc", "#b7c9d8"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: 120 }}>
              <HeroHeader
                title="Baseline Information"
                subtitle="Record what your usual, stable symptoms look like so HeartLink can personalize your daily summaries."
              />

              {renderStep()}

              <View style={styles.navRow}>
                {step > 0 ? (
                  <TouchableOpacity style={[styles.navButton, styles.navButtonBack]} onPress={handleBack}>
                    <Text style={styles.navButtonText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 110 }} />
                )}

                <TouchableOpacity
                  style={[styles.navButton, step === 4 ? styles.navButtonSubmit : styles.navButtonNext]}
                  onPress={handleNext}
                >
                  <Text style={[styles.navButtonText, step !== 4 && { color: NAVY }]}>
                    {step === 4 ? "Save My Baseline" : "Next"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {renderGuide()}
    </LinearGradient>
  );
}

// ---------------------------- Styles ----------------------------
const styles = StyleSheet.create({
  progress: { ...theme.typography.small, textAlign: "center", color: NAVY, marginBottom: 8 },
  header: { ...theme.typography.h2, textAlign: "center", marginBottom: 12 },

  card: { backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  optionRow: {
    borderWidth: 1,
    borderColor: "#D6D9DC",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  optionRowSel: { borderColor: NAVY, backgroundColor: "#F0F6FB" },
  optionTitle: { ...theme.typography.h3, marginBottom: 4 },
  optionDesc: { ...theme.typography.body, color: "#444" },

  questionBlock: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginTop: 10, borderColor: "#E0E4EA", borderWidth: 1 },
  label: { ...theme.typography.h3, textAlign: "center", marginBottom: 8 },
  pillGroup: { flexDirection: "row", gap: 12, justifyContent: "center" },
  pillButton: { borderWidth: 1, borderColor: NAVY, borderRadius: 25, paddingVertical: 10, paddingHorizontal: 26 },
  pillSelected: { backgroundColor: NAVY },
  pillText: { ...theme.typography.body, color: NAVY, fontWeight: "700" },
  pillTextSelected: { ...theme.typography.body, color: "#FFFFFF", fontWeight: "700" },

  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },

  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 40 },
  navButton: { borderRadius: 44, paddingVertical: 16, paddingHorizontal: 44, elevation: 3 },
  navButtonBack: { backgroundColor: NAVY },
  navButtonNext: { backgroundColor: APRICOT },
  navButtonSubmit: { backgroundColor: APRICOT },
  navButtonText: { ...theme.typography.h3, color: "#FFFFFF", textAlign: "center" },

  // --- Guide Link + Overlay ---
  guideButton: { alignItems: "center", marginTop: 10, marginBottom: 6 },
  guideButtonText: { color: NAVY, fontSize: 18, fontWeight: "700", textDecorationLine: "underline" },
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
