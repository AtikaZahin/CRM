import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useStaffAuth } from '../context/StaffAuthContext';

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  author_id: number;
  created_at: string;
}

const AnnouncementsPage = () => {
  const { user: currentUser } = useStaffAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);

  const [formData, setFormData] = useState({ title: '', content: '' });

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get('/announcements/');
      setAnnouncements(response.data);
    } catch (err: any) {
      console.error('Failed to fetch announcements', err);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({ title: '', content: '' });
  };

  const handleEdit = (item: AnnouncementItem) => {
    setEditingItem(item);
    setFormData({ title: item.title, content: item.content });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/announcements/${editingItem.id}`, formData);
        toast.success('Announcement updated');
      } else {
        await api.post('/announcements/', formData);
        toast.success('Announcement created');
      }
      handleCloseModal();
      fetchAnnouncements();
    } catch (err: any) {
      console.error('Failed to save announcement', err);
      toast.error(err.response?.data?.detail || 'Failed to save announcement');
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await api.delete(`/announcements/${deleteId}`);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (err: any) {
      console.error('Failed to delete announcement', err);
      toast.error(err.response?.data?.detail || 'Failed to delete announcement');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ marginTop: 40 }} />
        <p style={{ marginTop: 16, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Loading announcements…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="section-label" style={{ marginBottom: 4 }}>Company Info</p>
          <h1 className="page-title">Announcements</h1>
        </div>
        {isAdmin && (
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            + New Announcement
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {announcements.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
            No announcements found.
          </div>
        ) : (
          announcements.map((item) => (
            <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, borderRadius: 'var(--r)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>{item.title}</h3>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleEdit(item)} className="btn btn-ghost btn-sm" style={{ color: 'var(--muted)' }}>
                      Edit
                    </button>
                    <button onClick={() => setDeleteId(item.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--ember)' }}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 8, marginBottom: 16 }}>
                Posted on {new Date(item.created_at).toLocaleDateString()}
              </p>
              <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {item.content}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingItem ? "Edit Announcement" : "New Announcement"}>
        <form onSubmit={handleSubmit} className="stack gap-16" style={{ marginTop: 20 }}>
          <div className="field">
            <label className="label">Title</label>
            <input
              type="text"
              className="input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="label">Content</label>
            <textarea
              className="input"
              style={{ minHeight: 120, resize: 'vertical' }}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
            />
          </div>
          <div className="row gap-12" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" onClick={handleCloseModal} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingItem ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmText="Delete"
      />
    </>
  );
};

export default AnnouncementsPage;
