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
  sender_id?: number;     // only present in staff payloads
  sender_name?: string;   // populated by server
  content: string;
  created_at: string;
}

const TicketChat = ({ ticketId, token, isReadOnly, portalType }: TicketChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);

  // Choose the correct history endpoint:
  // - customer portal: /customer/tickets/{id}/messages (no sender_id, has sender_name)
  // - staff portal:    /tickets/{id}/messages
  const historyUrl =
    portalType === 'customer'
      ? `http://localhost:8000/customer/tickets/${ticketId}/messages`
      : `http://localhost:8000/tickets/${ticketId}/messages`;

  // Load history initially
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(historyUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    fetchHistory();
  }, [ticketId, token, historyUrl]);

  // Manage WebSocket connection
  useEffect(() => {
    let ws: WebSocket;
    
    const connectWs = () => {
      ws = new WebSocket(`ws://localhost:8000/ws/tickets/${ticketId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const incoming = JSON.parse(event.data);
          setMessages(prev => [...prev, incoming]);
        } catch (err) {
          console.error("Invalid message format", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnect after 3 seconds
        reconnectTimeout.current = window.setTimeout(connectWs, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    };

    connectWs();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [ticketId, token]);

  // Auto-scroll
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

  /**
   * Determine whether a message "belongs to me" for chat bubble alignment.
   * - portalType 'customer': my messages have sender_type === 'CUSTOMER'
   * - portalType 'staff':    my messages have sender_type === 'STAFF'
   */
  const isMine = (msg: Message) =>
    msg.sender_type.toUpperCase() === (portalType === 'customer' ? 'CUSTOMER' : 'STAFF');

  /**
   * Display label above each bubble.
   * Prefer server-computed sender_name; fall back gracefully.
   */
  const getSenderLabel = (msg: Message): string => {
    if (msg.sender_name) return msg.sender_name;
    // Fallback: readable label based on sender_type
    return msg.sender_type === 'CUSTOMER' ? 'Customer' : 'Agent';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400, maxHeight: 600, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
      {/* Connection indicator */}
      {!isConnected && (
        <div style={{ background: 'var(--ember)', color: '#fff', fontSize: 12, padding: '4px 12px', textAlign: 'center' }}>
          Connecting to chat...
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 20 }}>No messages yet.</div>
        ) : (
          messages.map(msg => {
            const mine = isMine(msg);
            const label = getSenderLabel(msg);
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  maxWidth: '70%', 
                  padding: '10px 14px', 
                  borderRadius: 12,
                  background: mine ? 'var(--accent)' : 'var(--border)',
                  color: mine ? '#fff' : 'var(--ink)'
                }}>
                  <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4, fontWeight: 600 }}>
                    {label} · {new Date(msg.created_at).toLocaleTimeString()}
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {!isReadOnly && (
        <div style={{ borderTop: '1px solid var(--border)', padding: 16 }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              maxLength={2000}
              disabled={!isConnected}
            />
            <button type="submit" className="btn btn-primary" disabled={!isConnected || !newMessage.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TicketChat;
