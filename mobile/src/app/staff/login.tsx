import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button, TextField, ErrorState } from "../../components";
import { useStaffAuth } from "../../auth";
import { apiClient, errorMessage } from "../../api/client";
import { useTheme } from "../../theme";

export default function StaffLoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { login } = useStaffAuth();

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
      const res = await apiClient.post("/staff/login", {
        email: email.trim(),
        password,
      });

      const token = res.data.access_token;
      await login(token);
      router.replace("/staff/(tabs)" as any);
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
        <Text style={[styles.title, { color: colors.ink }]}>Staff Portal Login</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Enter your employee or manager credentials
        </Text>
      </View>

      <Card style={styles.card}>
        {error && <ErrorState message={error} style={styles.errorBox} />}

        <TextField
          label="Email Address"
          placeholder="e.g. anita@crm.test"
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
          title="Sign In as Staff"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 12 }}
        />

        <View style={styles.quickAccounts}>
          <Text style={[styles.quickTitle, { color: colors.muted }]}>
            Quick Test Accounts (Password: Password@123):
          </Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: colors.surface2 }]}
              onPress={() => setTestAccount("admin@crm.test")}
            >
              <Text style={[styles.chipText, { color: colors.rose }]}>Admin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: colors.surface2 }]}
              onPress={() => setTestAccount("anita@crm.test")}
            >
              <Text style={[styles.chipText, { color: colors.rose }]}>Anita (LEAD)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: colors.surface2 }]}
              onPress={() => setTestAccount("ravi@crm.test")}
            >
              <Text style={[styles.chipText, { color: colors.rose }]}>Ravi (EMP)</Text>
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
