// STATIC REPLACEMENT — no Moti/Reanimated
import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../theme";

export default function AnimatedCard({ children, style, ...rest }) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme?.colors?.surface || "#FFFFFF",
    borderRadius: theme?.radius?.lg || 16,
    borderWidth: 1,
    borderColor: theme?.colors?.border || "#E3E8EE",
    padding: theme?.spacing?.lg || 16,
  },
});
