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
    } catch (err: any) {
      console.error('Failed to save contact', err);
      toast.error(err.response?.data?.detail || 'Failed to save contact');
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

  if (loading) {
    return (
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ marginTop: 40 }} />
        <p style={{ marginTop: 16, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Loading contacts…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="section-label" style={{ marginBottom: 4 }}>Directory</p>
          <h1 className="page-title">Contacts</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          + Add Contact
        </button>
      </div>

      <div className="table-wrapper">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Linked Lead ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  No contacts found. Click "+ Add Contact" to create one.
                </td>
              </tr>
            ) : (
              contacts.map(contact => (
                <tr key={contact.id}>
                  <td style={{ fontWeight: 500, color: 'var(--ink)' }}>
                    {contact.first_name} {contact.last_name}
                  </td>
                  <td style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {contact.email || '—'}
                  </td>
                  <td style={{ color: 'var(--ink2)' }}>
                    {contact.phone || '—'}
                  </td>
                  <td>
                    {contact.lead_id ? (
                      <span className="badge badge-blue">
                        #{contact.lead_id}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    <div className="row gap-6">
                      <button 
                        onClick={() => handleEdit(contact)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--child)' }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => setDeleteContactId(contact.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--ember)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? "Edit Contact" : "Add Contact"}>
        <form onSubmit={handleSubmit} className="stack gap-12">
          <div className="field">
            <label className="label">First Name</label>
            <input
              className="input"
              placeholder="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">Last Name</label>
            <input
              className="input"
              placeholder="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Phone</label>
            <input
              className="input"
              placeholder="+1 555-0199"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="field">
            <label className="label">Linked Lead ID (Optional)</label>
            <input
              type="number"
              className="input"
              placeholder="Lead ID"
              value={formData.lead_id}
              onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 8, justifyContent: 'center' }}>
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
    </>
  );
};

export default ContactsPage;