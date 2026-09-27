import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

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

  const historyUrl =
    portalType === 'customer'
      ? `http://localhost:8000/customer/tickets/${ticketId}/messages`
      : `http://localhost:8000/tickets/${ticketId}/messages`;

  useEffect(() => {
    let isSubscribed = true;
    const fetchHistory = async () => {
      try {
        const res = await axios.get(historyUrl, {
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
  }, [ticketId, token, historyUrl]);

  useEffect(() => {
    let isSubscribed = true;
    let ws: WebSocket | null = null;
    
    const connectWs = () => {
      ws = new WebSocket(`ws://localhost:8000/ws/tickets/${ticketId}?token=${token}`);
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
  }, [ticketId, token]);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff', borderRadius: 24 }}>
      {/* Connection indicator */}
      {!isConnected && (
        <div style={{ background: '#d98d7e', color: '#fff', fontSize: 11, padding: '6px 16px', textAlign: 'center', fontFamily: 'var(--font)', fontWeight: 600, letterSpacing: '0.06em' }}>
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
                        background: '#d98d7e',
                        color: '#ffffff',
                        padding: '14px 20px',
                        borderRadius: 18,
                        fontSize: 14,
                        lineHeight: 1.5,
                        fontFamily: 'var(--font)',
                        boxShadow: '0 2px 8px rgba(217, 141, 126, 0.15)',
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
                      background: '#c57a6b',
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
                    background: '#8a8078',
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
                      background: '#f6e7e2',
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
      {!isReadOnly && (
        <div style={{ padding: '16px 24px', background: '#ffffff', borderTop: '1px solid var(--border)', borderRadius: '0 0 24px 24px' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              style={{
                flex: 1,
                height: 48,
                borderRadius: 99,
                background: '#f6e7e2',
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
                background: '#d98d7e',
                color: '#ffffff',
                border: 'none',
                fontFamily: 'var(--font)',
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: '0.06em',
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
