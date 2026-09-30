import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Card, Badge, Button, ErrorState, TicketChat } from "../../../components";
import { useStaffAuth } from "../../../auth";
import { apiClient, authHeader, errorMessage } from "../../../api/client";
import { useTheme } from "../../../theme";

interface TicketDetail {
  id: number;
  order_id: number;
  customer_id: number;
  subject: string;
  category: string;
  status: string;
  assigned_employee_id?: number | null;
  assigned_by_id?: number | null;
  created_at?: string;
}

interface StaffUserItem {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface CustomerInfo {
  id: number;
  name: string;
  email: string;
}

export default function StaffTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { token, user } = useStaffAuth();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [teamEmployees, setTeamEmployees] = useState<StaffUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & Action states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  const ticketId = parseInt(id || "0", 10);
  const isLead = user?.role === "LEAD";
  const isAdmin = user?.role === "ADMIN";
  const isEmployee = user?.role === "EMPLOYEE";

  const fetchTicket = async () => {
    if (!token || !ticketId) return;
    setLoading(true);
    setError(null);

    try {
      let tData: TicketDetail | null = null;
      try {
        const res = await apiClient.get<TicketDetail>(`/tickets/${ticketId}`, {
          headers: authHeader(token),
        });
        tData = res.data;
      } catch (err: any) {
        const listRes = await apiClient.get<TicketDetail[]>("/tickets", {
          headers: authHeader(token),
        });
        const found = listRes.data.find((t) => t.id === ticketId);
        if (found) tData = found;
        else throw err;
      }

      setTicket(tData);

      // Fetch customer name if possible
      if (tData?.customer_id) {
        try {
          const custRes = await apiClient.get<CustomerInfo>(
            `/customers/${tData.customer_id}`,
            { headers: authHeader(token) }
          );
          setCustomer(custRes.data);
        } catch {}
      }
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamStaff = async () => {
    if (!token || !isLead) return;
    setAssignLoading(true);
    try {
      const res = await apiClient.get<StaffUserItem[]>("/staff", {
        headers: authHeader(token),
      });
      // Filter employees in lead's team
      const emps = (res.data || []).filter((s) => s.role === "EMPLOYEE");
      setTeamEmployees(emps);
    } catch (err: any) {
      setActionError(errorMessage(err));
    } finally {
      setAssignLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [token, ticketId]);

  const handleOpenAssignModal = () => {
    setActionError(null);
    fetchTeamStaff();
    setShowAssignModal(true);
  };

  const handleAssign = async (employeeId: number) => {
    if (!token || !ticket) return;
    setActionLoading(true);
    setActionError(null);

    try {
      await apiClient.post(
        `/tickets/${ticket.id}/assign`,
        { employee_id: employeeId },
        { headers: authHeader(token) }
      );
      setShowAssignModal(false);
      await fetchTicket();
    } catch (err: any) {
      setActionError(errorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!token || !ticket) return;
    setActionLoading(true);
    setActionError(null);

    try {
      await apiClient.post(
        `/tickets/${ticket.id}/resolve`,
        {},
        { headers: authHeader(token) }
      );
      setShowResolveModal(false);
      await fetchTicket();
    } catch (err: any) {
      setActionError(errorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const canResolve =
    !isAdmin &&
    ticket?.status !== "RESOLVED" &&
    (ticket?.assigned_employee_id === user?.id || isLead);

  const canAssign = !isAdmin && isLead && ticket?.status !== "RESOLVED";

  return (
    <Screen scrollable={false}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <Text style={[styles.backText, { color: colors.rose }]}>← Back to Support</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.rose} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTicket} />
      ) : ticket ? (
        <View style={styles.contentContainer}>
          {/* HEADER CARD */}
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.badgeRow}>
                <Text style={[styles.ticketId, { color: colors.rose }]}>
                  Ticket #{ticket.id}
                </Text>
                <Badge label={ticket.category} variant="blue" style={{ marginLeft: 8 }} />
              </View>
              <Badge
                label={ticket.status}
                variant={
                  ticket.status === "RESOLVED"
                    ? "emerald"
                    : ticket.assigned_employee_id
                    ? "purple"
                    : "danger"
                }
              />
            </View>

            <Text style={[styles.subject, { color: colors.ink }]} numberOfLines={2}>
              {ticket.subject}
            </Text>

            <View style={styles.metaContainer}>
              <Text style={[styles.metaText, { color: colors.muted }]}>
                Order #{ticket.order_id} · Customer: {customer?.name || `ID #${ticket.customer_id}`}
              </Text>
            </View>

            {/* ACTION BUTTONS (HIDDEN FOR ADMIN) */}
            {!isAdmin && (canAssign || canResolve) && (
              <View style={styles.actionsRow}>
                {canAssign && (
                  <Button
                    title={ticket.assigned_employee_id ? "Reassign" : "Assign Ticket"}
                    onPress={handleOpenAssignModal}
                    variant="primary"
                    style={styles.actionBtn}
                  />
                )}
                {canResolve && (
                  <Button
                    title="Mark Resolved"
                    onPress={() => {
                      setActionError(null);
                      setShowResolveModal(true);
                    }}
                    variant="danger"
                    style={styles.actionBtn}
                  />
                )}
              </View>
            )}

            {actionError && !showAssignModal && !showResolveModal && (
              <ErrorState message={actionError} style={{ marginTop: 8 }} />
            )}
          </Card>

          {/* CHAT WINDOW (READ ONLY FOR ADMIN) */}
          <View style={styles.chatWrapper}>
            <TicketChat
              ticketId={ticket.id}
              token={token || ""}
              portal="staff"
              readOnly={isAdmin}
              isResolved={ticket.status === "RESOLVED"}
            />
          </View>
        </View>
      ) : null}

      {/* ASSIGNMENT MODAL */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.ink }]}>
              Assign Ticket to Team Member
            </Text>

            {actionError && <ErrorState message={actionError} style={styles.modalError} />}

            {assignLoading ? (
              <ActivityIndicator size="small" color={colors.rose} style={{ marginVertical: 16 }} />
            ) : teamEmployees.length === 0 ? (
              <Text style={[styles.emptyEmpText, { color: colors.muted }]}>
                No employees available in your team.
              </Text>
            ) : (
              <ScrollView style={styles.empList}>
                {teamEmployees.map((emp) => (
                  <TouchableOpacity
                    key={emp.id}
                    style={[styles.empItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleAssign(emp.id)}
                    disabled={actionLoading}
                  >
                    <View>
                      <Text style={[styles.empName, { color: colors.ink }]}>
                        {emp.name || emp.email}
                      </Text>
                      <Text style={[styles.empEmail, { color: colors.muted }]}>
                        {emp.email}
                      </Text>
                    </View>
                    <Text style={[styles.selectText, { color: colors.rose }]}>
                      Assign →
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Button
              title="Cancel"
              onPress={() => setShowAssignModal(false)}
              variant="outline"
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>

      {/* RESOLUTION CONFIRMATION MODAL */}
      <Modal visible={showResolveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.ink }]}>
              Mark Ticket as Resolved?
            </Text>
            <Text style={[styles.modalDesc, { color: colors.muted }]}>
              Resolving this ticket will freeze the chat and mark the issue as completed.
            </Text>

            {actionError && <ErrorState message={actionError} style={styles.modalError} />}

            <Button
              title="Confirm Resolution"
              onPress={handleResolve}
              variant="danger"
              loading={actionLoading}
              disabled={actionLoading}
              style={{ marginTop: 16 }}
            />
            <Button
              title="Cancel"
              onPress={() => setShowResolveModal(false)}
              variant="outline"
              disabled={actionLoading}
              style={{ marginTop: 6 }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginVertical: 10,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
  },
  centerContainer: {
    padding: 40,
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
  },
  card: {
    padding: 16,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ticketId: {
    fontSize: 16,
    fontWeight: "700",
  },
  subject: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 22,
  },
  metaContainer: {
    marginTop: 2,
  },
  metaText: {
    fontSize: 12.5,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e7e4f2",
  },
  actionBtn: {
    flex: 1,
    marginVertical: 0,
    height: 40,
  },
  chatWrapper: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(14, 12, 27, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 12,
  },
  modalError: {
    marginVertical: 6,
    padding: 10,
  },
  empList: {
    maxHeight: 200,
    marginVertical: 8,
  },
  emptyEmpText: {
    fontSize: 14,
    marginVertical: 16,
    textAlign: "center",
  },
  empItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  empName: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  empEmail: {
    fontSize: 12,
  },
  selectText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
