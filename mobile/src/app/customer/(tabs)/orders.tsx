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
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Badge, Button, ErrorState, EmptyState } from "../../../components";
import { useCustomerAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id: number;
  product_id: number;
  quantity: number;
  status: "PLACED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  open_ticket_id: number | null;
  created_at?: string;
  product?: Product;
}

interface Product {
  id: number;
  name: string;
  price: number;
}

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, "neutral" | "blue" | "purple" | "rose" | "emerald" | "danger"> = {
  PLACED: "blue",
  SHIPPED: "purple",
  DELIVERED: "emerald",
  CANCELLED: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  PLACED: "Placed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const TICKET_CATEGORIES = [
  { value: "DAMAGED", label: "Damaged Item" },
  { value: "LATE_DELIVERY", label: "Late Delivery" },
  { value: "WRONG_ITEM", label: "Wrong Item" },
  { value: "CANCEL_REFUND", label: "Refund Request" },
  { value: "OTHER", label: "General Issue" },
];

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ─── Help Ticket Modal ────────────────────────────────────────────────────────

interface HelpModalProps {
  visible: boolean;
  order: Order | null;
  colors: ReturnType<typeof useTheme>["colors"];
  onClose: () => void;
  onSubmit: (order: Order, category: string, subject: string, message: string) => void;
  submitting: boolean;
}

function HelpModal({ visible, order, colors, onClose, onSubmit, submitting }: HelpModalProps) {
  const [category, setCategory] = useState("DAMAGED");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (visible) {
      setCategory("DAMAGED");
      setSubject("");
      setMessage("");
    }
  }, [visible]);

  if (!order) return null;

  const canSubmit = message.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.ink }]}>Need Help?</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Order ref */}
            <Text style={[styles.orderRef, { color: colors.muted }]}>
              Order #{order.id} · {order.quantity} unit{order.quantity > 1 ? "s" : ""}
            </Text>

            {/* Category picker */}
            <Text style={[styles.fieldLabel, { color: colors.ink }]}>Issue Type *</Text>
            <View style={styles.categoryGrid}>
              {TICKET_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor:
                        category === cat.value ? colors.rose : colors.background,
                      borderColor: category === cat.value ? colors.rose : colors.border,
                    },
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: category === cat.value ? "#fff" : colors.ink },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subject (optional) */}
            <Text style={[styles.fieldLabel, { color: colors.ink }]}>
              Subject <Text style={{ color: colors.muted }}>(optional)</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { color: colors.ink, backgroundColor: colors.background, borderColor: colors.border },
              ]}
              placeholder="Brief summary of your issue"
              placeholderTextColor={colors.muted}
              value={subject}
              onChangeText={setSubject}
              maxLength={200}
              returnKeyType="next"
            />

            {/* Message */}
            <Text style={[styles.fieldLabel, { color: colors.ink }]}>Message *</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                { color: colors.ink, backgroundColor: colors.background, borderColor: colors.border },
              ]}
              placeholder="Describe your issue in detail…"
              placeholderTextColor={colors.muted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
            />

            <Button
              title="Submit Ticket"
              onPress={() => onSubmit(order, category, subject, message)}
              disabled={!canSubmit}
              loading={submitting}
              style={{ marginTop: 8 }}
            />
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              disabled={submitting}
              style={{ marginTop: 4, marginBottom: 8 }}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order;
  productMap: Record<number, Product>;
  colors: ReturnType<typeof useTheme>["colors"];
  onCancel: (order: Order) => void;
  onNeedHelp: (order: Order) => void;
  onViewTicket: (ticketId: number) => void;
}

