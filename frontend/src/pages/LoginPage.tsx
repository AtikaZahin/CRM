import React, { useState } from 'react';
import { useStaffAuth } from '../context/StaffAuthContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

const LoginPresenter = ({ type, onLogin }: { type: 'staff' | 'customer', onLogin: (token: string) => Promise<void> }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = type === 'customer' ? '/customer/login' : '/staff/login';
      const response = await api.post(endpoint, { email, password });
      const { access_token } = response.data;
      await onLogin(access_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-nav">
        <div className="nav-logo cursor-pointer" onClick={() => navigate('/')}>
          <span className="nav-logo-dot" />
          Capstone CRM
        </div>
        <div className="row gap-8">
          <button onClick={toggleTheme} className="theme-toggle" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      <div className="auth-body">
        <div className="auth-card" style={{ maxWidth: 440 }}>
          <div className="row gap-8" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>{type === 'staff' ? '🏢' : '🛒'}</span>
            <span
              style={{
                fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: type === 'staff' ? '#7a3b3b' : '#a3672f',
                background: type === 'staff' ? '#7a3b3b18' : '#a3672f18',
                border: `1px solid ${type === 'staff' ? '#7a3b3b40' : '#a3672f40'}`,
                padding: '4px 10px',
              }}
            >
              {type === 'staff' ? 'Staff Portal' : 'Customer Portal'}
            </span>
          </div>

          <h2 className="auth-title">{type === 'staff' ? 'Staff Login' : 'Customer Login'}</h2>
          <p className="auth-subtitle">Sign in to continue</p>

          {error && (
            <div
              style={{
                marginBottom: 16, padding: '9px 14px', background: 'var(--ember-light)',
                border: '1px solid rgba(122,59,59,0.2)', borderRadius: 'var(--r)',
                fontSize: 12, color: 'var(--ember)', fontFamily: 'var(--font-mono)',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="stack gap-12" style={{ marginBottom: 20 }}>
            <div className="field">
              <label className="label">Email</label>
              <input type="email" placeholder="Enter your email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input type="password" placeholder="••••••••" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            {type === 'customer' && (
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13 }}>
                Don't have an account? <span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/shop/register')}>Register here</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

const StaffLoginWrapper = () => {
  const { login } = useStaffAuth();
  return <LoginPresenter type="staff" onLogin={login} />;
};

const CustomerLoginWrapper = () => {
  const { login } = useCustomerAuth();
  return <LoginPresenter type="customer" onLogin={login} />;
};

const LoginPage = ({ type = 'staff' }: { type?: 'staff' | 'customer' }) => {
  if (type === 'staff') return <StaffLoginWrapper />;
  return <CustomerLoginWrapper />;
};

export default LoginPage;
