import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { Button } from "./Button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  message = "Can't reach the server – check Wi-Fi",
  onRetry,
  style,
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.message, { color: colors.ink }]}>{message}</Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="outline"
          style={{ marginTop: 12, minWidth: 120 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  icon: {
    fontSize: 36,
    marginBottom: 8,
  },
  message: {
    fontSize: 14.5,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
});
