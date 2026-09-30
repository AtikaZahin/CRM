import React, { useEffect } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useStaffAuth } from "../../auth";
import { useTheme } from "../../theme";
import { Screen } from "../../components";

export default function StaffLayout() {
  const { token, isLoading } = useStaffAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      if (!token && !pathname.endsWith("/login")) {
        router.replace("/staff/login" as any);
      }
    }
  }, [token, isLoading, pathname]);

  if (isLoading) {
    return (
      <Screen style={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.rose} />
      </Screen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
