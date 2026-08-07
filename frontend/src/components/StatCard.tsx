import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  isPositive?: boolean;
}

const StatCard = ({ title, value, trend, isPositive }: StatCardProps) => {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
        {title}
      </h3>
      <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        {value}
      </div>
      {trend && (
        <div style={{ 
          color: isPositive ? 'var(--success-color)' : 'var(--danger-color)',
          fontSize: '0.875rem',
          fontWeight: 500
        }}>
          {isPositive ? '↑' : '↓'} {trend}
        </div>
      )}
    </div>
  );
};

export default StatCard;
