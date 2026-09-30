import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Badge, ErrorState, TicketChat } from "../../../components";
import { useCustomerAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

interface CustomerTicketDetail {
  id: number;
  order_id: number;
  subject: string;
  category: string;
  status: string;
  agent_first_name?: string | null;
  rating?: number | null;
  created_at?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  DAMAGED: "Damaged Item",
  LATE_DELIVERY: "Late Delivery",
  WRONG_ITEM: "Wrong Item",
  CANCEL_REFUND: "Refund Request",
  OTHER: "General Issue",
};

const STATUS_VARIANT: Record<string, "neutral" | "blue" | "purple" | "rose" | "emerald" | "danger"> = {
  OPEN: "rose",
  IN_PROGRESS: "purple",
  RESOLVED: "emerald",
  CLOSED: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function CustomerTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { token } = useCustomerAuth();

  const [ticket, setTicket] = useState<CustomerTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ticketId = parseInt(id || "0", 10);

  const fetchTicket = async () => {
    if (!token || !ticketId) return;
    setLoading(true);
    setError(null);

    try {
      // Get all customer tickets and find the target
      const res = await apiClient.get<CustomerTicketDetail[]>("/customer/tickets", {
        headers: authHeader(token),
      });
      const found = res.data.find((t) => t.id === ticketId);
      if (found) {
        setTicket(found);
      } else {
        setError("Ticket not found.");
      }
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId, token]);

  if (loading) {
    return (
      <Screen scrollable={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.rose} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading conversation…</Text>
        </View>
      </Screen>
    );
  }

  if (error || !ticket) {
    return (
      <Screen scrollable={false}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
            <Text style={[styles.backText, { color: colors.ink }]}>Back</Text>
          </TouchableOpacity>
        </View>
        <ErrorState message={error || "Ticket not found"} onRetry={fetchTicket} />
      </Screen>
    );
  }

  const isResolved = ticket.status === "RESOLVED" || ticket.status === "CLOSED";

  return (
    <Screen scrollable={false}>
      {/* Top Nav Header */}
      <View style={[styles.topNav, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
          <Text style={[styles.backText, { color: colors.ink }]}>Tickets</Text>
        </TouchableOpacity>
        <Badge
          label={STATUS_LABEL[ticket.status] ?? ticket.status}
          variant={STATUS_VARIANT[ticket.status] ?? "neutral"}
        />
      </View>

      {/* Ticket summary header */}
      <Card style={styles.headerCard}>
        <Text style={[styles.ticketSubject, { color: colors.ink }]}>
          {ticket.subject || `Ticket #${ticket.id}`}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.muted }]}>
            {CATEGORY_LABELS[ticket.category] ?? ticket.category} · Order #{ticket.order_id}
          </Text>
        </View>

        <View style={[styles.agentRow, { borderTopColor: colors.border }]}>
          <Ionicons
            name={ticket.agent_first_name ? "person-circle-outline" : "time-outline"}
            size={16}
            color={ticket.agent_first_name ? colors.rose : colors.muted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.agentText,
              { color: ticket.agent_first_name ? colors.rose : colors.muted },
            ]}
          >
            {ticket.agent_first_name
              ? `${ticket.agent_first_name} is helping you`
              : "Waiting for an agent to be assigned"}
          </Text>
        </View>
      </Card>

      {/* Embedded Live Chat */}
      <View style={styles.chatContainer}>
        <TicketChat
          ticketId={ticketId}
          token={token || ""}
          portal="customer"
          isResolved={isResolved}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
  },
  headerCard: {
    padding: 14,
    marginBottom: 10,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  metaRow: {
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  agentText: {
    fontSize: 13,
    fontWeight: "500",
  },
  chatContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
