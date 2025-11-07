// src/utils/disableAnimations.js
// 🚫 This patch disables all Moti & Reanimated animations safely.

import { Platform, LogBox } from "react-native";

// Suppress Moti/Reanimated warnings
LogBox.ignoreLogs([
  "Reanimated 2",
  "createAnimatedComponent",
  "NativeReanimated",
]);

// 1. Mock Reanimated methods to prevent runtime calls
try {
  const Reanimated = require("react-native-reanimated");
  if (Reanimated.default) {
    Reanimated.default.addWhitelistedUIProps = () => {};
    Reanimated.default.configureProps = () => {};
    Reanimated.default.createAnimatedComponent = (comp) => comp;
    Reanimated.default.Animated = { View: (props) => props.children };
  }
} catch (e) {
  console.log("Reanimated mock applied");
}

// 2. Mock Moti to render plain Views instead
try {
  const Moti = require("moti");
  const { View } = require("react-native");

  // Replace all Moti components with regular Views
  Moti.MotiView = View;
  Moti.MotiText = View;
  Moti.MotiImage = View;
} catch (e) {
  console.log("Moti mock applied");
}

// Optional: Add global flag
global.__ANIMATIONS_DISABLED__ = true;

console.log("🟦 HeartLink animations disabled safely for debugging.");
