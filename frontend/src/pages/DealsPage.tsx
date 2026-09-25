import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import DealPipelineBoard from '../components/DealPipelineBoard';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface UserOption {
  id: number;
  email: string;
  role: string;
}

const DealsPage = () => {
  const { user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [formData, setFormData] = useState({ title: '', value: '', status: 'Open', contact_id: '', owner_id: '' });
  const [refreshKey, setRefreshKey] = useState(0);

  const canManageAssignment = currentUser?.role === 'ADMIN' || currentUser?.role === 'LEAD';

  useEffect(() => {
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

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: formData.title,
        value: parseFloat(formData.value) || 0,
        status: formData.status,
        contact_id: formData.contact_id ? parseInt(formData.contact_id) : null
      };
      if (canManageAssignment && formData.owner_id) {
        payload.owner_id = parseInt(formData.owner_id);
      }

      await api.post('/deals/', payload);
      setIsModalOpen(false);
      setFormData({ title: '', value: '', status: 'Open', contact_id: '', owner_id: '' });
      setRefreshKey(prev => prev + 1);
      toast.success('Deal created successfully');
    } catch (err: any) {
      console.error('Failed to create deal', err);
      toast.error(err.response?.data?.detail || 'Failed to create deal');
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="section-label" style={{ marginBottom: 4 }}>Sales</p>
          <h1 className="page-title">Deals Pipeline</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">+ New Deal</button>
      </div>

      <DealPipelineBoard key={refreshKey} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Deal">
        <form onSubmit={handleAddDeal} className="stack gap-12">
          <div className="field">
            <label className="label">Deal Title</label>
            <input
              className="input"
              placeholder="Enterprise License"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">Value ($)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="15000"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Status</label>
            <select
              className="input"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Open">Open</option>
              <option value="Negotiating">Negotiating</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Linked Contact ID (Optional)</label>
            <input
              type="number"
              className="input"
              placeholder="Contact ID"
              value={formData.contact_id}
              onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
            />
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

          <button type="submit" className="btn btn-primary" style={{ marginTop: 8, justifyContent: 'center' }}>Save Deal</button>
        </form>
      </Modal>
    </>
  );
};

export default DealsPage;