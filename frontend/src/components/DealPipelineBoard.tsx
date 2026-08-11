import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Deal {
  id: number;
  title: string;
  value: number;
  status: string;
  contact_id: number | null;
  owner_id: number | null;
}

const STAGES = ['Open', 'Negotiating', 'Won', 'Lost'];

const DealPipelineBoard = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const response = await api.get('/deals/');
      setDeals(response.data);
    } catch (err) {
      console.error('Failed to fetch deals', err);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (deal: Deal, newStatus: string) => {
    try {
      // PUT requires the full DealCreate shape, not just the changed field
      await api.put(`/deals/${deal.id}`, {
        title: deal.title,
        value: deal.value,
        status: newStatus,
        contact_id: deal.contact_id
      });
      fetchDeals(); // refresh after move
      toast.success('Deal stage updated');
    } catch (err) {
      console.error('Failed to update deal stage', err);
      toast.error('Failed to update deal stage');
    }
  };

  if (loading) return <div>Loading deals...</div>;

  return (
    <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
      {STAGES.map(stage => (
        <div key={stage} style={{ minWidth: '300px', flex: 1 }}>
          <div style={{
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            padding: '1rem',
            marginBottom: '1rem',
            fontWeight: 600,
            borderTop: `3px solid var(--primary-color)`
          }}>
            {stage}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {deals.filter(deal => deal.status === stage).map(deal => (
              <div key={deal.id} className="glass-panel" style={{ padding: '1rem' }}>
                <h4 style={{ marginBottom: '0.25rem' }}>{deal.title}</h4>
                {deal.contact_id && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    Contact #{deal.contact_id}
                  </div>
                )}
                <div style={{ fontWeight: 'bold', color: 'var(--success-color)', marginBottom: '0.5rem' }}>
                  ${deal.value.toLocaleString()}
                </div>
                <select
                  className="input-field"
                  style={{ fontSize: '0.75rem', padding: '0.25rem' }}
                  value={deal.status}
                  onChange={(e) => handleStageChange(deal, e.target.value)}
                >
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DealPipelineBoard;