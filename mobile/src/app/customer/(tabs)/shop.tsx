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
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Button, ErrorState, EmptyState } from "../../../components";
import { useCustomerAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string | null;
}

// ─── Quantity Stepper Modal ───────────────────────────────────────────────────

interface BookModalProps {
  product: Product | null;
  colors: ReturnType<typeof useTheme>["colors"];
  visible: boolean;
  onClose: () => void;
  onConfirm: (product: Product, qty: number) => void;
  loading: boolean;
}

function BookModal({ product, colors, visible, onClose, onConfirm, loading }: BookModalProps) {
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (visible) setQty(1);
  }, [visible]);

  if (!product) return null;

  const total = (product.price * qty).toFixed(2);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.ink }]}>Book Product</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Product summary */}
          <View style={[styles.productSummary, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.productSummaryName, { color: colors.ink }]}>{product.name}</Text>
            <Text style={[styles.productSummaryPrice, { color: colors.rose }]}>
              ${product.price.toFixed(2)} / unit
            </Text>
          </View>

          {/* Quantity stepper */}
          <Text style={[styles.fieldLabel, { color: colors.ink }]}>Quantity</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
            >
              <Ionicons name="remove" size={20} color={qty <= 1 ? colors.muted : colors.ink} />
            </TouchableOpacity>
            <Text style={[styles.stepperValue, { color: colors.ink }]}>{qty}</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setQty((q) => Math.min(10, q + 1))}
              disabled={qty >= 10}
            >
              <Ionicons name="add" size={20} color={qty >= 10 ? colors.muted : colors.ink} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.stepperHint, { color: colors.muted }]}>Max 10 units per order</Text>

          {/* Total */}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.muted }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.rose }]}>${total}</Text>
          </View>

          <Button
            title={`Confirm Order — $${total}`}
            onPress={() => onConfirm(product, qty)}
            loading={loading}
            style={{ marginTop: 8 }}
          />
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            disabled={loading}
            style={{ marginTop: 4 }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  colors: ReturnType<typeof useTheme>["colors"];
  onBook: (product: Product) => void;
}

function ProductCard({ product, colors, onBook }: ProductCardProps) {
  return (
    <Card style={[styles.productCard, { borderColor: colors.border }]}>
      {/* Category icon area */}
      <View style={[styles.productIconBg, { backgroundColor: colors.rose + "18" }]}>
        <Text style={styles.productIcon}>📦</Text>
      </View>

      <Text style={[styles.productName, { color: colors.ink }]} numberOfLines={2}>
        {product.name}
      </Text>
      <Text style={[styles.productDesc, { color: colors.muted }]} numberOfLines={3}>
        {product.description}
      </Text>

      <View style={styles.productFooter}>
        <Text style={[styles.productPrice, { color: colors.rose }]}>
          ${product.price.toFixed(2)}
        </Text>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: colors.rose }]}
          onPress={() => onBook(product)}
          accessibilityLabel={`Book ${product.name}`}
        >
          <Text style={styles.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CustomerShopScreen() {
  const { colors } = useTheme();
  const { token } = useCustomerAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Book modal state
  const [bookTarget, setBookTarget] = useState<Product | null>(null);
  const [booking, setBooking] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchProducts = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<Product[]>("/products", {
          headers: authHeader(token),
        });
        setProducts(res.data);
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
    fetchProducts();
  }, [fetchProducts]);

  // ── Book ───────────────────────────────────────────────────────────────────

  const handleBook = (product: Product) => {
    setBookTarget(product);
  };

  const handleConfirmBook = async (product: Product, qty: number) => {
    if (!token) return;
    setBooking(true);
    try {
      await apiClient.post(
        "/orders",
        { product_id: product.id, quantity: qty },
        { headers: authHeader(token) }
      );
      setBookTarget(null);
      Alert.alert(
        "Order Placed!",
        `You've booked ${qty} × ${product.name}.\nHead to My Orders to track your purchase.`,
        [{ text: "View My Orders" }, { text: "Keep Shopping" }]
      );
    } catch (err: any) {
      Alert.alert("Booking failed", errorMessage(err));
    } finally {
      setBooking(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: Product }) => (
    <ProductCard product={item} colors={colors} onBook={handleBook} />
  );

  return (
    <Screen scrollable={false}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <Text style={[styles.screenTitle, { color: colors.ink }]}>Shop</Text>
        <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
          {products.length > 0 ? `${products.length} products available` : "Browse our products"}
        </Text>
      </View>

      {/* Body */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.rose} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading products…</Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchProducts()} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No Products"
              description="No products available right now. Check back soon."
              icon="🛍️"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProducts(true)}
              tintColor={colors.rose}
              colors={[colors.rose]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Book modal */}
      <BookModal
        product={bookTarget}
        colors={colors}
        visible={bookTarget !== null}
        onClose={() => { if (!booking) setBookTarget(null); }}
        onConfirm={handleConfirmBook}
        loading={booking}
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
  productCard: {
    marginBottom: 14,
    padding: 0,
    overflow: "hidden",
  },
  productIconBg: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  productIcon: {
    fontSize: 32,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingTop: 12,
    lineHeight: 22,
  },
  productDesc: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 12,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "700",
  },
  bookBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 10,
  },
  bookBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  productSummary: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  productSummaryName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  productSummaryPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 6,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperValue: {
    fontSize: 28,
    fontWeight: "700",
    minWidth: 40,
    textAlign: "center",
  },
  stepperHint: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "700",
  },
});
