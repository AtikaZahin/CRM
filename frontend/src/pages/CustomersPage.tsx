import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

interface CustomerResponse {
  id: number;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

interface OrderResponse {
  id: number;
  product_id: number;
  quantity: number;
  status: string;
  created_at: string;
}

interface TicketResponse {
  id: number;
  order_id: number;
  subject: string;
  status: string;
  created_at: string;
  assigned_employee_id: number | null;
  customer_id: number;
}

interface CustomerDetailResponse extends CustomerResponse {
  orders: OrderResponse[];
  tickets: TicketResponse[];
}

const CustomersPage = () => {
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetailResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/customers');
        setCustomers(res.data);
      } catch (err) {
        toast.error('Failed to load customers');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const openCustomer = async (id: number) => {
    setModalLoading(true);
    setSelectedCustomer(null);
    try {
      const res = await api.get(`/customers/${id}`);
      setSelectedCustomer(res.data);
    } catch (err) {
      toast.error('Failed to load customer details');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenTicket = (ticket: TicketResponse) => {
    // Navigate to support page and pass the ticket in the router state
    navigate('/staff/support', { state: { openTicket: ticket } });
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
      </div>

      <div className="table-wrapper">
        <table className="crm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map(c => (
                <tr key={c.id}>
                  <td>#{c.id}</td>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone || '-'}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => openCustomer(c.id)} className="btn btn-outline btn-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalLoading && (
        <Modal isOpen={true} onClose={() => {}} title="Loading...">
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        </Modal>
      )}

      {selectedCustomer && (
        <Modal isOpen={true} onClose={() => setSelectedCustomer(null)} title={`Customer Details: ${selectedCustomer.name}`}>
          <div className="stack gap-24" style={{ marginTop: 16 }}>
            {/* Info Section */}
            <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 'var(--r)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Contact Information
              </div>
              <div className="grid gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div><strong>Email:</strong> {selectedCustomer.email}</div>
                <div><strong>Phone:</strong> {selectedCustomer.phone || '-'}</div>
                <div><strong>Joined:</strong> {new Date(selectedCustomer.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Orders Section */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Order History ({selectedCustomer.orders.length})</div>
              {selectedCustomer.orders.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>No orders found.</div>
              ) : (
                <div className="table-wrapper" style={{ maxHeight: 250, overflowY: 'auto' }}>
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Product ID</th>
                        <th>Qty</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomer.orders.map(o => (
                        <tr key={o.id}>
                          <td>#{o.id}</td>
                          <td>{o.product_id}</td>
                          <td>{o.quantity}</td>
                          <td>{o.status}</td>
                          <td>{new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Tickets Section */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Support Tickets ({selectedCustomer.tickets.length})</div>
              {selectedCustomer.tickets.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 14 }}>No tickets found.</div>
              ) : (
                <div className="table-wrapper" style={{ maxHeight: 250, overflowY: 'auto' }}>
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Ticket ID</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCustomer.tickets.map(t => (
                        <tr key={t.id}>
                          <td>#{t.id}</td>
                          <td>{t.subject}</td>
                          <td>
                            <span className={`badge ${t.status === 'OPEN' ? 'badge-amber' : t.status === 'IN_PROGRESS' ? 'badge-blue' : 'badge-gray'}`}>
                              {t.status}
                            </span>
                          </td>
                          <td>
                            <button onClick={() => handleOpenTicket(t)} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
                              Open in Support
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CustomersPage;
