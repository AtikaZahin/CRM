import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import LeadCard from '../components/LeadCard';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Lead {
  id: number;
  name: string;
  company: string;
  email: string;
  status: string;
  owner_id?: number | null;
}

interface UserOption {
  id: number;
  email: string;
  role: string;
}

const LeadsPage = () => {
  const { user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteLeadId, setDeleteLeadId] = useState<number | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [formData, setFormData] = useState({ name: '', company: '', email: '', status: 'New', owner_id: '' });
  const [loading, setLoading] = useState(true);

  const canManageAssignment = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const canDelete = currentUser?.role === 'ADMIN';

  useEffect(() => {
    fetchLeads();
    if (canManageAssignment) {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/');
      setUsersList(res.data);
    } catch (err) {
      console.error('Failed to fetch users list', err);
    }
  };

  const fetchLeads = async () => {
    try {
      const response = await api.get('/leads/');
      setLeads(response.data);
    } catch (err) {
      console.error('Failed to fetch leads', err);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        status: formData.status
      };
      if (canManageAssignment && formData.owner_id) {
        payload.owner_id = parseInt(formData.owner_id);
      }

      if (editingLeadId) {
        await api.put(`/leads/${editingLeadId}`, payload);
      } else {
        await api.post('/leads/', payload);
      }
      setIsModalOpen(false);
      setEditingLeadId(null);
      setFormData({ name: '', company: '', email: '', status: 'New', owner_id: '' });
      fetchLeads();
      toast.success(editingLeadId ? 'Lead updated successfully' : 'Lead created successfully');
    } catch (err: any) {
      console.error('Failed to save lead', err);
      toast.error(err.response?.data?.detail || 'Failed to save lead');
    }
  };

  const handleDeleteLead = async () => {
    if (deleteLeadId === null) return;
    try {
      await api.delete(`/leads/${deleteLeadId}`);
      fetchLeads();
      toast.success('Lead deleted successfully');
    } catch (err) {
      console.error('Failed to delete lead', err);
      toast.error('Failed to delete lead');
    } finally {
      setDeleteLeadId(null);
    }
  };

  const openAddModal = () => {
    setEditingLeadId(null);
    setFormData({ name: '', company: '', email: '', status: 'New', owner_id: currentUser?.id ? currentUser.id.toString() : '' });
    setIsModalOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setFormData({
      name: lead.name,
      company: lead.company,
      email: lead.email,
      status: lead.status,
      owner_id: lead.owner_id ? lead.owner_id.toString() : ''
    });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ marginTop: 40 }} />
        <p style={{ marginTop: 16, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Loading leads…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="section-label" style={{ marginBottom: 4 }}>Prospects</p>
          <h1 className="page-title">Leads</h1>
        </div>
        {canWrite && (
          <button onClick={openAddModal} className="btn btn-primary">
            + Add Lead
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            name={lead.name}
            company={lead.company}
            email={lead.email}
            status={lead.status}
            onEdit={canWrite ? () => openEditModal(lead) : undefined}
            onDelete={canDelete ? () => setDeleteLeadId(lead.id) : undefined}
          />
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLeadId ? "Edit Lead" : "Add Lead"}>
        <form onSubmit={handleSaveLead} className="stack gap-12">
          <div className="field">
            <label className="label">Full Name</label>
            <input
              className="input"
              placeholder="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">Company</label>
            <input
              className="input"
              placeholder="Company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">Status</label>
            <select
              className="input"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
            </select>
          </div>

          {canManageAssignment && (
            <div className="field">
              <label className="label">Assign To Owner</label>
              <select
                className="input"
                value={formData.owner_id}
                onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: 8, justifyContent: 'center' }}>
            {editingLeadId ? "Update Lead" : "Save Lead"}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteLeadId !== null}
        onClose={() => setDeleteLeadId(null)}
        onConfirm={handleDeleteLead}
        title="Delete Lead"
        message="Are you sure you want to delete this lead? This action cannot be undone."
      />
    </>
  );
};

export default LeadsPage;