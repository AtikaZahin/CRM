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
import { Screen, Card, TextField, ErrorState, EmptyState } from "../../../components";
import { useStaffAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

export interface CustomerItem {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  created_at?: string;
}

export default function StaffCustomersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { token, user } = useStaffAuth();

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<CustomerItem[]>("/customers", {
        headers: authHeader(token),
      });
      setCustomers(res.data || []);
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [token]);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  });

  const renderCustomerItem = ({ item }: { item: CustomerItem }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/staff/customers/${item.id}` as any)}
      >
        <Card style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.blush }]}>
              <Text style={[styles.avatarText, { color: colors.rose }]}>
                {item.name ? item.name.charAt(0).toUpperCase() : "C"}
              </Text>
            </View>
            <View style={styles.infoContainer}>
              <Text style={[styles.customerName, { color: colors.ink }]}>
                {item.name}
              </Text>
              <Text style={[styles.customerEmail, { color: colors.muted }]}>
                {item.email}
              </Text>
              {item.phone && (
                <Text style={[styles.customerPhone, { color: colors.muted }]}>
                  📞 {item.phone}
                </Text>
              )}
            </View>
            <Text style={[styles.arrowText, { color: colors.rose }]}>→</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Screen scrollable={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.ink }]}>Customers</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {user?.role === "ADMIN"
            ? "Directory of all registered customer accounts"
            : user?.role === "LEAD"
            ? "Customers associated with your team's tickets"
            : "Customers assigned to your support tickets"}
        </Text>
      </View>

      <TextField
        placeholder="Search by name, email, or phone..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        containerStyle={{ marginBottom: 12 }}
      />

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.rose} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Loading customer accounts...
          </Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchCustomers()} />
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCustomerItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchCustomers(true)}
              tintColor={colors.rose}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={searchQuery ? "No matching customers" : "No customers found"}
              description={
                searchQuery
                  ? "Try searching with a different term."
                  : "No customer accounts are currently assigned to your scope."
              }
              icon="👥"
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
  customerCard: {
    padding: 16,
    marginVertical: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  infoContainer: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 13,
  },
  customerPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
});
