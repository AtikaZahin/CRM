import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
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
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token } = response.data;
      login(access_token, { email });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Minimal auth nav */}
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
          <Link to="/register" className="btn btn-outline btn-sm">
            Create account
          </Link>
        </div>
      </div>

      {/* Card */}
      <div className="auth-body">
        <div className="auth-card">
          <p className="section-label" style={{ marginBottom: 16 }}>Welcome back</p>
          <h2 className="auth-title">Sign in</h2>
          <p className="auth-subtitle">Continue where you left off</p>

          {error && (
            <div style={{
              marginBottom: 16,
              padding: '9px 14px',
              background: 'var(--ember-light)',
              border: '1px solid rgba(122,59,59,0.2)',
              borderRadius: 'var(--r)',
              fontSize: 12,
              color: 'var(--ember)',
              fontFamily: 'var(--font-mono)',
            }}>
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="stack gap-12"
            style={{ marginBottom: 20 }}
          >
            <div className="field">
              <label className="label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@email.com"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="login-password">Password</label>
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

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--accent3)', fontWeight: 500 }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
