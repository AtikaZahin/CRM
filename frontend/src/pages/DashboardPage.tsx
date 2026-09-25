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
    pendingTasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

    const fetchStats = async () => {
    try {
      const [dealsRes] = await Promise.all([
        api.get('/deals/'),
      ]);

      const openDealsValue = dealsRes.data
        .filter((d: any) => d.status !== 'Won' && d.status !== 'Lost')
        .reduce((sum: number, d: any) => sum + (d.value || 0), 0);

      setStats({
        totalLeads: 0,
        activeContacts: 0,
        openDealsValue,
        pendingTasks: 0,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ marginTop: 40 }} />
        <p style={{ marginTop: 16, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Loading dashboard…
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <p className="section-label" style={{ marginBottom: 8 }}>Overview</p>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your pipeline at a glance</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard title="Total Leads"       value={stats.totalLeads.toLocaleString()}           isPositive={true} />
        <StatCard title="Active Contacts"   value={stats.activeContacts.toLocaleString()}       isPositive={true} />
        <StatCard title="Open Deals Value"  value={`$${stats.openDealsValue.toLocaleString()}`} isPositive={true} />
        <StatCard title="Tasks Pending"     value={stats.pendingTasks.toString()}               isPositive={false} />
      </div>

      {/* Recent Activity */}
      <div className="card card-p" style={{ minHeight: 200 }}>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 500,
            fontStyle: 'italic',
          }}>
            Recent Activity
          </h2>
          <span className="badge badge-neutral">Coming soon</span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          Activity feed will appear here once the log endpoint is available.
        </p>
      </div>
    </>
  );
};

export default DashboardPage;