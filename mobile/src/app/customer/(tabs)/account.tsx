import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Card, Button } from "../../../components";
import { useCustomerAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

export default function CustomerAccountScreen() {
  const { colors } = useTheme();
  const { user, token, logout, refreshUser } = useCustomerAuth();
  const router = useRouter();

  // Profile Form State
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  // ── Save Profile ────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!token) return;
    if (!name.trim()) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }

    setSavingProfile(true);
    try {
      await apiClient.patch(
        "/customer/me",
        { name: name.trim(), phone: phone.trim() },
        { headers: authHeader(token) }
      );
      await refreshUser();
      Alert.alert("Profile Updated", "Your information has been saved.");
    } catch (err: any) {
      Alert.alert("Update Failed", errorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change Password ─────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!token) return;
    if (!currentPassword) {
      Alert.alert("Required", "Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Invalid Password", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New password and confirmation do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await apiClient.post(
        "/customer/me/password",
        { current_password: currentPassword, new_password: newPassword },
        { headers: authHeader(token) }
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Your password has been changed successfully.");
    } catch (err: any) {
      Alert.alert("Password Change Failed", errorMessage(err));
    } finally {
      setUpdatingPassword(false);
    }
  };

  // ── Log Out ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/customer/login");
        },
      },
    ]);
  };

  return (
    <Screen scrollable={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.ink }]}>Account</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Manage your personal profile and security
          </Text>
        </View>

        {/* User Identity Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: colors.rose + "20" }]}>
              <Text style={[styles.avatarInitial, { color: colors.rose }]}>
                {(user?.name || "C")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={[styles.profileName, { color: colors.ink }]}>
                {user?.name || "Customer"}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.muted }]}>
                {user?.email}
              </Text>
              {user?.phone ? (
                <Text style={[styles.profilePhone, { color: colors.muted }]}>
                  📞 {user.phone}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        {/* Edit Profile Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color={colors.rose} />
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              Edit Profile
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.ink }]}>Full Name</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, color: colors.ink, borderColor: colors.border },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Your Name"
            placeholderTextColor={colors.muted}
          />

          <Text style={[styles.label, { color: colors.ink }]}>Phone Number</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, color: colors.ink, borderColor: colors.border },
            ]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 (555) 000-0000"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.rose }]}
            onPress={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </Card>

        {/* Security / Change Password Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.rose} />
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              Change Password
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.ink }]}>Current Password</Text>
          <View style={styles.pwWrapper}>
            <TextInput
              style={[
                styles.pwInput,
                { backgroundColor: colors.background, color: colors.ink, borderColor: colors.border },
              ]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPw}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowCurrentPw(!showCurrentPw)}
            >
              <Ionicons
                name={showCurrentPw ? "eye-off" : "eye"}
                size={18}
                color={colors.muted}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.ink }]}>New Password</Text>
          <View style={styles.pwWrapper}>
            <TextInput
              style={[
                styles.pwInput,
                { backgroundColor: colors.background, color: colors.ink, borderColor: colors.border },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPw}
              placeholder="Min 6 characters"
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowNewPw(!showNewPw)}
            >
              <Ionicons
                name={showNewPw ? "eye-off" : "eye"}
                size={18}
                color={colors.muted}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.ink }]}>Confirm New Password</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, color: colors.ink, borderColor: colors.border },
            ]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showNewPw}
            placeholder="Re-enter new password"
            placeholderTextColor={colors.muted}
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.ink }]}
            onPress={handleChangePassword}
            disabled={updatingPassword}
          >
            {updatingPassword ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </Card>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 4, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  profileCard: { marginBottom: 16, padding: 16 },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarInitial: { fontSize: 22, fontWeight: "700" },
  profileMeta: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: "700" },
  profileEmail: { fontSize: 13, marginTop: 2 },
  profilePhone: { fontSize: 12, marginTop: 2 },
  sectionCard: { marginBottom: 16, padding: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  pwWrapper: { position: "relative", marginBottom: 14 },
  pwInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingRight: 42,
    fontSize: 14,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: 13,
  },
  saveBtn: {
    height: 46,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    marginTop: 8,
    marginBottom: 32,
  },
  logoutText: { color: "#EF4444", fontSize: 15, fontWeight: "700" },
});
