import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';

type Role = 'salesperson' | 'manager' | 'admin';

const ROLE_META: Record<Role, { label: string; badge: string; accentHex: string; icon: string }> = {
  salesperson: {

    label: 'Manager',
    badge: 'Team Access',
    accentHex: '#a3672f',
    icon: '📊',
  },
  admin: {
    label: 'Admin',
    badge: 'Full Access',
    accentHex: '#7a3b3b',
    icon: '⚙️',
  },
  salesperson: {
    label: 'Salesperson',
    badge: 'Standard Access',
    accentHex: '#4a5a35',
    icon: '👤',
  },
  manager:
};

const LoginPage = () => {
  const { role: roleParam } = useParams<{ role: string }>();
  const role: Role = (roleParam as Role) || 'salesperson';
  const meta = ROLE_META[role] ?? ROLE_META['salesperson'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token } = response.data;
      await login(access_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Nav */}
      <div className="auth-nav">
        <div className="nav-logo">
          <span className="nav-logo-dot" />
          Capstone CRM
        </div>
        <div className="row gap-8">
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle colour scheme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {/* Only User portal shows a "Create account" link in nav */}
          {role === 'salesperson' && (
            <Link to="/register/salesperson" className="btn btn-outline btn-sm">
              Create account
            </Link>
          )}
          <Link to="/login" className="btn btn-outline btn-sm">
            ← Portals
          </Link>
        </div>
      </div>

      {/* Card */}
      <div className="auth-body">
        <div className="auth-card" style={{ maxWidth: 440 }}>
          {/* Role badge */}
          <div className="row gap-8" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>{meta.icon}</span>
            <span
              style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: meta.accentHex,
                background: `${meta.accentHex}18`,
                border: `1px solid ${meta.accentHex}40`,
                padding: '4px 10px',
              }}
            >
              {meta.badge}
            </span>
          </div>

          <h2 className="auth-title">{meta.label} Portal</h2>
          <p className="auth-subtitle">Sign in to continue</p>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: '9px 14px',
                background: 'var(--ember-light)',
                border: '1px solid rgba(122,59,59,0.2)',
                borderRadius: 'var(--r)',
                fontSize: 12,
                color: 'var(--ember)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="stack gap-12" style={{ marginBottom: 20 }}>
            <div className="field">
              <label className="label" htmlFor={`login-email-${role}`}>
                Username / Email
              </label>
              <input
                id={`login-email-${role}`}
                type="text"
                placeholder="Enter your credentials"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor={`login-password-${role}`}>
                Password
              </label>
              <input
                id={`login-password-${role}`}
                type="password"
                placeholder="••••••••"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: 4,
                background: meta.accentHex,
                borderColor: meta.accentHex,
              }}
            >
              {loading ? 'Signing in…' : `Sign In as ${meta.label}`}
            </button>
          </form>

          {/* Sign-up link — User portal only */}
          {role === 'salesperson' && (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
              No account?{' '}
              <Link to="/register/salesperson" style={{ color: meta.accentHex, fontWeight: 500 }}>
                Create one
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
