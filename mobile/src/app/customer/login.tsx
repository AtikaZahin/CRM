import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button, TextField, ErrorState } from "../../components";
import { useCustomerAuth } from "../../auth";
import { apiClient, errorMessage } from "../../api/client";
import { useTheme } from "../../theme";

export default function CustomerLoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { login } = useCustomerAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.post("/customer/login", {
        email: email.trim(),
        password,
      });

      const token = res.data.access_token;
      await login(token);
      router.replace("/customer/(tabs)/shop" as any);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const setTestAccount = (testEmail: string) => {
    setEmail(testEmail);
    setPassword("Password@123");
    setError(null);
  };

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <Text style={[styles.backText, { color: colors.rose }]}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Customer Login</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Sign in to access your orders and support tickets
        </Text>
      </View>

      <Card style={styles.card}>
        {error && <ErrorState message={error} style={styles.errorBox} />}

        <TextField
          label="Email Address"
          placeholder="e.g. priya@shop.test"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextField
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          title="Sign In as Customer"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 12 }}
        />

        <View style={styles.registerPrompt}>
          <Text style={[styles.registerText, { color: colors.muted }]}>
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/customer/register" as any)}
          >
            <Text style={[styles.registerLink, { color: colors.rose }]}>
              Register here
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickAccounts}>
          <Text style={[styles.quickTitle, { color: colors.muted }]}>
            Quick Test Accounts (Password: Password@123):
          </Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: colors.surface2 }]}
              onPress={() => setTestAccount("priya@shop.test")}
            >
              <Text style={[styles.chipText, { color: colors.rose }]}>Priya</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: colors.surface2 }]}
              onPress={() => setTestAccount("rahul@shop.test")}
            >
              <Text style={[styles.chipText, { color: colors.rose }]}>Rahul</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    paddingVertical: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    padding: 20,
  },
  errorBox: {
    marginVertical: 0,
    marginBottom: 12,
    padding: 12,
  },
  registerPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  quickAccounts: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e7e4f2",
  },
  quickTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
