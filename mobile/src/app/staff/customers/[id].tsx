import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, Badge, Button, ErrorState, EmptyState } from "../../../components";
import { useStaffAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

interface OrderItem {
  id: number;
  customer_id: number;
  product_id: number;
  quantity: number;
  status: "PLACED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  created_at?: string;
}

interface TicketItem {
  id: number;
  order_id: number;
  subject: string;
  category: string;
  status: string;
  created_at?: string;
}

interface CustomerDetail {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  orders?: OrderItem[];
  tickets?: TicketItem[];
}

export default function StaffCustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { token } = useStaffAuth();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const customerId = parseInt(id || "0", 10);

  const fetchCustomer = async () => {
    if (!token || !customerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<CustomerDetail>(
        `/customers/${customerId}`,
        { headers: authHeader(token) }
      );
      setCustomer(res.data);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [token, customerId]);

  const handleUpdateOrderStatus = async (
    orderId: number,
    newStatus: "SHIPPED" | "DELIVERED" | "CANCELLED"
  ) => {
    if (!token) return;
    setUpdatingOrderId(orderId);
    setActionError(null);

    try {
      await apiClient.patch(
        `/orders/${orderId}/status`,
        { status: newStatus },
        { headers: authHeader(token) }
      );
      await fetchCustomer();
    } catch (err: any) {
      setActionError(errorMessage(err));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getOrderStatusVariant = (status: string) => {
    switch (status) {
      case "SHIPPED":
        return "purple";
      case "DELIVERED":
        return "emerald";
      case "CANCELLED":
        return "danger";
      case "PLACED":
      default:
        return "blue";
    }
  };

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <Text style={[styles.backText, { color: colors.rose }]}>← Back to Customers</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.rose} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchCustomer} />
      ) : customer ? (
        <View style={styles.content}>
          {/* PROFILE CARD */}
          <Card style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.blush }]}>
                <Text style={[styles.avatarText, { color: colors.rose }]}>
                  {customer.name ? customer.name.charAt(0).toUpperCase() : "C"}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.customerName, { color: colors.ink }]}>
                  {customer.name}
                </Text>
                <Text style={[styles.customerEmail, { color: colors.muted }]}>
                  {customer.email}
                </Text>
                {customer.phone && (
                  <Text style={[styles.customerPhone, { color: colors.muted }]}>
                    📞 {customer.phone}
                  </Text>
                )}
              </View>
            </View>
          </Card>

          {actionError && <ErrorState message={actionError} style={{ marginVertical: 8 }} />}

          {/* ORDERS SECTION */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.rose }]}>
              CUSTOMER ORDERS ({customer.orders?.length || 0})
            </Text>

            {!customer.orders || customer.orders.length === 0 ? (
              <EmptyState title="No orders found" description="This customer has no orders yet." icon="📦" />
            ) : (
              customer.orders.map((order) => {
                const isUpdating = updatingOrderId === order.id;
                return (
                  <Card key={order.id} style={styles.orderCard}>
                    <View style={styles.orderRow}>
                      <View>
                        <Text style={[styles.orderTitle, { color: colors.ink }]}>
                          Order #{order.id}
                        </Text>
                        <Text style={[styles.orderSub, { color: colors.muted }]}>
                          Product ID #{order.product_id} · Qty: {order.quantity}
                        </Text>
                      </View>
                      <Badge
                        label={order.status}
                        variant={getOrderStatusVariant(order.status)}
                      />
                    </View>

                    {/* STATUS ACTION BUTTONS */}
                    {order.status === "PLACED" && (
                      <View style={styles.orderActions}>
                        <Button
                          title="Mark Shipped"
                          onPress={() => handleUpdateOrderStatus(order.id, "SHIPPED")}
                          variant="primary"
                          loading={isUpdating}
                          disabled={isUpdating}
                          style={styles.orderBtn}
                        />
                        <Button
                          title="Cancel Order"
                          onPress={() => handleUpdateOrderStatus(order.id, "CANCELLED")}
                          variant="danger"
                          loading={isUpdating}
                          disabled={isUpdating}
                          style={styles.orderBtn}
                        />
                      </View>
                    )}

                    {order.status === "SHIPPED" && (
                      <View style={styles.orderActions}>
                        <Button
                          title="Mark Delivered"
                          onPress={() => handleUpdateOrderStatus(order.id, "DELIVERED")}
                          variant="primary"
                          loading={isUpdating}
                          disabled={isUpdating}
                          style={styles.orderBtn}
                        />
                      </View>
                    )}
                  </Card>
                );
              })
            )}
          </View>

          {/* TICKETS SECTION */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.rose }]}>
              CUSTOMER TICKETS ({customer.tickets?.length || 0})
            </Text>

            {!customer.tickets || customer.tickets.length === 0 ? (
              <EmptyState title="No support tickets" description="This customer has no support tickets." icon="🎧" />
            ) : (
              customer.tickets.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/staff/tickets/${t.id}` as any)}
                >
                  <Card style={styles.ticketCard}>
                    <View style={styles.orderRow}>
                      <Text style={[styles.ticketId, { color: colors.rose }]}>
                        #{t.id}
                      </Text>
                      <Badge
                        label={t.status}
                        variant={t.status === "RESOLVED" ? "emerald" : "purple"}
                      />
                    </View>
                    <Text style={[styles.ticketSubject, { color: colors.ink }]}>
                      {t.subject}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  backButton: {
    marginBottom: 14,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
  },
  centerContainer: {
    padding: 40,
    alignItems: "center",
  },
  content: {
    gap: 16,
  },
  profileCard: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
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
  profileInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 14,
  },
  customerPhone: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  orderCard: {
    padding: 16,
    marginVertical: 6,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  orderSub: {
    fontSize: 13,
    marginTop: 2,
  },
  orderActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e7e4f2",
  },
  orderBtn: {
    flex: 1,
    marginVertical: 0,
    height: 38,
  },
  ticketCard: {
    padding: 14,
    marginVertical: 6,
  },
  ticketId: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  ticketSubject: {
    fontSize: 14.5,
    fontWeight: "600",
    marginTop: 6,
  },
});
