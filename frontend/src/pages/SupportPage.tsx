import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useStaffAuth } from '../context/StaffAuthContext';
import TicketChat from '../components/TicketChat';
import { useLocation, useNavigate } from 'react-router-dom';

interface TicketResponse {
  id: number;
  order_id: number;
  customer_id: number;
  category?: string;
  subject: string;
  status: string;
  assigned_employee_id: number | null;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  DAMAGED: 'Damaged item',
  LATE_DELIVERY: 'Late delivery',
  WRONG_ITEM: 'Wrong item received',
  CANCEL_REFUND: 'Cancellation / Refund',
  OTHER: 'Other issue',
};

interface UserItem {
  id: number;
  email: string;
  role: string;
  name?: string;
  lead_id?: number;
}

type TabType = 'UNASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';

const SupportPage = () => {
  const { user: currentUser, token } = useStaffAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>(currentUser?.role === 'EMPLOYEE' ? 'IN_PROGRESS' : 'UNASSIGNED');
  
  const [tickets, setTickets] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [team, setTeam] = useState<UserItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketResponse | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';
  const isLead = currentUser?.role === 'LEAD';

  useEffect(() => {
    if (location.state?.openTicket) {
      setSelectedTicket(location.state.openTicket);
      const st = location.state.openTicket.status;
      if (st === 'OPEN') setActiveTab('UNASSIGNED');
      else if (st === 'IN_PROGRESS') setActiveTab('IN_PROGRESS');
      else if (st === 'RESOLVED') setActiveTab('RESOLVED');
      
      navigate('/staff/support', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (isAdmin || isLead) {
      api.get('/staff').then(res => {
        if (isAdmin) {
          setTeam(res.data.filter((u: UserItem) => u.role === 'EMPLOYEE' || u.role === 'LEAD'));
        } else {
          setTeam(res.data.filter((u: UserItem) => u.lead_id === currentUser.id && u.role === 'EMPLOYEE'));
        }
      }).catch(err => {
        console.error("Failed to load staff list", err);
      });
    }
  }, [isAdmin, isLead, currentUser]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let url = '/tickets';
      if (activeTab === 'UNASSIGNED') {
        url += '?status=OPEN&unassigned=true';
      } else if (activeTab === 'IN_PROGRESS') {
        url += '?status=IN_PROGRESS';
      } else if (activeTab === 'RESOLVED') {
        url += '?status=RESOLVED';
      }

      const res = await api.get(url);
      setTickets(res.data);
    } catch (err: any) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [activeTab]);

  const handleAssign = async (ticketId: number, employeeId: number) => {
    try {
      await api.post(`/tickets/${ticketId}/assign`, { employee_id: employeeId });
      toast.success('Ticket assignment updated');
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, assigned_employee_id: employeeId, status: 'IN_PROGRESS' } : null);
      }
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to assign ticket');
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket) return;
    try {
      await api.post(`/tickets/${selectedTicket.id}/resolve`);
      toast.success('Ticket marked as resolved');
      setSelectedTicket(null);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to resolve ticket');
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedTicket) return;
    if (!window.confirm(`Are you sure you want to cancel Order #${selectedTicket.order_id}?`)) return;
    try {
      await api.patch(`/orders/${selectedTicket.order_id}/status`, { status: 'CANCELLED' });
      toast.success(`Order #${selectedTicket.order_id} cancelled successfully!`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel order');
    }
  };

  const openTicket = (t: TicketResponse) => {
    setSelectedTicket(t);
  };

  const isReadOnly = (t: TicketResponse) => {
    if (t.status === 'RESOLVED') return true;
    if (isAdmin) return true;
    return false;
  };

  const canResolve = (t: TicketResponse) => {
    if (t.status === 'RESOLVED') return false;
    if (t.assigned_employee_id === currentUser?.id) return true;
    if (isLead && team.some(u => u.id === t.assigned_employee_id)) return true;
    return false;
  };

  if (selectedTicket && token) {
    const assignedUser = team.find(u => u.id === selectedTicket.assigned_employee_id);
    const categoryLabel = CATEGORY_LABELS[selectedTicket.category || 'OTHER'] || selectedTicket.category || 'Other Issue';

    return (
      <div style={{ maxWidth: 1300, margin: '0 auto', paddingBottom: 40 }}>
        {/* Back button */}
        <button
          onClick={() => setSelectedTicket(null)}
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

        {/* Header Title & Real Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedTicket.status === 'RESOLVED' ? '#8a8078' : '#4caf50', flexShrink: 0 }} />
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
                background: selectedTicket.status === 'RESOLVED' ? 'var(--sage)' : 'var(--blush)',
                color: selectedTicket.status === 'RESOLVED' ? '#3b5a38' : 'var(--rose)',
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
                background: 'var(--border)',
                color: 'var(--ink)',
                textTransform: 'uppercase'
              }}
            >
              ORDER #{selectedTicket.order_id}
            </span>
            <span
              style={{
                borderRadius: 99,
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                background: 'var(--blush)',
                color: 'var(--ink)',
                textTransform: 'uppercase'
              }}
            >
              {categoryLabel}
            </span>
          </div>
        </div>

        {/* 2 Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
          {/* Main Chat Area */}
          <div
            style={{
              background: '#ffffff',
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
              isReadOnly={isReadOnly(selectedTicket)}
              portalType="staff"
            />
          </div>

          {/* Real Ticket Details Sidebar */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 24,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
            }}
          >
            {/* Customer Section */}
            <div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
                CUSTOMER
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#d98d7e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18 }}>
                  C
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                    Customer #{selectedTicket.customer_id}
                  </div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 12, color: 'var(--muted)' }}>
                    Customer Account #{selectedTicket.customer_id}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Ticket & Order Details */}
            <div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
                TICKET DETAILS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, fontFamily: 'var(--font)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Order ID</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>#{selectedTicket.order_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Category</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{categoryLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Created Date</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                </div>
                {assignedUser && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Assigned To</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{assignedUser.name || assignedUser.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Real Actions */}
            <div>
              <div style={{ fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 14 }}>
                ACTIONS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {canResolve(selectedTicket) && (
                  <>
                    <button
                      onClick={handleResolve}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 99,
                        background: '#e8ece3',
                        color: '#3b5a38',
                        border: 'none',
                        fontFamily: 'var(--font)',
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      ✓ Mark as resolved
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: 99,
                        background: 'transparent',
                        color: 'var(--danger)',
                        border: '1px solid var(--danger)',
                        fontFamily: 'var(--font)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel Order #{selectedTicket.order_id}
                    </button>
                  </>
                )}

                {(isAdmin || isLead) && selectedTicket.status !== 'RESOLVED' && (
                  <div style={{ marginTop: 4 }}>
                    <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>
                      Assign / Reassign Staff:
                    </label>
                    <select
                      className="input"
                      style={{ width: '100%', borderRadius: 99, fontSize: 12 }}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssign(selectedTicket.id, parseInt(e.target.value));
                        }
                      }}
                      value={selectedTicket.assigned_employee_id || ''}
                    >
                      <option value="" disabled>Select Staff Member</option>
                      {team.map(u => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Support Tickets</h1>
      </div>

      {/* Pill tab bar */}
      <div className="tab-bar">
        {(isAdmin || isLead) && (
          <div
            onClick={() => setActiveTab('UNASSIGNED')}
            className={`tab-pill${activeTab === 'UNASSIGNED' ? ' active' : ''}`}
          >
            Unassigned
          </div>
        )}
        <div
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`tab-pill${activeTab === 'IN_PROGRESS' ? ' active' : ''}`}
        >
          In Progress
        </div>
        <div
          onClick={() => setActiveTab('RESOLVED')}
          className={`tab-pill${activeTab === 'RESOLVED' ? ' active' : ''}`}
        >
          Resolved
        </div>
      </div>

      {loading ? (
        <div style={{ paddingTop: 60, textAlign: 'center' }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Category</th>
                <th>Subject</th>
                <th>Customer ID</th>
                <th>Date</th>
                <th>Actions</th>
                {(isAdmin || isLead) && (activeTab === 'UNASSIGNED' || activeTab === 'IN_PROGRESS') && (
                  <th>{activeTab === 'UNASSIGNED' ? 'Assign' : 'Assigned Employee'}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    No tickets found in this view.
                  </td>
                </tr>
              ) : (
                tickets.map(t => (
                  <tr key={t.id}>
                    <td>#{t.id}</td>
                    <td>
                      <span className="badge badge-neutral">
                        {CATEGORY_LABELS[t.category || 'OTHER'] || t.category || 'Other issue'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{t.subject}</td>
                    <td>{t.customer_id}</td>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>
                      <button onClick={() => openTicket(t)} className="btn btn-outline btn-sm">
                        View Ticket
                      </button>
                    </td>
                    {(isAdmin || isLead) && (activeTab === 'UNASSIGNED' || activeTab === 'IN_PROGRESS') && (
                      <td>
                        <select 
                          className="input" 
                          style={{ minWidth: 160 }}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssign(t.id, parseInt(e.target.value));
                            }
                          }}
                          value={t.assigned_employee_id || ''}
                        >
                          <option value="" disabled={activeTab === 'UNASSIGNED'}>
                            {activeTab === 'UNASSIGNED' ? 'Assign to...' : 'Select Employee'}
                          </option>
                          {team.map(u => (
                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SupportPage;
