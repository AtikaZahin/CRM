import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import TicketChat from '../components/TicketChat';

interface CustomerTicketResponse {
  id: number;
  order_id: number;
  subject: string;
  category: string;
  status: string;
  agent_first_name: string | null;
  rating: number | null;
  rated_at: string | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  DAMAGED: 'Damaged item',
  LATE_DELIVERY: 'Late delivery',
  WRONG_ITEM: 'Wrong item received',
  CANCEL_REFUND: 'Cancellation / Refund',
  OTHER: 'Other issue',
};

const StarRating = ({
  value,
  onRate,
}: {
  value: number | null;
  onRate?: (r: number) => void;
}) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div
      style={{ display: 'flex', gap: 2, alignItems: 'center' }}
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map(star => {
        const filled = value !== null ? star <= value : star <= hovered;
        const interactive = onRate != null;
        return (
          <span
            key={star}
            onClick={() => interactive && onRate(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            style={{
              fontSize: 20,
              cursor: interactive ? 'pointer' : 'default',
              color: filled ? '#f59e0b' : 'var(--border)',
              transition: 'color 0.1s',
              userSelect: 'none',
            }}
            title={interactive ? `Rate ${star} star${star > 1 ? 's' : ''}` : `${value} / 5`}
          >
            ★
          </span>
        );
      })}
    </div>
  );
};

const CustomerTicketsPage = () => {
  const [tickets, setTickets] = useState<CustomerTicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useCustomerAuth();

  const [selectedTicket, setSelectedTicket] = useState<CustomerTicketResponse | null>(null);
  const [ratingLoading, setRatingLoading] = useState<number | null>(null);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/customer/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(res.data);
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const handleRate = async (ticketId: number, rating: number) => {
    setRatingLoading(ticketId);
    try {
      await api.post(
        `/customer/tickets/${ticketId}/rate`,
        { rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Rated ${rating} star${rating > 1 ? 's' : ''}! Thank you for your feedback.`);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit rating');
    } finally {
      setRatingLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ marginTop: 40 }} />
      </div>
    );
  }

  if (selectedTicket && token) {
    return (
      <div style={{ maxWidth: 1300, margin: '0 auto', paddingBottom: 40 }}>
        {/* Back link */}
        <button
          onClick={() => {
            setSelectedTicket(null);
            fetchTickets();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 20
          }}
        >
          <span>⬅</span> Back to tickets
        </button>

        {/* Title and Header Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--status-resolved-color)', flexShrink: 0 }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
            Ticket #{selectedTicket.id} — {selectedTicket.subject}
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span
              style={{
                borderRadius: 99,
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                background: 'var(--blush)',
                color: '#d98d7e',
                textTransform: 'uppercase'
              }}
            >
              {selectedTicket.status}
            </span>
            <span
              style={{
                borderRadius: 99,
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                background: 'var(--surface2)',
                color: 'var(--muted)',
                textTransform: 'uppercase'
              }}
            >
              ORDER #{selectedTicket.order_id}
            </span>
          </div>
        </div>

        {/* 2 Column Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
          {/* Left Chat Card */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 24,
              height: 640,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
              overflow: 'hidden'
            }}
          >
            <TicketChat
              ticketId={selectedTicket.id}
              token={token}
              isReadOnly={selectedTicket.status === 'RESOLVED'}
              portalType="customer"
            />
          </div>

          {/* Right Sidebar Details */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}
          >
            {/* AGENT INFO */}
            <div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
                SUPPORT AGENT
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--rose)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18 }}>
                  {selectedTicket.agent_first_name ? selectedTicket.agent_first_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                    {selectedTicket.agent_first_name ? `${selectedTicket.agent_first_name} (Support)` : 'Assigned Agent'}
                  </div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--muted)' }}>
                    {selectedTicket.agent_first_name ? 'Currently assigned to your ticket' : 'Waiting for assignment'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* ORDER INFO */}
            <div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
                ORDER #{selectedTicket.order_id}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, fontFamily: 'var(--font)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Category</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Created</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {selectedTicket.status === 'RESOLVED' && (
              <>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
                    FEEDBACK & RATING
                  </div>
                  {selectedTicket.rating !== null ? (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Your Rating:</div>
                      <StarRating value={selectedTicket.rating} />
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Rate support experience:</div>
                      <StarRating value={null} onRate={r => handleRate(selectedTicket.id, r)} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Tickets</h1>
      </div>

      <div className="table-wrapper">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Order ID</th>
              <th>Category</th>
              <th>Subject</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Rating</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  You have no support tickets.
                </td>
              </tr>
            ) : (
              tickets.map(t => (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td>#{t.order_id}</td>
                  <td>
                    <span className="badge badge-purple" style={{ fontSize: 11 }}>
                      {CATEGORY_LABELS[t.category] || t.category}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{t.subject}</td>
                  <td style={{ fontSize: 13 }}>
                    {t.status === 'RESOLVED' ? (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    ) : t.agent_first_name ? (
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        {t.agent_first_name} is helping you
                      </span>
                    ) : (
                      <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>
                        Waiting for an agent
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${t.status === 'OPEN'
                        ? 'badge-amber'
                        : t.status === 'IN_PROGRESS'
                          ? 'badge-blue'
                          : 'badge-gray'
                        }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td>
                    {t.status === 'RESOLVED' ? (
                      ratingLoading === t.id ? (
                        <div className="spinner" style={{ width: 18, height: 18 }} />
                      ) : t.rating !== null ? (
                        <StarRating value={t.rating} />
                      ) : (
                        <StarRating value={null} onRate={r => handleRate(t.id, r)} />
                      )
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="btn btn-outline btn-sm"
                    >
                      View Chat
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerTicketsPage;
