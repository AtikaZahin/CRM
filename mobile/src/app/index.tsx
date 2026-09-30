import React from "react";
import { View, Text, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Button, Badge } from "../components";
import { useStaffAuth, useCustomerAuth } from "../auth";
import { useTheme } from "../theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const staffAuth = useStaffAuth();
  const customerAuth = useCustomerAuth();

  if (staffAuth.isLoading || customerAuth.isLoading) {
    return (
      <Screen style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.rose} />
      </Screen>
    );
  }

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.logoDot, { backgroundColor: colors.rose }]}>
          <Text style={styles.logoIcon}>💎</Text>
        </View>
        <Text style={[styles.title, { color: colors.ink }]}>Capstone CRM</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Select your portal to continue
        </Text>
      </View>

      <Card style={styles.portalCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.portalEmoji}>👔</Text>
          <View style={styles.cardTextContainer}>
            <Text style={[styles.portalTitle, { color: colors.ink }]}>
              Staff Portal
            </Text>
            <Text style={[styles.portalDesc, { color: colors.muted }]}>
              Admin, Lead, and Employee access for lead tracking and support tickets.
            </Text>
          </View>
        </View>

        {staffAuth.user ? (
          <View style={styles.loggedInBox}>
            <View style={styles.badgeRow}>
              <Badge
                label={`Logged in as ${staffAuth.user.name}`}
                variant="purple"
              />
              <Badge label={staffAuth.user.role} variant="rose" />
            </View>
            <Button
              title="Continue as Staff"
              onPress={() => router.push("/staff/(tabs)" as any)}
              variant="primary"
            />
            <Button
              title="Log Out Staff Account"
              onPress={() => staffAuth.logout()}
              variant="outline"
            />
          </View>
        ) : (
          <Button
            title="Staff Login"
            onPress={() => router.push("/staff/login" as any)}
            variant="primary"
          />
        )}
      </Card>

      <Card style={styles.portalCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.portalEmoji}>🛒</Text>
          <View style={styles.cardTextContainer}>
            <Text style={[styles.portalTitle, { color: colors.ink }]}>
              Customer Portal
            </Text>
            <Text style={[styles.portalDesc, { color: colors.muted }]}>
              Browse software products, make purchases, and manage support tickets.
            </Text>
          </View>
        </View>

        {customerAuth.user ? (
          <View style={styles.loggedInBox}>
            <Badge
              label={`Logged in as ${customerAuth.user.name}`}
              variant="emerald"
            />
            <Button
              title="Continue to Customer Shop"
              onPress={() => router.push("/customer/(tabs)/shop" as any)}
              variant="primary"
            />
            <Button
              title="Log Out Customer Account"
              onPress={() => customerAuth.logout()}
              variant="outline"
            />
          </View>
        ) : (
          <View>
            <Button
              title="Customer Login"
              onPress={() => router.push("/customer/login" as any)}
              variant="primary"
            />
            <Button
              title="Register New Account"
              onPress={() => router.push("/customer/register" as any)}
              variant="outline"
            />
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    justifyContent: "center",
    paddingVertical: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoDot: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  portalCard: {
    marginBottom: 16,
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  portalEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  cardTextContainer: {
    flex: 1,
  },
  portalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  portalDesc: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  loggedInBox: {
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 8,
  },
});
