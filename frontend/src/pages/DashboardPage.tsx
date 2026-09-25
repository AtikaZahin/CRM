import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import { api } from '../services/api';
import { useStaffAuth } from '../context/StaffAuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  total_staff?: number;
  total_leads?: number;
  total_employees?: number;
  total_customers?: number;
  total_orders?: number;
  
  team_size?: number;
  unassigned_tickets?: number;
  
  tickets_by_status?: Record<string, number>;
}

const DashboardPage = () => {
  const { user } = useStaffAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ marginTop: 40 }} />
        <p style={{ marginTop: 16, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Loading dashboard…
        </p>
      </div>
    );
  }

  const role = user?.role;
  const tickets = stats.tickets_by_status || { 'OPEN': 0, 'IN_PROGRESS': 0, 'RESOLVED': 0 };

  return (
    <>
      <div className="page-header">
        <p className="section-label" style={{ marginBottom: 8 }}>Overview</p>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your CRM at a glance</p>
      </div>

      <div className="stats-grid">
        {/* ADMIN Stats */}
        {role === 'ADMIN' && (
          <>
            <StatCard title="Total Staff" value={stats.total_staff?.toLocaleString() || '0'} isPositive={true} />
            <StatCard title="Total Customers" value={stats.total_customers?.toLocaleString() || '0'} isPositive={true} />
            <StatCard title="Total Orders" value={stats.total_orders?.toLocaleString() || '0'} isPositive={true} />
            <StatCard title="Unassigned Tickets" value={tickets['OPEN']?.toString() || '0'} isPositive={false} />
            <StatCard title="In Progress Tickets" value={tickets['IN_PROGRESS']?.toString() || '0'} isPositive={true} />
            <StatCard title="Resolved Tickets" value={tickets['RESOLVED']?.toString() || '0'} isPositive={true} />
          </>
        )}

        {/* LEAD Stats */}
        {role === 'LEAD' && (
          <>
            <StatCard title="My Team Size" value={stats.team_size?.toLocaleString() || '0'} isPositive={true} />
            <div style={{ cursor: 'pointer' }} onClick={() => navigate('/staff/support')}>
              <StatCard title="Unassigned Tickets (Global)" value={stats.unassigned_tickets?.toString() || '0'} isPositive={false} />
            </div>
            <StatCard title="Team Tickets: In Progress" value={tickets['IN_PROGRESS']?.toString() || '0'} isPositive={true} />
            <StatCard title="Team Tickets: Resolved" value={tickets['RESOLVED']?.toString() || '0'} isPositive={true} />
          </>
        )}

        {/* EMPLOYEE Stats */}
        {role === 'EMPLOYEE' && (
          <>
            <StatCard title="My In Progress Tickets" value={tickets['IN_PROGRESS']?.toString() || '0'} isPositive={false} />
            <StatCard title="My Resolved Tickets" value={tickets['RESOLVED']?.toString() || '0'} isPositive={true} />
          </>
        )}
      </div>

      <div className="card card-p" style={{ minHeight: 200, marginTop: 24 }}>
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