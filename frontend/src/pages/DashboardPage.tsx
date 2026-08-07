import React from 'react';
import StatCard from '../components/StatCard';

const DashboardPage = () => {
  return (
    <div>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 600 }}>Dashboard Overview</h1>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard title="Total Leads" value="1,245" trend="12%" isPositive={true} />
        <StatCard title="Active Contacts" value="842" trend="5%" isPositive={true} />
        <StatCard title="Open Deals" value="$45,200" trend="2.4%" isPositive={false} />
        <StatCard title="Tasks Pending" value="14" trend="1" isPositive={false} />
      </div>

      <div className="glass-panel" style={{ padding: '2rem', minHeight: '300px' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Recent Activity</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Mock chart or list goes here...</p>
      </div>
    </div>
  );
};

export default DashboardPage;
