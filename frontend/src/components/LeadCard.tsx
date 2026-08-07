import React from 'react';

interface LeadCardProps {
  name: string;
  company: string;
  email: string;
  status: string;
  onEdit?: () => void;
}

const LeadCard = ({ name, company, email, status, onEdit }: LeadCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'var(--primary-color)';
      case 'contacted': return 'var(--warning-color)';
      case 'qualified': return 'var(--success-color)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ marginBottom: '0.25rem' }}>{name}</h3>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            {company}
          </div>
          <div style={{ fontSize: '0.875rem' }}>{email}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <span style={{ 
            backgroundColor: getStatusColor(status), 
            padding: '0.25rem 0.75rem', 
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'white'
          }}>
            {status}
          </span>
          {onEdit && (
            <button onClick={onEdit} style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--primary-color)',
              fontSize: '0.875rem'
            }}>
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
