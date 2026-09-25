import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

const LoginPage = () => {
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
      const response = await api.post('/staff/login', { email, password });
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
        </div>
      </div>

      {/* Card */}
      <div className="auth-body">
        <div className="auth-card" style={{ maxWidth: 440 }}>
          {/* Role badge */}
          <div className="row gap-8" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>🏢</span>
            <span
              style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#7a3b3b',
                background: '#7a3b3b18',
                border: '1px solid #7a3b3b40',
                padding: '4px 10px',
              }}
            >
              Staff Portal
            </span>
          </div>

          <h2 className="auth-title">Staff Login</h2>
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
              <label className="label" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
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
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
