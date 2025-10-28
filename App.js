// App.js
import "./src/utils/disableAnimations";
import React, { useEffect, useState } from "react";
import { Platform, Alert, LogBox, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";

import RootNavigation from "./src/navigation";
import { UserProvider } from "./src/context/UserContext";
import { DebugProvider } from "./src/context/DebugContext"; // ✅ added

let Notifications;
try {
  Notifications = require("expo-notifications");
} catch {
  console.warn("⚠️ expo-notifications not found. Skipping notification setup.");
}

SplashScreen.preventAutoHideAsync().catch(() => {});
LogBox.ignoreLogs(["Non-serializable values were found in the navigation state"]);

export default function App() {
  const [seenOrientation, setSeenOrientation] = useState(null);
  const [hasBaseline, setHasBaseline] = useState(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      await initializeApp();
    })();
  }, []);

  async function initializeApp() {
    try {
      await loadFonts();
      await checkOrientationStatus();
      await checkBaselineStatus();
      if (Notifications) await setupNotifications();
    } catch (e) {
      console.error("Initialization error:", e);
    } finally {
      setFontsLoaded(true);
      try {
        await SplashScreen.hideAsync();
      } catch {}
    }
  }

  async function loadFonts() {
    try {
      await Font.loadAsync({
        "Lato-Semibold": require("./assets/fonts/Lato_Semibold.ttf"),
        "Inter-Regular": require("./assets/fonts/Inter_Regular.ttf"),
      });
    } catch (e) {
      console.error("Font loading error:", e);
    }
  }

  async function checkOrientationStatus() {
    try {
      const seen = await AsyncStorage.getItem("seenOrientation");
      setSeenOrientation(!!seen);
    } catch (e) {
      console.error("Error checking orientation status:", e);
      setSeenOrientation(true);
    }
  }

  async function checkBaselineStatus() {
    try {
      const baseline = await AsyncStorage.getItem("baselineSymptoms");
      setHasBaseline(!!baseline);
    } catch (e) {
      console.error("Error checking baseline status:", e);
      setHasBaseline(false);
    }
  }

  async function setupNotifications() {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🩺 Daily Check-In Reminder",
          body: "Don’t forget to log your symptoms and weight today!",
        },
        trigger: { hour: 9, minute: 0, repeats: true },
      });

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#2AA7B3",
        });
      }
    } catch (e) {
      console.error("Notification setup error:", e);
      Alert.alert("Notification Error", "Unable to configure notifications.");
    }
  }

  if (!fontsLoaded || seenOrientation === null || hasBaseline === null) {
    return null;
  }

  return (
    <LinearGradient
      colors={["#b7c9d8", "#f9fbfc"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}
    >
      <DebugProvider>
        <UserProvider>
          <RootNavigation
            seenOrientation={seenOrientation}
            hasBaseline={hasBaseline}
          />
        </UserProvider>
      </DebugProvider>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
});
