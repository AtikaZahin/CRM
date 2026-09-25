import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useStaffAuth } from '../context/StaffAuthContext';

interface UserItem {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  profile?: string;
  role: string;
  lead_id?: number;
  is_active: boolean;
  created_at: string;
  team_count?: number;
}

// ─── Profile Card (LEAD / EMPLOYEE self-edit) ────────────────────────────────
const ProfileCard = ({ user, teamCount, onUpdate }: { user: UserItem; teamCount?: number; onUpdate: () => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: user.name || '', phone: user.phone || '', profile: user.profile || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch('/staff/me', formData);
      toast.success('Profile updated');
      setIsEditing(false);
      onUpdate();
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--child) 100%)', padding: '24px 24px 20px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{user.name || '—'}</h2>
            <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 13 }}>{user.email}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
              {user.role}
            </span>
            {teamCount !== undefined && (
              <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 12px', fontSize: 12 }}>
                👥 {teamCount} team member{teamCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Personal Info</span>
          {!isEditing && <button onClick={() => setIsEditing(true)} className="btn btn-outline btn-sm">Edit Profile</button>}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="stack gap-12">
            <div className="field">
              <label className="label">Name</label>
              <input className="input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="field">
              <label className="label">Phone</label>
              <input className="input" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="field">
              <label className="label">Bio</label>
              <textarea className="input" style={{ minHeight: 80, resize: 'vertical' }} value={formData.profile} onChange={e => setFormData({ ...formData, profile: e.target.value })} />
            </div>
            <div className="row gap-8">
              <button type="submit" className="btn btn-primary" disabled={loading}>Save</button>
              <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="stack gap-10" style={{ fontSize: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: 'var(--muted)', minWidth: 60 }}>Phone</span>
              <span>{user.phone || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: 'var(--muted)', minWidth: 60 }}>Bio</span>
              <span>{user.profile || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ color: 'var(--muted)', minWidth: 60 }}>Status</span>
              <span className={`badge ${user.is_active ? 'badge-emerald' : 'badge-amber'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const UsersPage = () => {
  const { user: currentUser, isLoading: authLoading } = useStaffAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin – expanded lead row
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null);

  // Admin – create / edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'EMPLOYEE', lead_id: '', is_active: true });

  const isAdmin = currentUser?.role === 'ADMIN';
  const isLead  = currentUser?.role === 'LEAD';

  const fetchUsers = async () => {
    try {
      const res = await api.get('/staff');
      // Normalise lead_id to number so comparisons are always number===number
      const normalised = res.data.map((u: any) => ({
        ...u,
        id: Number(u.id),
        lead_id: u.lead_id != null ? Number(u.lead_id) : undefined,
      }));
      setUsers(normalised);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const currentId = currentUser ? Number(currentUser.id) : undefined;
  const leads   = users.filter(u => u.role === 'LEAD');
  const myInfo  = users.find(u => u.id === currentId);
  const myTeam  = users.filter(u => u.lead_id === currentId);

  // ── Admin CRUD ────────────────────────────────────────────────────────────
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newLeadId = formData.role === 'EMPLOYEE' && formData.lead_id
        ? parseInt(formData.lead_id)
        : 0; // 0 tells the backend to set lead_id = NULL for ADMIN/LEAD roles

      const payload: any = {
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
        lead_id: newLeadId
      };

      if (editingUser) {
        if (formData.password) payload.password = formData.password;
        await api.patch(`/staff/${editingUser.id}`, payload);
        toast.success('User updated');
        // Auto-expand the lead the employee was just assigned to
        if (formData.role === 'EMPLOYEE' && newLeadId > 0) {
          setExpandedLeadId(newLeadId);
        }
      } else {
        payload.password = formData.password;
        await api.post('/staff', payload);
        toast.success('User created');
        // Auto-expand the lead a newly created employee belongs to
        if (formData.role === 'EMPLOYEE' && newLeadId > 0) {
          setExpandedLeadId(newLeadId);
        }
      }
      setIsModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save user');
    }
  };

  const openAdminEdit = (u: UserItem) => {
    setEditingUser(u);
    setFormData({ email: u.email, password: '', role: u.role, lead_id: u.lead_id ? u.lead_id.toString() : '', is_active: u.is_active });
    setIsModalOpen(true);
  };

  const handleAdminDelete = async () => {
    if (deleteUserId === null) return;
    try {
      await api.delete(`/staff/${deleteUserId}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete user');
    } finally {
      setDeleteUserId(null);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || authLoading || !currentUser) return (
    <div style={{ paddingTop: 60, textAlign: 'center' }}>
      <div className="spinner" style={{ marginTop: 40 }} />
    </div>
  );

  // ── EMPLOYEE view (only their own profile) ────────────────────────────────
  if (!isAdmin && !isLead) return (
    <>
      <div className="page-header">
        <p className="section-label" style={{ marginBottom: 4 }}>Staff Info</p>
        <h1 className="page-title">My Details</h1>
      </div>
      <div className="stack gap-24">
        {myInfo && <ProfileCard user={myInfo} onUpdate={fetchUsers} />}
      </div>
    </>
  );

  // ── LEAD view ─────────────────────────────────────────────────────────────
  if (isLead) return (
    <>
      <div className="page-header">
        <p className="section-label" style={{ marginBottom: 4 }}>Staff Info</p>
        <h1 className="page-title">Employee Details</h1>
      </div>

      <div className="stack gap-24">
        {myInfo && <ProfileCard user={myInfo} teamCount={myTeam.length} onUpdate={fetchUsers} />}

        {myTeam.length > 0 && (
          <div>
            <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>
              My Team &nbsp;<span style={{ color: 'var(--muted)', fontWeight: 400 }}>({myTeam.length})</span>
            </h3>
            <div className="table-wrapper">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myTeam.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.name || '—'}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || '—'}</td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-emerald' : 'badge-amber'}`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );

  // ── ADMIN view ────────────────────────────────────────────────────────────
  // Group: admins, leads (with their employees), solo employees
  const admins    = users.filter(u => u.role === 'ADMIN');
  const employees = users.filter(u => u.role === 'EMPLOYEE');

  const toggleLead = (id: number) =>
    setExpandedLeadId(prev => (prev === id ? null : id));

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="section-label" style={{ marginBottom: 4 }}>Staff Info</p>
          <h1 className="page-title">Employee Details</h1>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ email: '', password: '', role: 'EMPLOYEE', lead_id: '', is_active: true });
            setIsModalOpen(true);
          }}
          className="btn btn-primary"
        >
          + Add Staff
        </button>
      </div>

      <div className="stack gap-32">

        {/* ── Admins ── */}
        {admins.length > 0 && (
          <section>
            <h3 style={{ fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Admins</h3>
            <div className="table-wrapper">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.name || '—'}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || '—'}</td>
                      <td><span className={`badge ${u.is_active ? 'badge-emerald' : 'badge-amber'}`}>{u.is_active ? 'Active' : 'Disabled'}</span></td>
                      <td>
                        <div className="row gap-6">
                          <button onClick={() => openAdminEdit(u)} className="btn btn-ghost btn-sm" style={{ color: 'var(--child)' }}>Edit</button>
                          {currentId !== u.id && (
                            <button onClick={() => setDeleteUserId(u.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--ember)' }}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Leads (expandable) ── */}
        <section>
          <h3 style={{ fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Leads & Their Teams</h3>
          <div className="stack gap-12">
            {leads.map(lead => {
              const team = employees.filter(e => e.lead_id === lead.id);
              const isOpen = expandedLeadId === lead.id;
              return (
                <div key={lead.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                  {/* Lead row – clickable */}
                  <div
                    onClick={() => toggleLead(lead.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                      background: isOpen ? 'var(--surface)' : 'var(--bg)',
                      cursor: 'pointer', userSelect: 'none',
                      borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                      {(lead.name || lead.email).charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{lead.name || lead.email}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{lead.email}</div>
                    </div>
                    <span className="badge badge-purple">LEAD</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 90, textAlign: 'right' }}>
                      👥 {team.length} employee{team.length !== 1 ? 's' : ''}
                    </span>
                    <span className={`badge ${lead.is_active ? 'badge-emerald' : 'badge-amber'}`}>{lead.is_active ? 'Active' : 'Disabled'}</span>
                    <div className="row gap-6" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openAdminEdit(lead)} className="btn btn-ghost btn-sm" style={{ color: 'var(--child)' }}>Edit</button>
                      <button onClick={() => setDeleteUserId(lead.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--ember)' }}>Delete</button>
                    </div>
                    <span style={{ fontSize: 18, color: 'var(--muted)', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {/* Expanded employee list */}
                  {isOpen && (
                    <div style={{ background: 'var(--surface)' }}>
                      {team.length === 0 ? (
                        <div style={{ padding: '16px 24px', color: 'var(--muted)', fontSize: 13 }}>No employees assigned to this lead.</div>
                      ) : (
                        <table className="crm-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th style={{ paddingLeft: 72 }}>Name</th>
                              <th>Email</th>
                              <th>Phone</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {team.map(emp => (
                              <tr key={emp.id}>
                                <td style={{ paddingLeft: 72, fontWeight: 500 }}>{emp.name || '—'}</td>
                                <td>{emp.email}</td>
                                <td>{emp.phone || '—'}</td>
                                <td><span className={`badge ${emp.is_active ? 'badge-emerald' : 'badge-amber'}`}>{emp.is_active ? 'Active' : 'Disabled'}</span></td>
                                <td>
                                  <div className="row gap-6">
                                    <button onClick={() => openAdminEdit(emp)} className="btn btn-ghost btn-sm" style={{ color: 'var(--child)' }}>Edit</button>
                                    <button onClick={() => setDeleteUserId(emp.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--ember)' }}>Delete</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Unassigned employees ── */}
        {employees.filter(e => !e.lead_id).length > 0 && (
          <section>
            <h3 style={{ fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Unassigned Employees</h3>
            <div className="table-wrapper">
              <table className="crm-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {employees.filter(e => !e.lead_id).map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.name || '—'}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || '—'}</td>
                      <td><span className={`badge ${u.is_active ? 'badge-emerald' : 'badge-amber'}`}>{u.is_active ? 'Active' : 'Disabled'}</span></td>
                      <td>
                        <div className="row gap-6">
                          <button onClick={() => openAdminEdit(u)} className="btn btn-ghost btn-sm" style={{ color: 'var(--child)' }}>Edit</button>
                          <button onClick={() => setDeleteUserId(u.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--ember)' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? 'Edit Staff' : 'Add New Staff'}>
        <form onSubmit={handleAdminSubmit} className="stack gap-12" style={{ marginTop: 20 }}>
          <div className="field">
            <label className="label">Email</label>
            <input type="email" className="input" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          <div className="field">
            <label className="label">{editingUser ? 'New Password (leave blank to keep current)' : 'Password'}</label>
            <input type="password" className="input" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
          </div>
          <div className="field">
            <label className="label">Role</label>
            <select className="input" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
              <option value="ADMIN">Admin</option>
              <option value="LEAD">Lead</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>
          {formData.role === 'EMPLOYEE' && (
            <div className="field">
              <label className="label">Assign to Lead</label>
              <select className="input" value={formData.lead_id} onChange={e => setFormData({ ...formData, lead_id: e.target.value })} required>
                <option value="">-- Select Lead --</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.email} {l.name ? `(${l.name})` : ''}</option>)}
              </select>
            </div>
          )}
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="is_active_chk" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} style={{ width: 16, height: 16 }} />
            <label htmlFor="is_active_chk" className="label" style={{ cursor: 'pointer', margin: 0 }}>Account Active</label>
          </div>
          <div className="row gap-12" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary">{editingUser ? 'Update Staff' : 'Create Staff'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteUserId !== null}
        onClose={() => setDeleteUserId(null)}
        onConfirm={handleAdminDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? All owned records may lose their primary owner."
        confirmText="Delete"
      />
    </>
  );
};

export default UsersPage;
