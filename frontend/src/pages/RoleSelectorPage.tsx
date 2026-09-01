import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const roles = [
  {
    key: 'salesperson',
    label: 'Salesperson',
    icon: '👤',
    description: 'Access your leads, contacts, tasks and deals.',
    badge: 'Standard Access',
    accentHex: '#4a5a35',
    path: '/login/salesperson',
  },
  {
    key: 'manager',
    label: 'Manager',
    icon: '📊',
    description: 'Oversee team performance and manage pipelines.',
    badge: 'Team Access',
    accentHex: '#a3672f',
    path: '/login/manager',
  },
  {
    key: 'admin',
    label: 'Admin',
    icon: '⚙️',
    description: 'Full system control — users, config and reporting.',
    badge: 'Full Access',
    accentHex: '#7a3b3b',
    path: '/login/admin',
  },
];

const RoleSelectorPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="auth-page">
      {/* Nav */}
      <div className="auth-nav">
        <div className="nav-logo">
          <span className="nav-logo-dot" />
          Capstone CRM
        </div>
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle colour scheme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Body */}
      <div className="auth-body" style={{ flexDirection: 'column', gap: 40 }}>
        {/* Heading */}
        <div style={{ textAlign: 'center' }}>
          <p
            className="section-label"
            style={{ marginBottom: 12, justifyContent: 'center', display: 'flex' }}
          >
            Welcome
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 500,
              fontStyle: 'italic',
              color: 'var(--ink)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Choose your portal
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--muted)',
              marginTop: 10,
              fontFamily: 'var(--font-mono)',
            }}
          >
            Select a role to continue to the login page
          </p>
        </div>

        {/* Role Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
            width: '100%',
            maxWidth: 780,
          }}
        >
          {roles.map((role) => (
            <button
              key={role.key}
              id={`role-btn-${role.key}`}
              onClick={() => navigate(role.path)}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                padding: '32px 28px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                borderRadius: 0,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = role.accentHex;
                el.style.transform = 'translateY(-4px)';
                el.style.boxShadow = `0 12px 40px rgba(43,32,19,0.18), inset 0 0 0 2px ${role.accentHex}`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = 'var(--border)';
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = 'var(--shadow)';
              }}
            >
              {/* Accent bar */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '100%', height: 3,
                  background: role.accentHex,
                }}
              />

              {/* Icon */}
              <span style={{ fontSize: 32, lineHeight: 1 }}>{role.icon}</span>

              {/* Label + badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22,
                    fontWeight: 500,
                    fontStyle: 'italic',
                    color: 'var(--ink)',
                  }}
                >
                  {role.label}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: role.accentHex,
                    background: `${role.accentHex}18`,
                    border: `1px solid ${role.accentHex}40`,
                    padding: '3px 8px',
                  }}
                >
                  {role.badge}
                </span>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--muted)',
                  margin: 0,
                  lineHeight: 1.5,
                  fontFamily: 'var(--font)',
                }}
              >
                {role.description}
              </p>

              {/* Arrow */}
              <span
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: role.accentHex,
                  letterSpacing: '0.04em',
                }}
              >
                Enter portal →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoleSelectorPage;
