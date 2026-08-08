import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--primary-color)' }}>
        Capstone CRM
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user ? (
          <>
            <span>Welcome, <strong>{user.name}</strong></span>
            <button onClick={logout} style={{
              background: 'transparent',
              border: '1px solid var(--danger-color)',
              color: 'var(--danger-color)',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
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
