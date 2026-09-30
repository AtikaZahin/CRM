import React from "react";
import { Stack } from "expo-router";
import { StaffAuthProvider, CustomerAuthProvider } from "../auth";

export default function RootLayout() {
  return (
    <StaffAuthProvider>
      <CustomerAuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </CustomerAuthProvider>
    </StaffAuthProvider>
  );
}
