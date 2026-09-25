import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStaffAuth } from '../context/StaffAuthContext';

const baseLinks = [
  { name: 'Announcements',    path: '/staff/announcements', icon: '📢' },
  { name: 'Dashboard',        path: '/staff/dashboard',     icon: '◈' },
  { name: 'Employee Details', path: '/staff/users',         icon: '👤' },
  { name: 'Support',          path: '/staff/support',       icon: '🎫' },
  { name: 'Deals',            path: '/staff/deals',         icon: '◇' },
  { name: 'Customers',        path: '/staff/customers',     icon: '🛒' },
];

const Sidebar = () => {
  const { user } = useStaffAuth();

  const links = [...baseLinks];

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
