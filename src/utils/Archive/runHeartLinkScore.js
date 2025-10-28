import AsyncStorage from "@react-native-async-storage/async-storage";
import calculateScore_v3_6 from "./calculateScore_v3_6";
import calculateScore_v3_7 from "./calculateScore_v3_7";

export async function runHeartLinkScore(input, baseline, hist) {
  const active = await calculateScore_v3_6(input, baseline, hist);
  const shadow = await calculateScore_v3_7(input, baseline, hist);

  try {
    const entry = {
      timestamp: new Date().toISOString(),
      activeCategory: active?.category ?? null,
      shadowCategory: shadow?.category ?? null,
      cceScore: shadow?.meta?.cceScore ?? null,
    };
    const prev = JSON.parse((await AsyncStorage.getItem("HeartLinkShadowLogs")) || "[]");
    prev.push(entry);
    if (prev.length > 200) prev.splice(0, prev.length - 200);
    await AsyncStorage.setItem("HeartLinkShadowLogs", JSON.stringify(prev));
  } catch {}

  return { active, shadow };
}
