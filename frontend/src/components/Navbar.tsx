import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleDrawer } = useChat();

  return (
    <nav className="nav">
      {/* Logo */}
      <div className="nav-logo">
        <span className="nav-logo-dot" />
        Capstone CRM
      </div>

      {/* Right actions */}
      <div className="row gap-8">
        {/* AI Assistant */}
        <button
          onClick={toggleDrawer}
          className="btn btn-ghost btn-sm"
          title="Open AI Assistant"
          style={{ gap: '6px' }}
        >
          <span style={{ fontSize: '13px' }}>💬</span>
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>AI</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle colour scheme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* User info + logout */}
        {user ? (
          <>
            <span style={{
              fontSize: '12px',
              color: 'var(--muted)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.02em'
            }}>
              {user.name || user.email}
            </span>
            <button
              onClick={logout}
              className="btn btn-outline btn-sm"
              style={{ borderColor: 'rgba(122,59,59,0.35)', color: 'var(--ember)' }}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link to="/login" className="btn btn-outline btn-sm">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
