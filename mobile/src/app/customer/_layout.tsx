import React, { useEffect } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { ActivityIndicator } from "react-native";
import { useCustomerAuth } from "../../auth";
import { useTheme } from "../../theme";
import { Screen } from "../../components";

export default function CustomerLayout() {
  const { token, isLoading } = useCustomerAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      const isPublic = pathname.endsWith("/login") || pathname.endsWith("/register");
      const isInTabs = pathname.includes("/(tabs)") || pathname.includes("/customer/(tabs)");

      if (!token && !isPublic) {
        router.replace("/customer/login" as any);
      } else if (token && isPublic) {
        // Redirect to main tabs when already logged in
        router.replace("/customer/(tabs)/shop" as any);
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
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="tickets/[id]" />
    </Stack>
  );
}

