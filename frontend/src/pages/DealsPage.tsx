import React, { useState } from 'react';
import Modal from '../components/Modal';
import DealPipelineBoard from '../components/DealPipelineBoard';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const DealsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', value: '', status: 'Open', contact_id: '' });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        value: parseFloat(formData.value) || 0,
        status: formData.status,
        contact_id: formData.contact_id ? parseInt(formData.contact_id) : null
      };
      await api.post('/deals/', payload);
      setIsModalOpen(false);
      setFormData({ title: '', value: '', status: 'Open', contact_id: '' });
      setRefreshKey(prev => prev + 1); // tells the board to refetch
      toast.success('Deal created successfully');
    } catch (err) {
      console.error('Failed to create deal', err);
      toast.error('Failed to create deal');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Deals Pipeline</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">+ New Deal</button>
      </div>

      <DealPipelineBoard key={refreshKey} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Deal">
        <form onSubmit={handleAddDeal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            className="input-field"
            placeholder="Deal Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <input
            type="number"
            step="0.01"
            className="input-field"
            placeholder="Value ($)"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
          />
          <select
            className="input-field"
            style={{ backgroundColor: 'var(--bg-surface)' }}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="Open">Open</option>
            <option value="Negotiating">Negotiating</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>
          <input
            type="number"
            className="input-field"
            placeholder="Linked Contact ID (optional)"
            value={formData.contact_id}
            onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
          />
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Save Deal</button>
        </form>
      </Modal>
    </div>
  );
};

export default DealsPage;