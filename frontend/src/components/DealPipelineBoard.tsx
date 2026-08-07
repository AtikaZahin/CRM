import React from 'react';

const mockDeals = [
  { id: 1, title: 'Website Redesign', amount: '$5,000', company: 'Tech Corp', stage: 'Lead In' },
  { id: 2, title: 'SEO Optimization', amount: '$2,500', company: 'Design Co', stage: 'Contact Made' },
  { id: 3, title: 'Mobile App', amount: '$15,000', company: 'Global LLC', stage: 'Negotiating' },
  { id: 4, title: 'Consulting', amount: '$1,000', company: 'Startup Inc', stage: 'Won' },
];

const STAGES = ['Lead In', 'Contact Made', 'Negotiating', 'Won'];

const DealPipelineBoard = () => {
  return (
    <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
      {STAGES.map(stage => (
        <div key={stage} style={{ minWidth: '300px', flex: 1 }}>
          <div style={{ 
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontWeight: 600,
            borderTop: `3px solid var(--primary-color)`
          }}>
            {stage}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mockDeals.filter(deal => deal.stage === stage).map(deal => (
              <div key={deal.id} className="glass-panel" style={{ padding: '1rem', cursor: 'pointer' }}>
                <h4 style={{ marginBottom: '0.25rem' }}>{deal.title}</h4>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  {deal.company}
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>
                  {deal.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DealPipelineBoard;
