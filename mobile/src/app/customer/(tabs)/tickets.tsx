import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Badge, ErrorState, EmptyState } from "../../../components";
import { useCustomerAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerTicket {
  id: number;
  order_id: number;
  subject: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  agent_first_name: string | null;
  rating: number | null;
  rated_at: string | null;
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Star Rating Modal ────────────────────────────────────────────────────────

interface StarRatingModalProps {
  visible: boolean;
  ticket: CustomerTicket | null;
  colors: ReturnType<typeof useTheme>["colors"];
  onClose: () => void;
  onSubmit: (ticket: CustomerTicket, stars: number) => void;
  submitting: boolean;
}

function StarRatingModal({
  visible,
  ticket,
  colors,
  onClose,
  onSubmit,
  submitting,
}: StarRatingModalProps) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (visible) setSelected(0);
  }, [visible]);

  if (!ticket) return null;

  const LABEL = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.ratingOverlay}>
        <View style={[styles.ratingSheet, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <Text style={[styles.ratingTitle, { color: colors.ink }]}>Rate Your Experience</Text>
          <Text style={[styles.ratingSubtitle, { color: colors.muted }]}>
            How was your support experience for{"\n"}
            <Text style={{ fontWeight: "700" }}>
              {ticket.subject || `Ticket #${ticket.id}`}
            </Text>
            ?
          </Text>

          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setSelected(star)}
                style={styles.starBtn}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={star <= selected ? "star" : "star-outline"}
                  size={40}
                  color={star <= selected ? "#F59E0B" : colors.muted}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Label */}
          <Text style={[styles.ratingLabel, { color: selected ? "#F59E0B" : colors.muted }]}>
            {LABEL[selected] || "Tap a star to rate"}
          </Text>

          {/* Buttons */}
          <TouchableOpacity
            style={[
              styles.ratingSubmitBtn,
              { backgroundColor: selected ? colors.rose : colors.border },
            ]}
            disabled={!selected || submitting}
            onPress={() => onSubmit(ticket, selected)}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.ratingSubmitText}>Submit Rating</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            disabled={submitting}
            style={styles.ratingCancelBtn}
          >
            <Text style={[styles.ratingCancelText, { color: colors.muted }]}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

interface TicketCardProps {
  ticket: CustomerTicket;
  colors: ReturnType<typeof useTheme>["colors"];
  onPress: (ticket: CustomerTicket) => void;
  onRate: (ticket: CustomerTicket) => void;
}

