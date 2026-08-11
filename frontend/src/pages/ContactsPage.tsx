import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  lead_id: number | null;
}

const ContactsPage = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteContactId, setDeleteContactId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lead_id: ''
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await api.get('/contacts/');
      setContacts(response.data);
    } catch (err) {
      console.error('Failed to fetch contacts', err);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        lead_id: formData.lead_id ? parseInt(formData.lead_id) : null
      };
      
      if (editingId) {
        await api.put(`/contacts/${editingId}`, payload);
      } else {
        await api.post('/contacts/', payload);
      }
      
      handleCloseModal();
      fetchContacts();
      toast.success(editingId ? 'Contact updated successfully' : 'Contact created successfully');
    } catch (err) {
      console.error('Failed to save contact', err);
      toast.error('Failed to save contact');
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setFormData({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || '',
      phone: contact.phone || '',
      lead_id: contact.lead_id ? contact.lead_id.toString() : ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteContactId === null) return;
    try {
      await api.delete(`/contacts/${deleteContactId}`);
      fetchContacts();
      toast.success('Contact deleted successfully');
    } catch (err) {
      console.error('Failed to delete contact', err);
      toast.error('Failed to delete contact');
    } finally {
      setDeleteContactId(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ first_name: '', last_name: '', email: '', phone: '', lead_id: '' });
  };

  if (loading) return <div>Loading contacts...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Contacts</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          + Add Contact
        </button>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <tr>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Name</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Email</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Phone</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Linked Lead ID</th>
              <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(contact => (
              <tr key={contact.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>{contact.first_name} {contact.last_name}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{contact.email || '—'}</td>
                <td style={{ padding: '1rem' }}>{contact.phone || '—'}</td>
                <td style={{ padding: '1rem' }}>
                  {contact.lead_id ? (
                    <span style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      color: 'var(--primary-color)',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem'
                    }}>
                      #{contact.lead_id}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <button 
                    onClick={() => handleEdit(contact)}
                    style={{ marginRight: '0.5rem', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => setDeleteContactId(contact.id)}
                    style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? "Edit Contact" : "Add Contact"}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            className="input-field"
            placeholder="First Name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
          <input
            className="input-field"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
          <input
            type="email"
            className="input-field"
            placeholder="Email (optional)"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Phone (optional)"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <input
            type="number"
            className="input-field"
            placeholder="Linked Lead ID (optional)"
            value={formData.lead_id}
            onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
          />
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
            {editingId ? "Update Contact" : "Save Contact"}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteContactId !== null}
        onClose={() => setDeleteContactId(null)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message="Are you sure you want to delete this contact? This action cannot be undone."
      />
    </div>
  );
};

export default ContactsPage;