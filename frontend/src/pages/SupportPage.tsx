import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useStaffAuth } from '../context/StaffAuthContext';
import TicketChat from '../components/TicketChat';
import Modal from '../components/Modal';

interface TicketResponse {
  id: number;
  order_id: number;
  customer_id: number;
  subject: string;
  status: string;
  assigned_employee_id: number | null;
  created_at: string;
}

interface UserItem {
  id: number;
  email: string;
  role: string;
  name?: string;
  lead_id?: number;
}

import { useLocation, useNavigate } from 'react-router-dom';

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
      // Determine tab if possible
      const st = location.state.openTicket.status;
      if (st === 'OPEN') setActiveTab('UNASSIGNED');
      else if (st === 'IN_PROGRESS') setActiveTab('IN_PROGRESS');
      else if (st === 'RESOLVED') setActiveTab('RESOLVED');
      
      // Clear state so refresh doesn't reopen it
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
    // For LEAD, we can resolve if assigned to a team member
    if (isLead && team.some(u => u.id === t.assigned_employee_id)) return true;
    return false;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Support Tickets</h1>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {(isAdmin || isLead) && (
          <div 
            onClick={() => setActiveTab('UNASSIGNED')}
            style={{ 
              padding: '12px 16px', 
              cursor: 'pointer', 
              fontWeight: 500,
              color: activeTab === 'UNASSIGNED' ? 'var(--accent)' : 'var(--muted)',
              borderBottom: activeTab === 'UNASSIGNED' ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1
            }}
          >
            Unassigned
          </div>
        )}
        <div 
          onClick={() => setActiveTab('IN_PROGRESS')}
          style={{ 
            padding: '12px 16px', 
            cursor: 'pointer', 
            fontWeight: 500,
            color: activeTab === 'IN_PROGRESS' ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === 'IN_PROGRESS' ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1
          }}
        >
          In Progress
        </div>
        <div 
          onClick={() => setActiveTab('RESOLVED')}
          style={{ 
            padding: '12px 16px', 
            cursor: 'pointer', 
            fontWeight: 500,
            color: activeTab === 'RESOLVED' ? 'var(--accent)' : 'var(--muted)',
            borderBottom: activeTab === 'RESOLVED' ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1
          }}
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
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    No tickets found in this view.
                  </td>
                </tr>
              ) : (
                tickets.map(t => (
                  <tr key={t.id}>
                    <td>#{t.id}</td>
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

      {selectedTicket && token && (
        <Modal isOpen={true} onClose={() => setSelectedTicket(null)} title={`Ticket #${selectedTicket.id}: ${selectedTicket.subject}`}>
          <div style={{ display: 'flex', flexDirection: 'column', height: 600, marginTop: 16 }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
              {canResolve(selectedTicket) && (
                <button onClick={handleResolve} className="btn btn-primary btn-sm">
                  Mark Resolved
                </button>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <TicketChat 
                ticketId={selectedTicket.id} 
                token={token} 
                isReadOnly={isReadOnly(selectedTicket)} 
                portalType="staff" 
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SupportPage;
