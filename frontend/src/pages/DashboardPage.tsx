import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import { api } from '../services/api';

interface DashboardStats {
  totalLeads: number;
  activeContacts: number;
  openDealsValue: number;
  pendingTasks: number;
}

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeContacts: 0,
    openDealsValue: 0,
    pendingTasks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [leadsRes, contactsRes, dealsRes, tasksRes] = await Promise.all([
        api.get('/leads/'),
        api.get('/contacts/'),
        api.get('/deals/'),
        api.get('/tasks/')
      ]);

      const openDealsValue = dealsRes.data
        .filter((deal: any) => deal.status !== 'Won' && deal.status !== 'Lost')
        .reduce((sum: number, deal: any) => sum + (deal.value || 0), 0);

      const pendingTasks = tasksRes.data.filter((task: any) => !task.is_completed).length;

      setStats({
        totalLeads: leadsRes.data.length,
        activeContacts: contactsRes.data.length,
        openDealsValue,
        pendingTasks
      });
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 600 }}>Dashboard Overview</h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <StatCard title="Total Leads" value={stats.totalLeads.toLocaleString()} trend="" isPositive={true} />
        <StatCard title="Active Contacts" value={stats.activeContacts.toLocaleString()} trend="" isPositive={true} />
        <StatCard title="Open Deals Value" value={`$${stats.openDealsValue.toLocaleString()}`} trend="" isPositive={true} />
        <StatCard title="Tasks Pending" value={stats.pendingTasks.toString()} trend="" isPositive={false} />
      </div>

      <div className="glass-panel" style={{ padding: '2rem', minHeight: '300px' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Recent Activity</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Activity feed coming soon — no activity log endpoint yet.</p>
      </div>
    </div>
  );
};

export default DashboardPage;