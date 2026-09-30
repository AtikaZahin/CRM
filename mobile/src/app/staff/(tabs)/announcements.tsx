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
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Button, ErrorState, EmptyState } from "../../../components";
import { useStaffAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Announcement {
  id: number;
  title: string;
  content: string;
  author_id: number;
  created_at?: string;
  updated_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
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

// ─── Compose Modal ────────────────────────────────────────────────────────────

interface ComposeModalProps {
  visible: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
  initialTitle?: string;
  initialContent?: string;
  mode: "create" | "edit";
  saving: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => void;
}

function ComposeModal({
  visible,
  colors,
  initialTitle = "",
  initialContent = "",
  mode,
  saving,
  onClose,
  onSubmit,
}: ComposeModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  // Reset fields when modal opens with new data
  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setContent(initialContent);
    }
  }, [visible, initialTitle, initialContent]);

  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          {/* Handle bar */}
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          {/* Title bar */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.ink }]}>
              {mode === "create" ? "New Announcement" : "Edit Announcement"}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title field */}
            <Text style={[styles.fieldLabel, { color: colors.ink }]}>Title *</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.ink,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Announcement title"
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
              maxLength={200}
            />

            {/* Content field */}
            <Text style={[styles.fieldLabel, { color: colors.ink }]}>Content *</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                {
                  color: colors.ink,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Write your announcement here…"
              placeholderTextColor={colors.muted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={2000}
            />
            <Text style={[styles.charCount, { color: colors.muted }]}>
              {content.length} / 2000
            </Text>

            <Button
              title={mode === "create" ? "Post Announcement" : "Save Changes"}
              onPress={() => onSubmit(title, content)}
              disabled={!canSubmit}
              loading={saving}
              style={styles.submitButton}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StaffAnnouncementsScreen() {
  const { colors } = useTheme();
  const { token, user } = useStaffAuth();

  const isAdmin = user?.role === "ADMIN";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compose modal state
  const [composeVisible, setComposeVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAnnouncements = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await apiClient.get<Announcement[]>("/announcements", {
          headers: authHeader(token),
        });
        // Newest first (server already does this, but defensive)
        const sorted = [...res.data].sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
        );
        setAnnouncements(sorted);
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
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // ── Long-press action sheet ────────────────────────────────────────────────

  const handleLongPress = (item: Announcement) => {
    Alert.alert(item.title, "What would you like to do?", [
      {
        text: "✏️  Edit",
        onPress: () => {
          setEditTarget(item);
          setComposeVisible(true);
        },
      },
      {
        text: "🗑️  Delete",
        style: "destructive",
        onPress: () => confirmDelete(item),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const confirmDelete = (item: Announcement) => {
    Alert.alert(
      "Delete Announcement",
      `Are you sure you want to delete "${item.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => doDelete(item.id),
        },
      ]
    );
  };

  const doDelete = async (id: number) => {
    if (!token) return;
    try {
      await apiClient.delete(`/announcements/${id}`, {
        headers: authHeader(token),
      });
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      Alert.alert("Delete failed", errorMessage(err));
    }
  };

  // ── Create / Edit submit ───────────────────────────────────────────────────

  const handleSubmit = async (title: string, content: string) => {
    if (!token) return;
    setSaving(true);
    try {
      if (editTarget) {
        const res = await apiClient.put<Announcement>(
          `/announcements/${editTarget.id}`,
          { title: title.trim(), content: content.trim() },
          { headers: authHeader(token) }
        );
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === editTarget.id ? res.data : a))
        );
      } else {
        const res = await apiClient.post<Announcement>(
          "/announcements",
          { title: title.trim(), content: content.trim() },
          { headers: authHeader(token) }
        );
        // Prepend newest first
        setAnnouncements((prev) => [res.data, ...prev]);
      }
      setComposeVisible(false);
      setEditTarget(null);
    } catch (err: any) {
      Alert.alert("Save failed", errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    if (saving) return;
    setComposeVisible(false);
    setEditTarget(null);
  };

  // ── Render item ────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: Announcement }) => (
    <TouchableOpacity
      activeOpacity={isAdmin ? 0.75 : 1}
      onLongPress={isAdmin ? () => handleLongPress(item) : undefined}
      delayLongPress={400}
    >
      <Card style={[styles.announcementCard, { borderLeftColor: colors.rose }]}>
        {/* Card header: icon + title + date */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.announcementIcon,
              { backgroundColor: colors.rose + "20" },
            ]}
          >
            <Text style={styles.iconText}>📢</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text
              style={[styles.announcementTitle, { color: colors.ink }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={[styles.announcementDate, { color: colors.muted }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          {isAdmin && (
            <Ionicons
              name="ellipsis-vertical"
              size={16}
              color={colors.muted}
              style={styles.ellipsis}
            />
          )}
        </View>

        {/* Content */}
        <Text style={[styles.announcementContent, { color: colors.ink + "CC" }]}>
          {item.content}
        </Text>

        {/* Edited label */}
        {item.updated_at && item.updated_at !== item.created_at && (
          <Text style={[styles.updatedLabel, { color: colors.muted }]}>
            Edited {formatDate(item.updated_at)}
          </Text>
        )}

        {/* Hint for admins */}
        {isAdmin && (
          <Text style={[styles.longPressHint, { color: colors.muted }]}>
            Hold to edit or delete
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Screen scrollable={false}>
      {/* ── Page header ── */}
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderText}>
          <Text style={[styles.screenTitle, { color: colors.ink }]}>
            Announcements
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
            {isAdmin
              ? "Manage company announcements"
              : "Company updates from your team"}
          </Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.rose }]}
            onPress={() => {
              setEditTarget(null);
              setComposeVisible(true);
            }}
            accessibilityLabel="Create new announcement"
          >
            <Ionicons name="add" size={26} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Body ── */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.rose} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Loading announcements…
          </Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchAnnouncements()} />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No Announcements"
              description={
                isAdmin
                  ? "Tap + to post your first announcement."
                  : "No announcements yet. Check back later."
              }
              icon="📢"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAnnouncements(true)}
              tintColor={colors.rose}
              colors={[colors.rose]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Compose / Edit modal ── */}
      <ComposeModal
        visible={composeVisible}
        colors={colors}
        mode={editTarget ? "edit" : "create"}
        initialTitle={editTarget?.title ?? ""}
        initialContent={editTarget?.content ?? ""}
        saving={saving}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 4,
    marginBottom: 16,
  },
  pageHeaderText: {
    flex: 1,
    marginRight: 12,
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
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
  announcementCard: {
    marginBottom: 14,
    borderLeftWidth: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  announcementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  iconText: {
    fontSize: 18,
  },
  cardHeaderText: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  announcementDate: {
    fontSize: 12,
    marginTop: 2,
  },
  ellipsis: {
    marginLeft: 8,
    marginTop: 2,
  },
  announcementContent: {
    fontSize: 14,
    lineHeight: 21,
  },
  updatedLabel: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: "italic",
  },
  longPressHint: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: "italic",
    opacity: 0.7,
  },
  // ── Modal styles ──
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
    maxHeight: "90%",
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 4,
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
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 4,
    marginBottom: 8,
  },
});
