import React from "react";
import { ScrollView, View } from "react-native";
import Screen from "../components/Screen";
import HeroHeader from "../components/HeroHeader";
import Card from "../components/Card";
import { colors } from "../utils/colors";
import { spacing } from "../utils/spacing";

export default function HomeScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.m,
          paddingBottom: spacing.l,
        }}
      >
        <HeroHeader title="Welcome to HeartLink" />
        <View style={{ marginTop: spacing.l }}>
          <Card
            title="Symptoms at Baseline"
            subtitle="All symptoms remain stable compared to usual condition."
            backgroundColor={colors.greenLight}
          />
          <Card
            title="Small Changes Noted"
            subtitle="Monitor closely, consider repeating your check-in soon."
            backgroundColor={colors.yellowLight}
          />
          <Card
            title="Follow Up with Your Provider Soon"
            subtitle="Your recent entries show a change that may need review."
            backgroundColor={colors.orangeLight}
          />
          <Card
            title="Contact Your Provider"
            subtitle="Significant symptom worsening detected. Contact your team."
            backgroundColor={colors.redLight}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
