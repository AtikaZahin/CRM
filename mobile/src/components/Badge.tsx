import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "../theme";

export type BadgeVariant =
  | "neutral"
  | "blue"
  | "purple"
  | "rose"
  | "emerald"
  | "danger";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  label,
  variant = "neutral",
  style,
  textStyle,
}: BadgeProps) {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case "blue":
        return { bg: colors.sage, color: colors.blue };
      case "purple":
        return { bg: colors.statusProgressBg, color: colors.statusProgressColor };
      case "rose":
        return { bg: colors.statusOpenBg, color: colors.statusOpenColor };
      case "emerald":
        return { bg: colors.statusResolvedBg, color: colors.statusResolvedColor };
      case "danger":
        return { bg: colors.statusOpenBg, color: colors.danger };
      case "neutral":
      default:
        return { bg: colors.surface2, color: colors.muted };
    }
  };

  const { bg, color } = getVariantStyles();

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color }, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
