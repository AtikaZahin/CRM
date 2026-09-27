import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { useNavigate } from 'react-router-dom';

interface OrderResponse {
  id: number;
  product_id: number;
  customer_id: number;
  quantity: number;
  status: string;
  open_ticket_id: number | null;
  created_at: string;
}

const CustomerOrdersPage = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useCustomerAuth();
  const navigate = useNavigate();

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [ticketCategory, setTicketCategory] = useState('DAMAGED');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);

  const [cancelOrderId, setCancelOrderId] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const handleCancelOrder = async () => {
    if (!cancelOrderId) return;
    try {
      await api.post(`/orders/${cancelOrderId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel order');
    } finally {
      setCancelOrderId(null);
    }
  };

  const handleNeedHelp = (orderId: number) => {
    setSelectedOrderId(orderId);
    setTicketCategory('DAMAGED');
    setTicketSubject('');
    setTicketMessage('');
    setIsTicketModalOpen(true);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setTicketLoading(true);
    try {
      await api.post('/customer/tickets', {
        order_id: selectedOrderId,
        category: ticketCategory,
        subject: ticketSubject,
        message: ticketMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Support ticket created successfully!');
      setIsTicketModalOpen(false);
      navigate('/shop/tickets');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create ticket');
    } finally {
      setTicketLoading(false);
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
        <h1 className="page-title">My Orders</h1>
      </div>

      <div className="table-wrapper">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product ID</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  You have no orders yet.
                </td>
              </tr>
            ) : (
              orders.map(o => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.product_id}</td>
                  <td>{o.quantity}</td>
                  <td>
                    <span className={`badge ${o.status === 'PLACED' ? 'badge-blue' : o.status === 'SHIPPED' ? 'badge-purple' : o.status === 'DELIVERED' ? 'badge-emerald' : 'badge-amber'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="row gap-8">
                      {o.status === 'PLACED' && (
                        <button 
                          onClick={() => setCancelOrderId(o.id)} 
                          className="btn btn-ghost btn-sm" 
                          style={{ color: 'var(--ember)' }}
                        >
                          Cancel Order
                        </button>
                      )}
                      {o.open_ticket_id ? (
                        <button onClick={() => navigate('/shop/tickets')} className="btn btn-outline btn-sm" style={{ color: 'var(--accent)' }}>
                          View conversation
                        </button>
                      ) : (
                        <button onClick={() => handleNeedHelp(o.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                          Need help?
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} title="Create Support Ticket">
        <form onSubmit={handleCreateTicket} className="stack gap-12" style={{ marginTop: 20 }}>
          <div className="field">
            <label className="label">Issue Category</label>
            <select
              className="input"
              value={ticketCategory}
              onChange={e => setTicketCategory(e.target.value)}
              required
            >
              <option value="DAMAGED">Damaged item</option>
              <option value="LATE_DELIVERY">Late delivery</option>
              <option value="WRONG_ITEM">Wrong item received</option>
              <option value="CANCEL_REFUND">Cancellation / Refund</option>
              <option value="OTHER">Other issue</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Subject (Optional)</label>
            <input 
              className="input" 
              value={ticketSubject} 
              onChange={e => setTicketSubject(e.target.value)} 
              placeholder="Defaults to issue category label if blank"
              maxLength={120}
            />
          </div>
          <div className="field">
            <label className="label">Message</label>
            <textarea 
              className="input" 
              style={{ minHeight: 120, resize: 'vertical' }}
              value={ticketMessage} 
              onChange={e => setTicketMessage(e.target.value)} 
              placeholder="Please describe your issue in detail..."
              maxLength={2000}
              required 
            />
          </div>
          <div className="row gap-12" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" onClick={() => setIsTicketModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={ticketLoading}>
              {ticketLoading ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={cancelOrderId !== null}
        onClose={() => setCancelOrderId(null)}
        onConfirm={handleCancelOrder}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Confirm Cancel"
      />
    </div>
  );
};

export default CustomerOrdersPage;
