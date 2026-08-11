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
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div>
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Capstone CRM</h2>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={toggleDrawer}
          style={{
            background: 'var(--primary-color)',
            border: 'none',
            color: '#fff',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderRadius: '8px',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'var(--glass-shadow)'
          }}
          title="Open AI Assistant"
        >
          💬 AI Assistant
        </button>
        <button 
          onClick={toggleTheme}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.25rem 0.75rem',
            cursor: 'pointer',
            fontSize: '1.25rem'
          }}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {user ? (
          <>
            <span>Welcome, <strong>{user.name}</strong></span>
            <button onClick={logout} style={{
              background: 'transparent',
              border: '1px solid var(--danger-color)',
              color: 'var(--danger-color)',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" style={{ color: 'var(--primary-color)' }}>Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
