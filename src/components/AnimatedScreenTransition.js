// STATIC REPLACEMENT — no Moti/Reanimated
import React from "react";
import { View } from "react-native";

export default function AnimatedScreenTransition({ children, style }) {
  // Render children directly; no transitions
  return <View style={style}>{children}</View>;
}
