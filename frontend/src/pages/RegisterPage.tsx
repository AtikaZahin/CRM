import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/register', { email, password, name });
      setSuccess(true);
      setTimeout(() => navigate('/login/salesperson'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
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
          <Link to="/login" className="btn btn-outline btn-sm">
            ← Portals
          </Link>
        </div>
      </div>

      {/* Card */}
      <div className="auth-body">
        <div className="auth-card">
          <p className="section-label" style={{ marginBottom: 16 }}>Get started</p>
          <h2 className="auth-title">Create account</h2>
          <p className="auth-subtitle">Start managing your pipeline</p>

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

          {success && (
            <div style={{
              marginBottom: 16,
              padding: '9px 14px',
              background: 'var(--emerald-light)',
              border: '1px solid rgba(63,92,46,0.2)',
              borderRadius: 'var(--r)',
              fontSize: 12,
              color: 'var(--emerald)',
              fontFamily: 'var(--font-mono)',
            }}>
              Account created — redirecting to sign in…
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="stack gap-12"
            style={{ marginBottom: 20 }}
          >
            <div className="field">
              <label className="label" htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                placeholder="Your name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                placeholder="you@email.com"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
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
              disabled={success}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              Create Account
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
            Already have an account?{' '}
            <Link to="/login/salesperson" style={{ color: 'var(--accent2)', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
