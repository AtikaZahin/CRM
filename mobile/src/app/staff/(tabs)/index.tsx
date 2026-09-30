import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Screen, Card, Badge, ErrorState } from "../../../components";
import { useStaffAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

interface DashboardStats {
  total_staff?: number | null;
  total_leads?: number | null;
  total_employees?: number | null;
  total_customers?: number | null;
  total_orders?: number | null;
  team_size?: number | null;
  unassigned_tickets?: number | null;
  tickets_by_status?: {
    OPEN?: number;
    IN_PROGRESS?: number;
    RESOLVED?: number;
  } | null;
  avg_rating?: number | null;
  rated_count?: number | null;
}

export default function StaffDashboardScreen() {
  const { colors } = useTheme();
  const { user, token } = useStaffAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<DashboardStats>("/dashboard", {
        headers: authHeader(token),
      });
      setStats(res.data);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const role = user?.role || "EMPLOYEE";

  return (
    <Screen scrollable={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDashboard(true)}
            tintColor={colors.rose}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.welcomeText, { color: colors.muted }]}>
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: colors.ink }]}>
              {user?.name || "Staff Member"}
            </Text>
          </View>
          <Badge
            label={role}
            variant={
              role === "ADMIN" ? "rose" : role === "LEAD" ? "purple" : "blue"
            }
          />
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.rose} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>
              Loading dashboard metrics...
            </Text>
          </View>
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchDashboard()} />
        ) : stats ? (
          <View style={styles.dashboardContent}>
            {/* ADMIN STATS */}
            {role === "ADMIN" && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.rose }]}>
                  OVERVIEW METRICS
                </Text>
                <View style={styles.grid}>
                  <Card style={styles.statCard}>
                    <Text style={[styles.statLabel, { color: colors.muted }]}>
                      Total Staff
                    </Text>
                    <Text style={[styles.statValue, { color: colors.ink }]}>
                      {stats.total_staff ?? 0}
                    </Text>
                    <Text style={[styles.statSub, { color: colors.muted }]}>
                      {stats.total_leads ?? 0} Leads · {stats.total_employees ?? 0} Employees
                    </Text>
                  </Card>

                  <Card style={styles.statCard}>
                    <Text style={[styles.statLabel, { color: colors.muted }]}>
                      Total Customers
                    </Text>
                    <Text style={[styles.statValue, { color: colors.ink }]}>
                      {stats.total_customers ?? 0}
                    </Text>
                    <Text style={[styles.statSub, { color: colors.muted }]}>
                      Registered customer accounts
                    </Text>
                  </Card>

                  <Card style={styles.statCard}>
                    <Text style={[styles.statLabel, { color: colors.muted }]}>
                      Total Orders
                    </Text>
                    <Text style={[styles.statValue, { color: colors.ink }]}>
                      {stats.total_orders ?? 0}
                    </Text>
                    <Text style={[styles.statSub, { color: colors.muted }]}>
                      Software store purchases
                    </Text>
                  </Card>
                </View>
              </View>
            )}

            {/* LEAD STATS */}
            {role === "LEAD" && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.rose }]}>
                  TEAM PERFORMANCE
                </Text>
                <View style={styles.grid}>
                  <Card style={styles.statCard}>
                    <Text style={[styles.statLabel, { color: colors.muted }]}>
                      Team Size
                    </Text>
                    <Text style={[styles.statValue, { color: colors.ink }]}>
                      {stats.team_size ?? 0}
                    </Text>
                    <Text style={[styles.statSub, { color: colors.muted }]}>
                      Direct reporting employees
                    </Text>
                  </Card>

                  <Card style={styles.statCard}>
                    <Text style={[styles.statLabel, { color: colors.muted }]}>
                      Unassigned Tickets
                    </Text>
                    <Text style={[styles.statValue, { color: colors.danger }]}>
                      {stats.unassigned_tickets ?? 0}
                    </Text>
                    <Text style={[styles.statSub, { color: colors.muted }]}>
                      Requires team lead assignment
                    </Text>
                  </Card>
                </View>
              </View>
            )}

            {/* TICKETS BY STATUS (SHARED FOR ALL ROLES) */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.rose }]}>
                {role === "ADMIN"
                  ? "SYSTEM TICKETS BY STATUS"
                  : role === "LEAD"
                  ? "TEAM TICKETS BY STATUS"
                  : "MY TICKETS BY STATUS"}
              </Text>
              <View style={styles.grid}>
                <Card style={styles.statusCard}>
                  <Badge label="OPEN" variant="rose" />
                  <Text style={[styles.statusValue, { color: colors.ink }]}>
                    {stats.tickets_by_status?.OPEN ?? 0}
                  </Text>
                </Card>

                <Card style={styles.statusCard}>
                  <Badge label="IN PROGRESS" variant="purple" />
                  <Text style={[styles.statusValue, { color: colors.ink }]}>
                    {stats.tickets_by_status?.IN_PROGRESS ?? 0}
                  </Text>
                </Card>

                <Card style={styles.statusCard}>
                  <Badge label="RESOLVED" variant="emerald" />
                  <Text style={[styles.statusValue, { color: colors.ink }]}>
                    {stats.tickets_by_status?.RESOLVED ?? 0}
                  </Text>
                </Card>
              </View>
            </View>

            {/* RATING STATS */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.rose }]}>
                CUSTOMER SATISFACTION
              </Text>
              <Card style={styles.ratingCard}>
                <View style={styles.ratingRow}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.ratingValue, { color: colors.ink }]}>
                      {stats.avg_rating !== null && stats.avg_rating !== undefined
                        ? `${stats.avg_rating} / 5.0`
                        : "No ratings yet"}
                    </Text>
                    <Text style={[styles.ratingSub, { color: colors.muted }]}>
                      {stats.rated_count ?? 0}{" "}
                      {stats.rated_count === 1 ? "rated ticket" : "rated tickets"}
                    </Text>
                  </View>
                </View>
              </Card>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: "500",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
  },
  centerContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  dashboardContent: {
    gap: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  grid: {
    gap: 10,
  },
  statCard: {
    padding: 16,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    marginVertical: 4,
  },
  statSub: {
    fontSize: 12,
  },
  statusCard: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  ratingCard: {
    padding: 18,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  starIcon: {
    fontSize: 32,
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  ratingSub: {
    fontSize: 13,
    marginTop: 2,
  },
});
