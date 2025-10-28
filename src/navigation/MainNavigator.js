// src/navigation/MainNavigator.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";

import HomeScreen from "../screens/HomeScreen";
import SymptomTrackerScreen from "../screens/SymptomTrackerScreen";
import RecommendationsScreen from "../screens/RecommendationsScreen";
import SymptomDetailsScreen from "../screens/SymptomDetailsScreen";
import ProgressScreen from "../screens/ProgressScreen";
import SettingsScreen from "../screens/SettingsScreen";
import BaselineInfoScreen from "../screens/BaselineInfoScreen";
import NotificationPreferencesScreen from "../screens/NotificationPreferencesScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
import AboutHeartLinkScreen from "../screens/AboutHeartLinkScreen";
import { theme } from "../theme";

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 70,
          paddingBottom: Platform.OS === "ios" ? 12 : 6,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          switch (route.name) {
            case "Home":
              iconName = "home";
              break;
            case "SymptomTracker":
              iconName = "clipboard";
              break;
            case "Recommendations":
              iconName = "activity";
              break;
            case "Progress":
              iconName = "trending-up";
              break;
            case "Settings":
              iconName = "settings";
              break;
            default:
              iconName = "circle";
          }
          return <Feather name={iconName} size={size} color={color} />;
        },
      })}
    >
      {/* 🏠 Home */}
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />

      {/* 🩺 Daily Check-In */}
      <Tab.Screen
        name="SymptomTracker"
        component={SymptomTrackerScreen}
        options={{ title: "Daily Check-In" }}
      />

      {/* 💬 Symptom Review */}
      <Tab.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{ title: "Symptom Review" }}
      />

      {/* 📄 Symptom Details (hidden) */}
      <Tab.Screen
        name="SymptomDetails"
        component={SymptomDetailsScreen}
        options={{
          title: "Symptom Details",
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* 📈 Progress */}
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ title: "Progress" }} />

      {/* ⚙️ Settings */}
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />

      {/* 🧩 Hidden Screens */}
      <Tab.Screen
        name="BaselineInfo"
        component={BaselineInfoScreen}
        options={{
          title: "Baseline Info",
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tab.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{
          title: "Notifications",
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tab.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          title: "Privacy Policy",
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
        }}
      />

      <Tab.Screen
        name="AboutHeartLink"
        component={AboutHeartLinkScreen}
        options={{
          title: "About HeartLink",
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tab.Navigator>
  );
}
