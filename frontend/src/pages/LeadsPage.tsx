import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import LeadCard from '../components/LeadCard';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Lead {
  id: number;
  name: string;
  company: string;
  email: string;
  status: string;
}

const LeadsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteLeadId, setDeleteLeadId] = useState<number | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [formData, setFormData] = useState({ name: '', company: '', email: '', status: 'New' });
  const [loading, setLoading] = useState(true);

  // Fetch leads from backend on mount
  useEffect(() => {
    fetchLeads();
  }, []);

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
      if (editingLeadId) {
        await api.put(`/leads/${editingLeadId}`, formData);
      } else {
        await api.post('/leads/', formData);
      }
      setIsModalOpen(false);
      setEditingLeadId(null);
      setFormData({ name: '', company: '', email: '', status: 'New' });
      fetchLeads(); // refresh list from backend
      toast.success(editingLeadId ? 'Lead updated successfully' : 'Lead created successfully');
    } catch (err) {
      console.error('Failed to save lead', err);
      toast.error('Failed to save lead');
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
    setFormData({ name: '', company: '', email: '', status: 'New' });
    setIsModalOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setFormData({ name: lead.name, company: lead.company, email: lead.email, status: lead.status });
    setIsModalOpen(true);
  };

  if (loading) return <div>Loading leads...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Leads</h1>
        <button onClick={openAddModal} className="btn-primary">
          + Add Lead
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            name={lead.name}
            company={lead.company}
            email={lead.email}
            status={lead.status}
            onEdit={() => openEditModal(lead)}
            onDelete={() => setDeleteLeadId(lead.id)}
          />
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLeadId ? "Edit Lead" : "Add Lead"}>
        <form onSubmit={handleSaveLead} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            className="input-field"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            className="input-field"
            placeholder="Company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
          />
          <input
            type="email"
            className="input-field"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <select
            className="input-field"
            style={{ backgroundColor: 'var(--bg-surface)' }}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
          </select>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Save Lead</button>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteLeadId !== null}
        onClose={() => setDeleteLeadId(null)}
        onConfirm={handleDeleteLead}
        title="Delete Lead"
        message="Are you sure you want to delete this lead? This action cannot be undone."
      />
    </div>
  );
};

export default LeadsPage;