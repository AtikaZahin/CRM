import React from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { name: 'Dashboard', path: '/',        icon: '◈' },
  { name: 'Leads',     path: '/leads',   icon: '◎' },
  { name: 'Contacts',  path: '/contacts',icon: '◉' },
  { name: 'Deals',     path: '/deals',   icon: '◇' },
  { name: 'Tasks',     path: '/tasks',   icon: '◻' },
];

const Sidebar = () => {
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
