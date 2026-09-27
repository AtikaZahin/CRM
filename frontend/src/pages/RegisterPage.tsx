import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/customer/register', { name, email, password, phone });
      navigate('/customer/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
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
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div className="auth-body">
        <div className="auth-card" style={{ maxWidth: 440 }}>
          <div className="row gap-8" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>🛍️</span>
            <span
              style={{
                fontSize: 9,
                fontFamily: 'var(--font)',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--status-progress-color)',
                background: 'var(--status-progress-bg)',
                border: `1px solid rgba(154,111,42,0.30)`,
                padding: '4px 10px',
                borderRadius: '99px',
              }}
            >
              Customer Portal
            </span>
          </div>

          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">Register to continue</p>

          {error && (
            <div className="alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="stack gap-12" style={{ marginBottom: 20 }}>
            <div className="field">
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                required
              />
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="label">Phone (Optional)</label>
              <input
                type="text"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              {loading ? 'Registering…' : 'Register'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13 }}>
              Already have an account? <span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/shop/login')}>Login here</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
