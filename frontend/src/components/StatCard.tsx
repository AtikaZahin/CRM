import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  isPositive?: boolean;
  icon?: string;
  chipVariant?: 'blush' | 'sage';
}

const defaultIcons: Record<string, string> = {
  'total staff': '👥',
  'total customers': '🛍️',
  'total orders': '📦',
  'unassigned tickets': '📋',
  'in progress tickets': '⚙️',
  'resolved tickets': '✅',
  'avg rating': '⭐',
  'my team size': '👤',
  'unassigned tickets (global)': '📋',
  'team tickets: in progress': '⚙️',
  'team tickets: resolved': '✅',
  'my in progress tickets': '⚙️',
  'my resolved tickets': '✅',
};

const StatCard = ({ title, value, trend, isPositive, icon, chipVariant }: StatCardProps) => {
  const emoji = icon ?? defaultIcons[title.toLowerCase()] ?? '📊';
  const variant = chipVariant ?? (isPositive ? 'sage' : 'blush');

  return (
    <div className="card stat-card">
      {/* Circular icon chip */}
      <div className={`stat-icon-chip${variant === 'sage' ? ' sage' : ''}`}>
        {emoji}
      </div>

      {/* Text body */}
      <div className="stat-body">
        <p className="stat-label">{title}</p>
        <div className="stat-value">{value}</div>
        {trend && (
          <p
            className="stat-sub"
            style={{
              color: isPositive ? 'var(--status-resolved-color)' : 'var(--rose-dark)',
            }}
          >
            {isPositive ? '↑' : '↓'} {trend}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
