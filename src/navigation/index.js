// src/navigation/index.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import OrientationScreen from "../screens/OrientationScreen";
import BaselineInfoScreen from "../screens/BaselineInfoScreen";
import AboutHeartLinkScreen from "../screens/AboutHeartLinkScreen"; // for the “Learn more” link during onboarding
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";   // optional, but handy in onboarding
import MainNavigator from "./MainNavigator"; // bottom tabs

const Stack = createNativeStackNavigator();

/**
 * RootNavigation
 * Drives the entire navigation tree:
 * - Orientation (first run)
 * - Baseline setup
 * - Main tabs (Home / Check-In / Recommendations / Progress / Settings)
 *
 * Props:
 *  - seenOrientation: boolean
 *  - hasBaseline: boolean
 */
export default function RootNavigation({
  seenOrientation = false,
  hasBaseline = false,
}) {
  // Decide the starting route based on onboarding state
  const initialRouteName = !seenOrientation
    ? "Orientation"
    : !hasBaseline
    ? "BaselineInfo"
    : "MainTabs";

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        {/* Onboarding screens */}
        <Stack.Screen name="Orientation" component={OrientationScreen} />
        <Stack.Screen name="BaselineInfo" component={BaselineInfoScreen} />

        {/* Informational routes available from onboarding */}
        <Stack.Screen name="AboutHeartLink" component={AboutHeartLinkScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />

        {/* Main application (bottom tabs) */}
        <Stack.Screen name="MainTabs" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
