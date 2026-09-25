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
  sender_id: number;
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

  // Load history initially
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/tickets/${ticketId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    fetchHistory();
  }, [ticketId, token]);

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
    if (!newMessage.trim() || isReadOnly) return;
    
    if (wsRef.current && isConnected) {
      // Send message text over websocket
      wsRef.current.send(newMessage);
      setNewMessage('');
    } else {
      toast.error('Chat is disconnected. Trying to reconnect...');
    }
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
            const isMine = msg.sender_type.toLowerCase() === portalType.toLowerCase();
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  maxWidth: '70%', 
                  padding: '10px 14px', 
                  borderRadius: 12,
                  background: isMine ? 'var(--accent)' : 'var(--border)',
                  color: isMine ? '#fff' : 'var(--ink)'
                }}>
                  <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>
                    {msg.sender_type} - {new Date(msg.created_at).toLocaleTimeString()}
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
