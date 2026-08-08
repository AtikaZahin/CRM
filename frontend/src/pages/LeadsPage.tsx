import React, { useState } from 'react';
import Modal from '../components/Modal';
import LeadCard from '../components/LeadCard';

const mockLeads = [
  { id: 1, name: 'Alice Smith', company: 'Tech Corp', email: 'alice@techcorp.com', status: 'New' },
  { id: 2, name: 'Bob Johnson', company: 'Design Co', email: 'bob@designco.com', status: 'Contacted' },
  { id: 3, name: 'Charlie Davis', company: 'Global LLC', email: 'charlie@globalllc.com', status: 'Qualified' },
];

const LeadsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leads, setLeads] = useState(mockLeads);

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Leads</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          + Add Lead
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {leads.map(lead => (
          <LeadCard 
            key={lead.id}
            name={lead.name}
            company={lead.company}
            email={lead.email}
            status={lead.status}
            onEdit={() => setIsModalOpen(true)}
          />
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add/Edit Lead">
        <form onSubmit={handleAddLead} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input className="input-field" placeholder="Full Name" required />
          <input className="input-field" placeholder="Company" required />
          <input type="email" className="input-field" placeholder="Email" required />
          <select className="input-field" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
          </select>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Save Lead</button>
        </form>
      </Modal>
    </div>
  );
};

export default LeadsPage;
