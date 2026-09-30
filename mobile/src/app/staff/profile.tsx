import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button, Badge } from "../../components";
import { useStaffAuth } from "../../auth";
import { useTheme } from "../../theme";

export default function StaffProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, logout } = useStaffAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/staff/login" as any);
  };

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Staff Profile</Text>
      </View>

      {user ? (
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: colors.blush }]}>
              <Text style={[styles.avatarText, { color: colors.rose }]}>
                {user.name ? user.name.charAt(0).toUpperCase() : "S"}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.ink }]}>{user.name}</Text>
              <Text style={[styles.userEmail, { color: colors.muted }]}>
                {user.email}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>Role</Text>
            <Badge
              label={user.role}
              variant={
                user.role === "ADMIN"
                  ? "rose"
                  : user.role === "LEAD"
                  ? "purple"
                  : "blue"
              }
            />
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>Account Status</Text>
            <Badge
              label={user.is_active ? "Active" : "Inactive"}
              variant={user.is_active ? "emerald" : "danger"}
            />
          </View>

          {user.team_id !== undefined && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Team ID</Text>
              <Text style={[styles.detailValue, { color: colors.ink }]}>
                {user.team_id ?? "Unassigned"}
              </Text>
            </View>
          )}

          <Button
            title="Log out"
            onPress={handleLogout}
            variant="danger"
            style={{ marginTop: 20 }}
          />
        </Card>
      ) : (
        <Card>
          <Text style={{ color: colors.muted }}>Not logged in.</Text>
          <Button
            title="Go to Login"
            onPress={() => router.replace("/staff/login" as any)}
            variant="primary"
            style={{ marginTop: 12 }}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  card: {
    padding: 20,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#e7e4f2",
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
});
