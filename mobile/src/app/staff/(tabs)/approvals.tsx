import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, EmptyState, ErrorState } from "../../../components";
import { useStaffAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PermissionRequest {
  id: number;
  requested_by_id: number;
  requested_by_name: string | null;
  requested_by_email: string | null;
  target_user_id: number;
  target_user_name: string | null;
  target_user_email: string | null;
  action_type: "DELETE" | "UPDATE";
  payload: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  review_note: string | null;
  reviewed_by_id: number | null;
  created_at: string | null;
  reviewed_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parsePayload(raw: string | null): string {
  if (!raw) return "";
  try {
    const obj = JSON.parse(raw);
    return Object.entries(obj)
      .filter(([k]) => k !== "password") // hide password value
      .map(([k, v]) => {
        if (k === "password") return `${k}: ••••••`;
        if (typeof v === "boolean") return `${k}: ${v ? "yes" : "no"}`;
        return `${k}: ${v}`;
      })
      .join("\n");
  } catch {
    return raw;
  }
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

interface ReviewModalProps {
  visible: boolean;
  request: PermissionRequest | null;
  colors: ReturnType<typeof useTheme>["colors"];
  saving: boolean;
  onClose: () => void;
  onSubmit: (decision: "APPROVED" | "REJECTED", note: string) => void;
}

function ReviewModal({
  visible,
  request,
  colors,
  saving,
  onClose,
  onSubmit,
}: ReviewModalProps) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) setNote("");
  }, [visible]);

  if (!request) return null;

  const isDelete = request.action_type === "DELETE";
  const changes = parsePayload(request.payload);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.ink }]}>
                Review Request
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Action badge */}
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.actionBadge,
                  {
                    backgroundColor: isDelete
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(59,130,246,0.12)",
                  },
                ]}
              >
                <Ionicons
                  name={isDelete ? "trash-outline" : "create-outline"}
                  size={14}
                  color={isDelete ? "#ef4444" : "#3b82f6"}
                />
                <Text
                  style={[
                    styles.actionBadgeText,
                    { color: isDelete ? "#ef4444" : "#3b82f6" },
                  ]}
                >
                  {isDelete ? "DELETE" : "UPDATE"}
                </Text>
              </View>
            </View>

            {/* Info rows */}
            <View
              style={[styles.infoBox, { backgroundColor: colors.bg, borderColor: colors.border }]}
            >
              <InfoRow
                label="Requested by"
                value={
                  request.requested_by_name || request.requested_by_email || `#${request.requested_by_id}`
                }
                colors={colors}
              />
              <InfoRow
                label="Target staff"
                value={
                  request.target_user_name || request.target_user_email || `#${request.target_user_id}`
                }
                colors={colors}
              />
              <InfoRow label="Submitted" value={formatDate(request.created_at)} colors={colors} />
              {!isDelete && changes ? (
                <InfoRow label="Changes" value={changes} mono colors={colors} />
              ) : null}
            </View>

            {/* Note input */}
            <Text style={[styles.noteLabel, { color: colors.muted }]}>
              Review note (optional)
            </Text>
            <TextInput
              style={[
                styles.noteInput,
                {
                  color: colors.ink,
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Add a note for the requester…"
              placeholderTextColor={colors.muted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.rejectBtn, { borderColor: "#ef4444" }]}
                onPress={() => onSubmit("REJECTED", note)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                    <Text style={[styles.rejectBtnText]}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.approveBtn, { backgroundColor: colors.rose }]}
                onPress={() => onSubmit("APPROVED", note)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({
  label,
  value,
  mono,
  colors,
}: {
  label: string;
  value: string;
  mono?: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text
        style={[
          styles.infoValue,
          { color: colors.ink },
          mono && styles.monoText,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  req,
  colors,
  onReview,
}: {
  req: PermissionRequest;
  colors: ReturnType<typeof useTheme>["colors"];
  onReview?: () => void;
}) {
  const isDelete = req.action_type === "DELETE";
  const isPending = req.status === "PENDING";
  const isApproved = req.status === "APPROVED";

  return (
    <Card style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        {/* Action type icon */}
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isDelete
                ? "rgba(239,68,68,0.12)"
                : "rgba(59,130,246,0.12)",
            },
          ]}
        >
          <Ionicons
            name={isDelete ? "trash-outline" : "create-outline"}
            size={18}
            color={isDelete ? "#ef4444" : "#3b82f6"}
          />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>
            {isDelete ? "Delete" : "Update"}{" "}
            <Text style={{ fontWeight: "800" }}>
              {req.target_user_name || req.target_user_email || `#${req.target_user_id}`}
            </Text>
          </Text>
          <Text style={[styles.cardSub, { color: colors.muted }]}>
            by {req.requested_by_name || req.requested_by_email || `#${req.requested_by_id}`}
          </Text>
        </View>

        {/* Status badge */}
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isPending
                ? "rgba(245,158,11,0.14)"
                : isApproved
                ? "rgba(16,185,129,0.14)"
                : "rgba(239,68,68,0.14)",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: isPending ? "#d97706" : isApproved ? "#10b981" : "#ef4444",
              },
            ]}
          >
            {req.status}
          </Text>
        </View>
      </View>

      {/* Change preview */}
      {!isDelete && req.payload && (
        <View style={[styles.changesBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.changesText, { color: colors.muted }]}>
            {parsePayload(req.payload)}
          </Text>
        </View>
      )}

      {/* Meta row */}
      <Text style={[styles.metaText, { color: colors.muted }]}>
        {formatDate(req.created_at)}
        {req.review_note ? ` · Note: ${req.review_note}` : ""}
      </Text>

      {/* Review button (only for pending) */}
      {isPending && onReview && (
        <TouchableOpacity
          style={[styles.reviewBtn, { backgroundColor: colors.rose }]}
          onPress={onReview}
          activeOpacity={0.8}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
          <Text style={styles.reviewBtnText}>Review</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type FilterTab = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function ApprovalsScreen() {
  const { colors } = useTheme();
  const { user, token } = useStaffAuth();

  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("PENDING");

  const [selectedReq, setSelectedReq] = useState<PermissionRequest | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRequests = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<PermissionRequest[]>("/permission-requests", {
          headers: authHeader(token),
        });
        setRequests(res.data);
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
    fetchRequests();
  }, [fetchRequests]);

  const handleReview = async (decision: "APPROVED" | "REJECTED", note: string) => {
    if (!selectedReq || !token) return;
    setSaving(true);
    try {
      await apiClient.patch(
        `/permission-requests/${selectedReq.id}`,
        { decision, review_note: note || null },
        { headers: authHeader(token) }
      );
      setReviewModalOpen(false);
      setSelectedReq(null);
      fetchRequests(true);
      Alert.alert(
        decision === "APPROVED" ? "✅ Approved" : "❌ Rejected",
        decision === "APPROVED"
          ? "The action has been executed successfully."
          : "The request has been rejected."
      );
    } catch (err: any) {
      Alert.alert("Error", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Only admins see this screen
  if (user?.role !== "ADMIN") {
    return (
      <Screen>
        <EmptyState
          title="Access Restricted"
          description="Only admins can view and manage permission requests."
        />
      </Screen>
    );
  }

  const filtered =
    filter === "ALL"
      ? requests
      : requests.filter((r) => r.status === filter);

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  const TABS: FilterTab[] = ["PENDING", "APPROVED", "REJECTED", "ALL"];

  return (
    <Screen scrollable={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerLabel, { color: colors.muted }]}>Staff Management</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.headerTitle, { color: colors.ink }]}>Approvals</Text>
            {pendingCount > 0 && (
              <View style={[styles.pendingBadge, { backgroundColor: colors.rose }]}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => fetchRequests(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh-outline" size={22} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const count = tab === "ALL" ? requests.length : requests.filter((r) => r.status === tab).length;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                filter === tab && { borderBottomColor: colors.rose, borderBottomWidth: 2 },
              ]}
              onPress={() => setFilter(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: filter === tab ? colors.rose : colors.muted },
                ]}
              >
                {tab}
                {count > 0 ? ` (${count})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.rose} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading requests…</Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchRequests()} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRequests(true)}
              tintColor={colors.rose}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No requests"
              description={
                filter === "PENDING"
                  ? "No pending permission requests at the moment."
                  : `No ${filter.toLowerCase()} requests found.`
              }
            />
          }
          renderItem={({ item }) => (
            <RequestCard
              req={item}
              colors={colors}
              onReview={
                item.status === "PENDING"
                  ? () => {
                      setSelectedReq(item);
                      setReviewModalOpen(true);
                    }
                  : undefined
              }
            />
          )}
        />
      )}

      {/* Review modal */}
      <ReviewModal
        visible={reviewModalOpen}
        request={selectedReq}
        colors={colors}
        saving={saving}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedReq(null);
        }}
        onSubmit={handleReview}
      />
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  pendingBadge: {
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: "center",
  },
  pendingBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  list: {
    paddingBottom: 32,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  // Card styles
  card: {
    padding: 16,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  changesBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  changesText: {
    fontSize: 12,
    lineHeight: 18,
  },
  metaText: {
    fontSize: 11,
    marginTop: 2,
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  reviewBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  actionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  infoRow: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  monoText: {
    fontFamily: "monospace" as const,
    fontSize: 12,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  noteInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 13,
  },
  rejectBtnText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 15,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 13,
  },
  approveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
