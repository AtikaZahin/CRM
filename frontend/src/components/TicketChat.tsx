import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { WS_URL } from '../config';
import { api } from '../services/api';
import { useOffline } from '../offline/useOffline';

interface TicketChatProps {
  ticketId: number;
  token: string;
  isReadOnly: boolean;
  portalType: 'staff' | 'customer';
}

interface Message {
  id: number;
  ticket_id: number;
  sender_type: string;
  sender_id?: number;
  sender_name?: string;
  content: string;
  created_at: string;
}

const TicketChat = ({ ticketId, token, isReadOnly, portalType }: TicketChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);
  const { isOffline } = useOffline();

  // Relative path so the api.ts offline cache can save / serve this history.
  const historyUrl =
    portalType === 'customer'
      ? `/customer/tickets/${ticketId}/messages`
      : `/tickets/${ticketId}/messages`;

  useEffect(() => {
    let isSubscribed = true;
    const fetchHistory = async () => {
      try {
        const res = await api.get(historyUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isSubscribed) {
          setMessages(res.data);
        }
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    fetchHistory();
    return () => { isSubscribed = false; };
  }, [ticketId, token, historyUrl, isOffline]); // re-load history when we come back online

  useEffect(() => {
    let isSubscribed = true;
    let ws: WebSocket | null = null;

    // Offline: no live chat – just show the saved history (read-only).
    if (isOffline) {
      setIsConnected(false);
      return () => { isSubscribed = false; };
    }

    const connectWs = () => {
      ws = new WebSocket(`${WS_URL}/ws/tickets/${ticketId}?token=${token}`);

      wsRef.current = ws;

      ws.onopen = () => {
        if (isSubscribed) setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const incoming = JSON.parse(event.data);
          setMessages(prev => {
            // Deduplicate messages by unique message ID
            if (incoming.id && prev.some(m => m.id === incoming.id)) {
              return prev;
            }
            return [...prev, incoming];
          });
        } catch (err) {
          console.error("Invalid message format", err);
        }
      };

      ws.onclose = () => {
        if (isSubscribed) {
          setIsConnected(false);
          reconnectTimeout.current = window.setTimeout(connectWs, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        if (ws) ws.close();
      };
    };

    connectWs();

    return () => {
      isSubscribed = false;
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws) {
        ws.onclose = null; // Prevent reconnect on intentional component unmount
        ws.close();
      }
      wsRef.current = null;
    };
  }, [ticketId, token, isOffline]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || isReadOnly) return;

    if (wsRef.current && isConnected) {
      wsRef.current.send(trimmed);
      setNewMessage('');
    } else {
      toast.error('Chat is disconnected. Trying to reconnect...');
    }
  };

  const isMine = (msg: Message) =>
    msg.sender_type.toUpperCase() === (portalType === 'customer' ? 'CUSTOMER' : 'STAFF');

  const getSenderLabel = (msg: Message): string => {
    if (msg.sender_name) return msg.sender_name;
    return msg.sender_type === 'CUSTOMER' ? 'Customer' : 'Agent';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Connection indicator */}
      {isOffline && (
        <div style={{ background: 'var(--surface2)', color: 'var(--muted)', fontSize: 12, padding: '6px 16px', textAlign: 'center', fontFamily: 'var(--font)', fontWeight: 600 }}>
          Offline – showing saved messages (read-only)
        </div>
      )}
      {!isOffline && !isConnected && (
        <div style={{ background: 'var(--blush)', color: 'var(--rose)', fontSize: 12, padding: '6px 16px', textAlign: 'center', fontFamily: 'var(--font)', fontWeight: 600 }}>
          Connecting to live chat…
        </div>
      )}

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Date divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '8px 0 16px', color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font)', fontWeight: 500 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span>Today · {formattedDate}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', margin: 'auto', fontFamily: 'var(--font)', fontSize: 13 }}>
            No messages yet. Send a message to start the conversation.
          </div>
        ) : (
          messages.map(msg => {
            const mine = isMine(msg);
            const label = getSenderLabel(msg);
            const initial = label.charAt(0).toUpperCase();
            const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (mine) {
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 8, width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: '75%' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font)' }}>
                      {label} · {timeStr}
                    </div>
                    <div
                      style={{
                        background: 'var(--chat-mine)',
                        color: 'var(--chat-mine-text)',
                        padding: '14px 20px',
                        borderRadius: 18,
                        fontSize: 14,
                        lineHeight: 1.5,
                        fontFamily: 'var(--font)',
                        boxShadow: '0 4px 14px var(--rose-glow)',
                        wordBreak: 'break-word'
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: 'var(--grad-brand)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font)',
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0,
                      marginTop: 18
                    }}
                  >
                    {initial}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start', gap: 12, marginBottom: 8, width: '100%' }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'var(--chat-avatar)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font)',
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                    marginTop: 18
                  }}
                >
                  {initial}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '75%' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontFamily: 'var(--font)' }}>
                    {label} · {timeStr}
                  </div>
                  <div
                    style={{
                      background: 'var(--chat-theirs)',
                      color: 'var(--ink)',
                      padding: '14px 20px',
                      borderRadius: 18,
                      fontSize: 14,
                      lineHeight: 1.5,
                      fontFamily: 'var(--font)',
                      wordBreak: 'break-word'
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pill Reply Input Bar */}
      {!isReadOnly && !isOffline && (
        <div style={{ padding: '16px 24px', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderRadius: '0 0 24px 24px' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              style={{
                flex: 1,
                height: 48,
                borderRadius: 99,
                background: 'var(--surface2)',
                border: 'none',
                padding: '0 24px',
                fontSize: 14,
                color: 'var(--ink)',
                outline: 'none',
                fontFamily: 'var(--font)'
              }}
              placeholder={isConnected ? 'Type your reply…' : 'Connecting…'}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              maxLength={2000}
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!isConnected || !newMessage.trim()}
              style={{
                height: 48,
                padding: '0 28px',
                borderRadius: 99,
                background: 'var(--grad-primary)',
                color: '#ffffff',
                border: 'none',
                fontFamily: 'var(--font)',
                fontWeight: 600,
                fontSize: 13,
                cursor: isConnected && newMessage.trim() ? 'pointer' : 'not-allowed',
                opacity: isConnected && newMessage.trim() ? 1 : 0.6,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              Send ↗
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TicketChat;