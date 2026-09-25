import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useTheme } from '../context/ThemeContext';

const CustomerLayout = () => {
  const { user, logout } = useCustomerAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="layout-root" style={{ flexDirection: 'column' }}>
      <nav className="nav" style={{ width: '100%' }}>
        <div className="nav-logo cursor-pointer" onClick={() => navigate('/shop')}>
          <span className="nav-logo-dot" />
          Customer Portal
        </div>
        
        <div className="row gap-24">
          <Link to="/shop" className="btn btn-ghost btn-sm">Shop</Link>
          {user && <Link to="/shop/orders" className="btn btn-ghost btn-sm">My Orders</Link>}
          {user && <Link to="/shop/tickets" className="btn btn-ghost btn-sm">My Tickets</Link>}
        </div>

        <div className="row gap-8" style={{ marginLeft: 'auto' }}>
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          
          {user ? (
            <>
              <span style={{ fontSize: 13, color: 'var(--muted)', marginRight: 8 }}>
                {user.name || user.email}
              </span>
              <button onClick={logout} className="btn btn-outline btn-sm">
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/shop/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}
        </div>
      </nav>
      
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 0', background: 'var(--bg)' }}>
        <div className="page" style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default CustomerLayout;
