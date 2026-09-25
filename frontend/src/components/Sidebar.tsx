import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const baseLinks = [
  { name: 'Dashboard', path: '/',        icon: '◈' },
  { name: 'Deals',     path: '/deals',   icon: '◇' },
];

const Sidebar = () => {
  const { user } = useAuth();

  const links = [...baseLinks];
  if (user && user.role === 'ADMIN') {
    links.push({ name: 'Users', path: '/users', icon: '👤' });
  }

  return (
    <aside className="sidebar">
      <span className="sidebar-section-label">Navigation</span>
      {links.map((link) => (
        <NavLink
          key={link.path}
          to={link.path}
          end={link.path === '/'}
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' active' : ''}`
          }
        >
          <span style={{ fontSize: '11px', opacity: 0.7 }}>{link.icon}</span>
          {link.name}
        </NavLink>
      ))}
    </aside>
  );
};

export default Sidebar;
