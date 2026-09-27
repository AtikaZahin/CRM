import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import TicketChat from '../components/TicketChat';
import Modal from '../components/Modal';

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

/** Render 5 stars. Clickable when onRate is provided (unrated), static otherwise. */
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
                      className={`badge ${
                        t.status === 'OPEN'
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
                        /* Already rated — show static stars */
                        <StarRating value={t.rating} />
                      ) : (
                        /* Not yet rated — show clickable stars */
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

      {selectedTicket && token && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedTicket(null);
            fetchTickets();
          }}
          title={`Ticket #${selectedTicket.id}: ${selectedTicket.subject}`}
        >
          <div style={{ height: 600, marginTop: 16 }}>
            <TicketChat
              ticketId={selectedTicket.id}
              token={token}
              isReadOnly={selectedTicket.status === 'RESOLVED'}
              portalType="customer"
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomerTicketsPage;
