import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useTheme();
  const isInactive = disabled || loading;

  if (variant === "primary") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isInactive}
        activeOpacity={0.8}
        style={[styles.wrapper, style, isInactive && styles.disabledWrapper]}
      >
        <LinearGradient
          colors={colors.gradPrimary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.button, isInactive && { opacity: 0.6 }]}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={[styles.primaryText, textStyle]}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const isDanger = variant === "danger";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isInactive}
      activeOpacity={0.7}
      style={[
        styles.button,
        styles.wrapper,
        {
          backgroundColor: isDanger ? colors.danger : colors.surface,
          borderColor: isDanger ? colors.danger : colors.border,
          borderWidth: 1,
        },
        isInactive && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isDanger ? "#ffffff" : colors.rose}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.baseText,
            { color: isDanger ? "#ffffff" : colors.ink },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
    borderRadius: 10,
    overflow: "hidden",
  },
  disabledWrapper: {
    opacity: 0.6,
  },
  button: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  baseText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
