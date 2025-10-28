// STATIC REPLACEMENT — no Moti/Reanimated
import React from "react";
import { View } from "react-native";

export default function AnimatedSection({ children, style, ...rest }) {
  return (
    <View style={style} {...rest}>
      {children}
    </View>
  );
}
