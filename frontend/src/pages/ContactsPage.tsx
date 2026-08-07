import React from 'react';

const mockContacts = [
  { id: 1, name: 'Eve Adams', email: 'eve@example.com', phone: '555-0101', role: 'CEO' },
  { id: 2, name: 'Frank Wright', email: 'frank@example.com', phone: '555-0102', role: 'CTO' },
  { id: 3, name: 'Grace Hopper', email: 'grace@example.com', phone: '555-0103', role: 'Lead Engineer' },
];

const ContactsPage = () => {
  return (
    <div>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 600 }}>Contacts</h1>
      
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Name</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Email</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Phone</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {mockContacts.map(contact => (
              <tr key={contact.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>{contact.name}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{contact.email}</td>
                <td style={{ padding: '1rem' }}>{contact.phone}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                    color: 'var(--primary-color)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem'
                  }}>
                    {contact.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContactsPage;
