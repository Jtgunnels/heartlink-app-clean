// src/theme/animations.js
import { Easing } from "react-native"; // ✅ use built-in Easing

export const animations = {
  durations: {
    short: 150,
    medium: 300,
    long: 600,
  },
  easing: {
    easeIn: Easing.in(Easing.ease),
    easeOut: Easing.out(Easing.ease),
    easeInOut: Easing.inOut(Easing.ease),
    linear: Easing.linear,
  },
  fade: {
    from: 0,
    to: 1,
    duration: 300,
  },
  slide: {
    from: 50,
    to: 0,
    duration: 300,
  },
};
