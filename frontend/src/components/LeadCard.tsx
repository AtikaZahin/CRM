import React from 'react';

interface LeadCardProps {
  name: string;
  company: string;
  email: string;
  status: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

const LeadCard = ({ name, company, email, status, onEdit, onDelete }: LeadCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'var(--primary-color)';
      case 'contacted': return 'var(--warning-color)';
      case 'qualified': return 'var(--success-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const statusColor = getStatusColor(status);

  return (
    <div 
      className="lead-card" 
      style={{ '--info-color': statusColor } as React.CSSProperties}
    >
      <div>
        <h3 style={{ marginBottom: '0.25rem' }}>{name}</h3>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          {company}
        </div>
        <div style={{ fontSize: '0.875rem' }}>{email}</div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
        <span 
          className="status-badge" 
          style={{ 
            color: statusColor, 
            backgroundColor: `color-mix(in srgb, ${statusColor} 15%, transparent)` 
          }}
        >
          {status}
        </span>
        
        <div className="actions">
          {onEdit && (
            <button onClick={onEdit} className="edit">
              Edit
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="delete">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