function OrderCard({ order, productMap, colors, onCancel, onNeedHelp, onViewTicket }: OrderCardProps) {
  const product = productMap[order.product_id];
  const canCancel = order.status === "PLACED";
  const isCancelled = order.status === "CANCELLED";

  return (
    <Card style={[styles.orderCard, isCancelled && { opacity: 0.65 }]}>
      {/* Header row: Order # + status */}
      <View style={styles.orderHeader}>
        <View>
          <Text style={[styles.orderId, { color: colors.ink }]}>Order #{order.id}</Text>
          <Text style={[styles.orderDate, { color: colors.muted }]}>{formatDate(order.created_at)}</Text>
        </View>
        <Badge label={STATUS_LABEL[order.status] ?? order.status} variant={STATUS_VARIANT[order.status]} />
      </View>

      {/* Product info */}
      <View style={[styles.productRow, { borderTopColor: colors.border }]}>
        <View style={[styles.productBadge, { backgroundColor: colors.rose + "18" }]}>
          <Text style={styles.productBadgeIcon}>📦</Text>
        </View>
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.ink }]} numberOfLines={1}>
            {product?.name ?? `Product #${order.product_id}`}
          </Text>
          <Text style={[styles.productMeta, { color: colors.muted }]}>
            Qty: {order.quantity}
            {product ? `  ·  $${(product.price * order.quantity).toFixed(2)}` : ""}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      {!isCancelled && (
        <View style={styles.actionRow}>
          {canCancel && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.danger }]}
              onPress={() => onCancel(order)}
            >
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>Cancel</Text>
            </TouchableOpacity>
          )}

          {order.open_ticket_id ? (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.rose, flex: 1, marginLeft: canCancel ? 8 : 0 }]}
              onPress={() => onViewTicket(order.open_ticket_id!)}
            >
              <Ionicons name="chatbubble-outline" size={14} color={colors.rose} style={{ marginRight: 4 }} />
              <Text style={[styles.actionBtnText, { color: colors.rose }]}>View Conversation</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.rose, flex: 1, marginLeft: canCancel ? 8 : 0 }]}
              onPress={() => onNeedHelp(order)}
            >
              <Ionicons name="help-circle-outline" size={14} color={colors.rose} style={{ marginRight: 4 }} />
              <Text style={[styles.actionBtnText, { color: colors.rose }]}>Need Help?</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerOrdersScreen() {
  const { colors } = useTheme();
  const { token } = useCustomerAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [productMap, setProductMap] = useState<Record<number, Product>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Help modal
  const [helpTarget, setHelpTarget] = useState<Order | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Cancel in-flight
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchOrders = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const [ordersRes, productsRes] = await Promise.all([
          apiClient.get<Order[]>("/orders/me", { headers: authHeader(token) }),
          apiClient.get<Product[]>("/products", { headers: authHeader(token) }),
        ]);

        // Sort newest first
        const sorted = [...ordersRes.data].sort(
          (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
        );
        setOrders(sorted);

        const pmap: Record<number, Product> = {};
        productsRes.data.forEach((p) => { pmap[p.id] = p; });
        setProductMap(pmap);
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
    fetchOrders();
  }, [fetchOrders]);

  // ── Cancel ─────────────────────────────────────────────────────────────────

  const handleCancel = (order: Order) => {
    Alert.alert(
      "Cancel Order",
      `Cancel Order #${order.id}? This cannot be undone.`,
      [
        { text: "Keep Order", style: "cancel" },
        {
          text: "Cancel Order",
          style: "destructive",
          onPress: () => doCancel(order),
        },
      ]
    );
  };

  const doCancel = async (order: Order) => {
    if (!token) return;
    setCancellingId(order.id);
    try {
      await apiClient.post(`/orders/${order.id}/cancel`, {}, { headers: authHeader(token) });
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "CANCELLED" } : o))
      );
    } catch (err: any) {
      Alert.alert("Cancel failed", errorMessage(err));
    } finally {
      setCancellingId(null);
    }
  };

  // ── Need Help ──────────────────────────────────────────────────────────────

  const handleNeedHelp = (order: Order) => {
    setHelpTarget(order);
  };

  const handleSubmitTicket = async (
    order: Order,
    category: string,
    subject: string,
    message: string
  ) => {
    if (!token) return;
    setSubmittingTicket(true);
    try {
      const payload: any = {
        order_id: order.id,
        category,
        message: message.trim(),
      };
      if (subject.trim()) payload.subject = subject.trim();

      const res = await apiClient.post<{ id: number }>(
        "/customer/tickets",
        payload,
        { headers: authHeader(token) }
      );

      // Update order's open_ticket_id in list
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, open_ticket_id: res.data.id } : o
        )
      );
      setHelpTarget(null);
      Alert.alert(
        "Ticket Submitted",
        "Our support team has been notified. You'll see the conversation in 'My Tickets'.",
        [{ text: "OK" }]
      );
    } catch (err: any) {
      Alert.alert("Failed to submit ticket", errorMessage(err));
    } finally {
      setSubmittingTicket(false);
    }
  };

  // ── View Ticket ────────────────────────────────────────────────────────────

  const handleViewTicket = (ticketId: number) => {
    router.push(`/customer/tickets/${ticketId}` as any);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: Order }) => (
    <OrderCard
      order={item}
      productMap={productMap}
      colors={colors}
      onCancel={handleCancel}
      onNeedHelp={handleNeedHelp}
      onViewTicket={handleViewTicket}
    />
  );

  return (
    <Screen scrollable={false}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={[styles.screenTitle, { color: colors.ink }]}>My Orders</Text>
        <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
          {orders.length > 0
            ? `${orders.filter((o) => o.status !== "CANCELLED").length} active order${orders.filter((o) => o.status !== "CANCELLED").length !== 1 ? "s" : ""}`
            : "Your order history"}
        </Text>
      </View>

      {/* Body */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.rose} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading your orders…</Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchOrders()} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No Orders Yet"
              description="Head to the Shop tab to book your first product."
              icon="🛒"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOrders(true)}
              tintColor={colors.rose}
              colors={[colors.rose]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Help modal */}
      <HelpModal
        visible={helpTarget !== null}
        order={helpTarget}
        colors={colors}
        onClose={() => { if (!submittingTicket) setHelpTarget(null); }}
        onSubmit={handleSubmitTicket}
        submitting={submittingTicket}
      />
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageHeader: {
    marginTop: 4,
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
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
  listContent: {
    paddingBottom: 32,
  },
  orderCard: {
    marginBottom: 14,
    padding: 0,
    overflow: "hidden",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    paddingBottom: 12,
  },
  orderId: {
    fontSize: 15,
    fontWeight: "700",
  },
  orderDate: {
    fontSize: 12,
    marginTop: 2,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  productBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  productBadgeIcon: {
    fontSize: 18,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
  },
  productMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 90,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  orderRef: {
    fontSize: 13,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 4,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },
});
