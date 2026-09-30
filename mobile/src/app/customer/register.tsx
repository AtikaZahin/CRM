import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button, TextField, ErrorState } from "../../components";
import { useCustomerAuth } from "../../auth";
import { apiClient, errorMessage } from "../../api/client";
import { useTheme } from "../../theme";

export default function CustomerRegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { login } = useCustomerAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Register account
      await apiClient.post("/customer/register", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        password,
      });

      // 2. Auto-login after registration
      const loginRes = await apiClient.post("/customer/login", {
        email: email.trim(),
        password,
      });

      const token = loginRes.data.access_token;
      await login(token);
      router.replace("/customer/(tabs)/shop" as any);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
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
        <Text style={[styles.title, { color: colors.ink }]}>Create Customer Account</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Register to browse software products and manage support tickets
        </Text>
      </View>

      <Card style={styles.card}>
        {error && <ErrorState message={error} style={styles.errorBox} />}

        <TextField
          label="Full Name *"
          placeholder="e.g. Priya Sharma"
          value={name}
          onChangeText={setName}
        />

        <TextField
          label="Email Address *"
          placeholder="e.g. priya@shop.test"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextField
          label="Phone Number (Optional)"
          placeholder="e.g. +91 98765 43210"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <TextField
          label="Password *"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 12 }}
        />

        <View style={styles.loginPrompt}>
          <Text style={[styles.loginText, { color: colors.muted }]}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/customer/login" as any)}>
            <Text style={[styles.loginLink, { color: colors.rose }]}>Sign in</Text>
          </TouchableOpacity>
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
  loginPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
