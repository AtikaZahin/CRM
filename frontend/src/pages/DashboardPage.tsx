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

  avg_rating?: number | null;
  rated_count?: number;
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
            {stats.rated_count != null && stats.rated_count > 0 && (
              <StatCard
                title="Avg Rating"
                value={`${stats.avg_rating?.toFixed(1) ?? '—'} ★`}
                trend={`${stats.rated_count} rating${stats.rated_count !== 1 ? 's' : ''}`}
                isPositive={true}
              />
            )}
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
            {stats.rated_count != null && stats.rated_count > 0 && (
              <StatCard
                title="Avg Rating"
                value={`${stats.avg_rating?.toFixed(1) ?? '—'} ★`}
                trend={`${stats.rated_count} rating${stats.rated_count !== 1 ? 's' : ''}`}
                isPositive={true}
              />
            )}
          </>
        )}

        {/* EMPLOYEE Stats */}
        {role === 'EMPLOYEE' && (
          <>
            <StatCard title="My In Progress Tickets" value={tickets['IN_PROGRESS']?.toString() || '0'} isPositive={false} />
            <StatCard title="My Resolved Tickets" value={tickets['RESOLVED']?.toString() || '0'} isPositive={true} />
            {stats.rated_count != null && stats.rated_count > 0 && (
              <StatCard
                title="Avg Rating"
                value={`${stats.avg_rating?.toFixed(1) ?? '—'} ★`}
                trend={`${stats.rated_count} rating${stats.rated_count !== 1 ? 's' : ''}`}
                isPositive={true}
              />
            )}
          </>
        )}
      </div>

      {/* Quick Navigation Actions */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 500,
          fontStyle: 'italic',
          marginBottom: 12
        }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div 
            onClick={() => navigate('/staff/support')}
            className="card card-p"
            style={{ 
              cursor: 'pointer', 
              transition: 'transform 0.15s, border-color 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div style={{ fontSize: 24, width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              🎫
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Support Center</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>View and resolve tickets</div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/staff/customers')}
            className="card card-p"
            style={{ 
              cursor: 'pointer', 
              transition: 'transform 0.15s, border-color 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div style={{ fontSize: 24, width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              👥
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Customers</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>Browse customer orders</div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/staff/deals')}
            className="card card-p"
            style={{ 
              cursor: 'pointer', 
              transition: 'transform 0.15s, border-color 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div style={{ fontSize: 24, width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              💼
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Deal Pipeline</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>Track sales progress</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;