import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import TicketChat from '../components/TicketChat';
import Modal from '../components/Modal';

interface TicketResponse {
  id: number;
  order_id: number;
  subject: string;
  status: string;
  created_at: string;
}

const CustomerTicketsPage = () => {
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useCustomerAuth();
  
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await api.get('/customer/tickets', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTickets(res.data);
      } catch (err) {
        toast.error('Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [token]);

  if (loading) {
    return (
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ marginTop: 40 }} />
      </div>
    );
  }

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

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
              <th>Subject</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  You have no support tickets.
                </td>
              </tr>
            ) : (
              tickets.map(t => (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td>#{t.order_id}</td>
                  <td style={{ fontWeight: 500 }}>{t.subject}</td>
                  <td>
                    <span className={`badge ${t.status === 'OPEN' ? 'badge-amber' : t.status === 'IN_PROGRESS' ? 'badge-blue' : 'badge-gray'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => setSelectedTicketId(t.id)} className="btn btn-outline btn-sm">
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
        <Modal isOpen={true} onClose={() => setSelectedTicketId(null)} title={`Ticket #${selectedTicket.id}: ${selectedTicket.subject}`}>
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
