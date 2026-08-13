import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  isPositive?: boolean;
}

const StatCard = ({ title, value, trend, isPositive }: StatCardProps) => {
  return (
    <div className="card stat-card">
      <p className="stat-label">{title}</p>
      <div className="stat-value">{value}</div>
      {trend && (
        <p className="stat-sub" style={{
          color: isPositive ? 'var(--emerald)' : 'var(--ember)',
          marginTop: 8,
        }}>
          {isPositive ? '↑' : '↓'} {trend}
        </p>
      )}
    </div>
  );
};

export default StatCard;
