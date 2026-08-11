import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  const links = [
    { name: 'Dashboard', path: '/' },
    { name: 'Leads', path: '/leads' },
    { name: 'Contacts', path: '/contacts' },
    { name: 'Deals', path: '/deals' },
    { name: 'Tasks', path: '/tasks' },
  ];

  const getLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'block',
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem',
    textDecoration: 'none',
    color: isActive ? 'white' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
    fontWeight: isActive ? '600' : '400',
    transition: 'var(--transition)',
  });

  return (
    <aside style={{
      width: '250px',
      backgroundColor: 'rgba(30, 41, 59, 0.5)',
      borderRight: '1px solid var(--border-color)',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 64px)', // Adjust based on navbar height
      position: 'sticky',
      top: '64px'
    }}>
      <nav style={{ flex: 1 }}>
        {links.map((link) => (
          <NavLink key={link.path} to={link.path} style={getLinkStyle}>
            {link.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
