import React from 'react';

interface LeadCardProps {
  name: string;
  company: string;
  email: string;
  status: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'new':        return 'badge badge-status-new';
    case 'contacted':  return 'badge badge-gold';
    case 'qualified':  return 'badge badge-green';
    case 'lost':       return 'badge badge-red';
    default:           return 'badge badge-neutral';
  }
};

const getAccentColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'new':        return 'var(--accent2)';
    case 'contacted':  return 'var(--gold)';
    case 'qualified':  return 'var(--emerald)';
    case 'lost':       return 'var(--ember)';
    default:           return 'var(--border2)';
  }
};

const LeadCard = ({ name, company, email, status, onEdit, onDelete }: LeadCardProps) => {
  return (
    <div
      className="lead-card"
      style={{ '--accent-stripe': getAccentColor(status) } as React.CSSProperties}
    >
      {/* Left accent stripe via CSS ::before — color comes from .lead-card */}
      <div style={{ flex: 1 }}>
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: 16,
          marginBottom: 4,
          color: 'var(--ink)',
        }}>
          {name}
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
          {company}
        </p>
        <p style={{ fontSize: 12, color: 'var(--ink2)' }}>{email}</p>
      </div>

      <div className="stack gap-8" style={{ alignItems: 'flex-end' }}>
        <span className={getStatusBadge(status)}>{status}</span>

        <div className="row gap-6" style={{ marginTop: 4 }}>
          {onEdit && (
            <button
              onClick={onEdit}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--child)', fontSize: 11 }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--ember)', fontSize: 11 }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
