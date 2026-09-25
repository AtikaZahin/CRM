import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface UserItem {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'EMPLOYEE',
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (err: any) {
      console.error('Failed to fetch users', err);
      toast.error(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload: any = {
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        await api.put(`/users/${editingUser.id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/users/', {
          email: formData.email,
          password: formData.password,
          role: formData.role,
          is_active: formData.is_active
        });
        toast.success('User created successfully');
      }

      handleCloseModal();
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to save user', err);
      toast.error(err.response?.data?.detail || 'Failed to save user');
    }
  };

  const handleEdit = (u: UserItem) => {
    setEditingUser(u);
    setFormData({
      email: u.email,
      password: '',
      role: u.role,
      is_active: u.is_active
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteUserId === null) return;
    try {
      await api.delete(`/users/${deleteUserId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to delete user', err);
      toast.error(err.response?.data?.detail || 'Failed to delete user');
    } finally {
      setDeleteUserId(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ email: '', password: '', role: 'EMPLOYEE', is_active: true });
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 60, textAlign: 'center' }}>
        <div className="spinner" style={{ marginTop: 40 }} />
        <p style={{ marginTop: 16, color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          Loading user management…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="section-label" style={{ marginBottom: 4 }}>Administration</p>
          <h1 className="page-title">User Management</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          + Add User
        </button>
      </div>

      <div className="table-wrapper">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Username / Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                  No users found. Click "+ Add User" to create one.
                </td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500, color: 'var(--ink)' }}>
                    {u.email}
                  </td>
                  <td>
                    <span className={`badge ${
                      u.role === 'ADMIN' ? 'badge-blue' : u.role === 'LEAD' ? 'badge-purple' : 'badge-gray'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-emerald' : 'badge-amber'}`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="row gap-6">
                      <button
                        onClick={() => handleEdit(u)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--child)' }}
                      >
                        Edit
                      </button>
                      {currentUser?.id !== u.id && (
                        <button
                          onClick={() => setDeleteUserId(u.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--ember)' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUser ? "Edit User" : "Add New User"}>
        <form onSubmit={handleSubmit} className="stack gap-12">
          <div className="field">
            <label className="label">Username / Email</label>
            <input
              className="input"
              placeholder="e.g. sales2"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="field">
            <label className="label">{editingUser ? "New Password (leave blank to keep current)" : "Password"}</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />
          </div>

          <div className="field">
            <label className="label">Role</label>
            <select
              className="input"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="ADMIN">Admin (Full Access &amp; User Management)</option>
              <option value="LEAD">Lead (Team Management &amp; Assignments)</option>
              <option value="EMPLOYEE">Employee (Own Records Only)</option>
            </select>
          </div>

          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="is_active_chk"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              style={{ width: 16, height: 16 }}
            />
            <label htmlFor="is_active_chk" className="label" style={{ cursor: 'pointer', margin: 0 }}>
              Account Active
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: 8, justifyContent: 'center' }}>
            {editingUser ? "Update User" : "Create User"}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteUserId !== null}
        onClose={() => setDeleteUserId(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? All owned records may lose their primary owner."
      />
    </>
  );
};

export default UsersPage;
