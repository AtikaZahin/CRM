import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Screen, Card, Badge, ErrorState, EmptyState } from "../../../components";
import { useStaffAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

export interface Ticket {
  id: number;
  order_id: number;
  customer_id: number;
  subject: string;
  category: string;
  status: string;
  assigned_employee_id?: number | null;
  assigned_by_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  DAMAGED: "Damaged Item",
  LATE_DELIVERY: "Late Delivery",
  WRONG_ITEM: "Wrong Item",
  CANCEL_REFUND: "Refund Request",
  OTHER: "General Issue",
};

export default function StaffSupportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, token } = useStaffAuth();

  const isLeadOrAdmin = user?.role === "ADMIN" || user?.role === "LEAD";

  // Active segment state: "UNASSIGNED" (if lead/admin), "IN_PROGRESS", "RESOLVED"
  const [activeSegment, setActiveSegment] = useState<
    "UNASSIGNED" | "IN_PROGRESS" | "RESOLVED"
  >(isLeadOrAdmin ? "UNASSIGNED" : "IN_PROGRESS");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If role changes or is loaded, ensure correct initial segment
  useEffect(() => {
    if (!isLeadOrAdmin && activeSegment === "UNASSIGNED") {
      setActiveSegment("IN_PROGRESS");
    }
  }, [isLeadOrAdmin]);

  const fetchTickets = async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      let endpoint = "/tickets";
      if (activeSegment === "UNASSIGNED") {
        endpoint += "?unassigned=true";
      } else {
        endpoint += `?status=${activeSegment}`;
      }

      const res = await apiClient.get<Ticket[]>(endpoint, {
        headers: authHeader(token),
      });
      setTickets(res.data || []);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token, activeSegment]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const renderTicketItem = ({ item }: { item: Ticket }) => {
    const categoryLabel = CATEGORY_LABELS[item.category] || item.category;
    const isUnassigned = !item.assigned_employee_id;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/staff/tickets/${item.id}` as any)}
      >
        <Card style={styles.ticketCard}>
          <View style={styles.cardHeader}>
            <View style={styles.idContainer}>
              <Text style={[styles.ticketId, { color: colors.rose }]}>
                #{item.id}
              </Text>
              <Badge
                label={categoryLabel}
                variant="blue"
                style={{ marginLeft: 8 }}
              />
            </View>
            <Badge
              label={isUnassigned ? "UNASSIGNED" : item.status}
              variant={
                isUnassigned
                  ? "danger"
                  : item.status === "RESOLVED"
                  ? "emerald"
                  : "purple"
              }
            />
          </View>

          <Text style={[styles.subject, { color: colors.ink }]} numberOfLines={2}>
            {item.subject}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={[styles.dateText, { color: colors.muted }]}>
              Created {formatDate(item.created_at)}
            </Text>
            <Text style={[styles.tapText, { color: colors.rose }]}>View →</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Screen scrollable={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Support Tickets</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {isLeadOrAdmin
            ? "Manage team assignments and ticket resolutions"
            : "Manage your assigned support cases"}
        </Text>
      </View>

      {/* SEGMENT CONTROL */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.surface2 }]}>
        {isLeadOrAdmin && (
          <TouchableOpacity
            style={[
              styles.segmentButton,
              activeSegment === "UNASSIGNED" && {
                backgroundColor: colors.surface,
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              },
            ]}
            onPress={() => setActiveSegment("UNASSIGNED")}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color:
                    activeSegment === "UNASSIGNED" ? colors.rose : colors.muted,
                  fontWeight: activeSegment === "UNASSIGNED" ? "700" : "500",
                },
              ]}
            >
              Unassigned
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeSegment === "IN_PROGRESS" && {
              backgroundColor: colors.surface,
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            },
          ]}
          onPress={() => setActiveSegment("IN_PROGRESS")}
        >
          <Text
            style={[
              styles.segmentText,
              {
                color:
                  activeSegment === "IN_PROGRESS" ? colors.rose : colors.muted,
                fontWeight: activeSegment === "IN_PROGRESS" ? "700" : "500",
              },
            ]}
          >
            In Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeSegment === "RESOLVED" && {
              backgroundColor: colors.surface,
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            },
          ]}
          onPress={() => setActiveSegment("RESOLVED")}
        >
          <Text
            style={[
              styles.segmentText,
              {
                color: activeSegment === "RESOLVED" ? colors.rose : colors.muted,
                fontWeight: activeSegment === "RESOLVED" ? "700" : "500",
              },
            ]}
          >
            Resolved
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIST CONTENT */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.rose} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Fetching tickets...
          </Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchTickets()} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTicketItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTickets(true)}
              tintColor={colors.rose}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={`No ${activeSegment.toLowerCase().replace("_", " ")} tickets`}
              description="Pull down to refresh or check back later."
              icon="🎧"
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13.5,
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 13,
  },
  centerContainer: {
    flex: 1,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 24,
  },
  ticketCard: {
    padding: 16,
    marginVertical: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  idContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ticketId: {
    fontSize: 15,
    fontWeight: "700",
  },
  subject: {
    fontSize: 15.5,
    fontWeight: "600",
    marginBottom: 10,
    lineHeight: 21,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e7e4f2",
  },
  dateText: {
    fontSize: 12,
  },
  tapText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
