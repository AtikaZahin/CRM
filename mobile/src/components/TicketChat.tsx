import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  AppState,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { WS_URL } from "../config";
import { apiClient, authHeader, errorMessage } from "../api/client";
import { useTheme } from "../theme";
import { ErrorState } from "./ErrorState";

export interface MessageItem {
  id: number;
  ticket_id: number;
  sender_type: "STAFF" | "CUSTOMER";
  sender_id?: number | null;
  sender_name?: string | null;
  content: string;
  created_at?: string;
}

interface TicketChatProps {
  ticketId: number;
  token: string;
  portal: "staff" | "customer";
  readOnly?: boolean;
  isResolved?: boolean;
}

export function TicketChat({
  ticketId,
  token,
  portal,
  readOnly = false,
  isResolved = false,
}: TicketChatProps) {
  const { colors } = useTheme();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountingRef = useRef<boolean>(false);
  const flatListRef = useRef<FlatList>(null);

  const connectWS = () => {
    if (isUnmountingRef.current || !token || !ticketId) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const wsUrl = `${WS_URL}/ws/tickets/${ticketId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev;
            return [...prev, data];
          });
        }
      } catch (e) {
        console.error("WS message parse error:", e);
      }
    };

    ws.onerror = (e) => {
      console.error("WS error:", e);
    };

    ws.onclose = (event) => {
      setWsConnected(false);
      wsRef.current = null;
      if (event.code === 4403) {
        setError("You don't have access to this ticket");
        return;
      }
      if (!isUnmountingRef.current) {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          connectWS();
        }, 3000);
      }
    };
  };

  useEffect(() => {
    isUnmountingRef.current = false;

    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const endpoint =
          portal === "customer"
            ? `/customer/tickets/${ticketId}/messages`
            : `/tickets/${ticketId}/messages`;

        const res = await apiClient.get<MessageItem[]>(endpoint, {
          headers: authHeader(token),
        });
        setMessages(res.data || []);
        connectWS();
      } catch (err: any) {
        if (err.response?.status === 403 || err.response?.status === 401) {
          setError("You don't have access to this ticket");
        } else {
          setError(errorMessage(err));
        }
      } finally {
        setLoading(false);
      }
    }

    loadHistory();

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        connectWS();
      } else if (nextState === "background" || nextState === "inactive") {
        if (wsRef.current) {
          wsRef.current.close();
        }
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
      }
    });

    return () => {
      isUnmountingRef.current = true;
      appStateSub.remove();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [ticketId, token, portal]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(text);
      setInputText("");
    } else {
      // Fallback: POST message via REST if socket isn't open yet
      const endpoint =
        portal === "customer"
          ? `/customer/tickets/${ticketId}/messages`
          : `/tickets/${ticketId}/messages`;

      apiClient
        .post(
          endpoint,
          { content: text },
          { headers: authHeader(token) }
        )
        .then((res) => {
          if (res.data && res.data.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === res.data.id)) return prev;
              return [...prev, res.data];
            });
          }
          setInputText("");
        })
        .catch((err) => {
          console.error("POST message failed:", err);
        });
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const isMine = (item: MessageItem) => {
    if (portal === "staff") {
      return item.sender_type === "STAFF";
    } else {
      return item.sender_type === "CUSTOMER";
    }
  };

  const renderMessage = ({ item }: { item: MessageItem }) => {
    const mine = isMine(item);
    const senderName = item.sender_name || (mine ? "You" : item.sender_type);

    return (
      <View
        style={[
          styles.messageRow,
          mine ? styles.myMessageRow : styles.theirMessageRow,
        ]}
      >
        <Text style={[styles.senderText, { color: colors.muted }]}>
          {senderName} · {formatTime(item.created_at)}
        </Text>

        {mine ? (
          <LinearGradient
            colors={colors.gradPrimary as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.myBubble]}
          >
            <Text style={styles.myBubbleText}>{item.content}</Text>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.bubble,
              styles.theirBubble,
              { backgroundColor: colors.surface2, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.theirBubbleText, { color: colors.ink }]}>
              {item.content}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.rose} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading message history...
        </Text>
      </View>
    );
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  const hideInput = readOnly || isResolved;

  return (
    <KeyboardAvoidingView
      style={styles.flexContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No messages yet. Send a message to start the conversation!
            </Text>
          </View>
        }
      />

      {hideInput ? (
        <View style={[styles.readOnlyBanner, { backgroundColor: colors.surface2 }]}>
          <Text style={[styles.readOnlyText, { color: colors.muted }]}>
            {isResolved
              ? "This ticket is resolved and read-only."
              : "Chat is in read-only mode."}
          </Text>
        </View>
      ) : (
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.bg,
                color: colors.ink,
                borderColor: colors.border,
              },
            ]}
            placeholder="Type your message..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.rose },
              !inputText.trim() && { opacity: 0.5 },
            ]}
            disabled={!inputText.trim()}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  centerContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  chatContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageRow: {
    marginVertical: 6,
    maxWidth: "82%",
  },
  myMessageRow: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  theirMessageRow: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  senderText: {
    fontSize: 11,
    marginBottom: 4,
    marginHorizontal: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  myBubbleText: {
    color: "#ffffff",
    fontSize: 14.5,
    lineHeight: 20,
  },
  theirBubbleText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  readOnlyBanner: {
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  readOnlyText: {
    fontSize: 13,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14.5,
    marginRight: 8,
  },
  sendButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