function TicketCard({ ticket, colors, onPress, onRate }: TicketCardProps) {
  const isResolved = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  const canRate = isResolved && ticket.rating === null;
  const agentLine = ticket.agent_first_name
    ? `${ticket.agent_first_name} is helping you`
    : "Waiting for an agent";

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(ticket)}>
      <Card style={styles.ticketCard}>
        {/* Header */}
        <View style={styles.ticketHeader}>
          <View style={styles.ticketHeaderLeft}>
            <Text style={[styles.ticketSubject, { color: colors.ink }]} numberOfLines={1}>
              {ticket.subject || `Ticket #${ticket.id}`}
            </Text>
            <Text style={[styles.ticketMeta, { color: colors.muted }]}>
              {CATEGORY_LABELS[ticket.category] ?? ticket.category} · Order #{ticket.order_id}
            </Text>
          </View>
          <Badge
            label={STATUS_LABEL[ticket.status] ?? ticket.status}
            variant={STATUS_VARIANT[ticket.status] ?? "neutral"}
          />
        </View>

        {/* Agent line */}
        <View style={[styles.agentRow, { borderTopColor: colors.border }]}>
          <Ionicons
            name={ticket.agent_first_name ? "person-circle-outline" : "time-outline"}
            size={14}
            color={ticket.agent_first_name ? colors.rose : colors.muted}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.agentText,
              { color: ticket.agent_first_name ? colors.rose : colors.muted },
            ]}
          >
            {agentLine}
          </Text>
          <Text style={[styles.ticketDate, { color: colors.muted }]}>
            {formatDate(ticket.created_at)}
          </Text>
        </View>

        {/* Rating row */}
        {isResolved && (
          <View style={[styles.ratingRow, { borderTopColor: colors.border }]}>
            {ticket.rating !== null ? (
              <View style={styles.ratedRow}>
                <Text style={[styles.ratedLabel, { color: colors.muted }]}>Your rating:</Text>
                <View style={styles.starsSmall}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name={s <= (ticket.rating ?? 0) ? "star" : "star-outline"}
                      size={14}
                      color="#F59E0B"
                    />
                  ))}
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.rateBtn, { borderColor: colors.rose }]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onRate(ticket);
                }}
              >
                <Ionicons name="star-outline" size={14} color={colors.rose} style={{ marginRight: 4 }} />
                <Text style={[styles.rateBtnText, { color: colors.rose }]}>Rate Support</Text>
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </View>
        )}

        {!isResolved && (
          <View style={[styles.ratingRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.tapHint, { color: colors.muted }]}>Tap to open chat</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerTicketsScreen() {
  const { colors } = useTheme();
  const { token } = useCustomerAuth();
  const router = useRouter();

  const [tickets, setTickets] = useState<CustomerTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rateTarget, setRateTarget] = useState<CustomerTicket | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchTickets = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get<CustomerTicket[]>("/customer/tickets", {
          headers: authHeader(token),
        });
        const sorted = [...res.data].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        );
        setTickets(sorted);
      } catch (err: any) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ── Open chat ──────────────────────────────────────────────────────────────

  const handlePress = (ticket: CustomerTicket) => {
    router.push(`/customer/tickets/${ticket.id}` as any);
  };

  // ── Rate ───────────────────────────────────────────────────────────────────

  const handleRate = (ticket: CustomerTicket) => {
    setRateTarget(ticket);
  };

  const handleSubmitRating = async (ticket: CustomerTicket, stars: number) => {
    if (!token) return;
    setSubmittingRating(true);
    try {
      await apiClient.post(
        `/customer/tickets/${ticket.id}/rate`,
        { rating: stars },
        { headers: authHeader(token) }
      );
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, rating: stars, rated_at: new Date().toISOString() } : t))
      );
      setRateTarget(null);
      Alert.alert("Thank you!", "Your rating has been submitted.");
    } catch (err: any) {
      Alert.alert("Rating failed", errorMessage(err));
    } finally {
      setSubmittingRating(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: CustomerTicket }) => (
    <TicketCard
      ticket={item}
      colors={colors}
      onPress={handlePress}
      onRate={handleRate}
    />
  );

  const openCount = tickets.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED").length;

  return (
    <Screen scrollable={false}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={[styles.screenTitle, { color: colors.ink }]}>My Tickets</Text>
        <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
          {tickets.length > 0
            ? `${openCount} open · ${tickets.length} total`
            : "Your support conversations"}
        </Text>
      </View>

      {/* Body */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.rose} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading tickets…</Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchTickets()} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No Tickets"
              description='Go to "My Orders" and tap "Need Help?" on any order to open a support ticket.'
              icon="💬"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTickets(true)}
              tintColor={colors.rose}
              colors={[colors.rose]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Star rating modal */}
      <StarRatingModal
        visible={rateTarget !== null}
        ticket={rateTarget}
        colors={colors}
        onClose={() => { if (!submittingRating) setRateTarget(null); }}
        onSubmit={handleSubmitRating}
        submitting={submittingRating}
      />
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageHeader: { marginTop: 4, marginBottom: 16 },
  screenTitle: { fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  screenSubtitle: { fontSize: 13, marginTop: 2 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14 },
  listContent: { paddingBottom: 32 },
  ticketCard: { marginBottom: 12, padding: 0, overflow: "hidden" },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 14,
    gap: 8,
  },
  ticketHeaderLeft: { flex: 1 },
  ticketSubject: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  ticketMeta: { fontSize: 12 },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  agentText: { fontSize: 13, fontWeight: "500", flex: 1 },
  ticketDate: { fontSize: 12 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ratedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratedLabel: { fontSize: 12, fontWeight: "500" },
  starsSmall: { flexDirection: "row", gap: 2 },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rateBtnText: { fontSize: 13, fontWeight: "600" },
  tapHint: { fontSize: 12 },
  // Rating modal
  ratingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  ratingSheet: {
    width: "100%",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  ratingTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  ratingSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  starsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  starBtn: { padding: 4 },
  ratingLabel: { fontSize: 16, fontWeight: "700", marginBottom: 24, height: 22 },
  ratingSubmitBtn: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingSubmitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  ratingCancelBtn: { paddingVertical: 8 },
  ratingCancelText: { fontSize: 14 },
});
