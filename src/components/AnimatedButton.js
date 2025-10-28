// STATIC REPLACEMENT — no Moti/Reanimated
import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { theme } from "../theme";

export default function AnimatedButton({
  title,
  children,
  onPress,
  disabled,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  testID,
  accessibilityLabel,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ /* pressed */ }) => [
        styles.button,
        disabled && styles.disabled,
        style,
      ]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
    >
      <View style={styles.content}>
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <Text style={[styles.text, textStyle]}>
          {title ?? children}
        </Text>
        {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme?.colors?.primary || "#0E2E4F",
    borderRadius: theme?.radius?.lg || 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    color: theme?.colors?.onPrimary || "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  icon: { marginHorizontal: 2 },
});
