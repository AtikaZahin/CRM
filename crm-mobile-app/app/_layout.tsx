import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="index" options={{ title: 'CRM Agent', headerShown: true }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
