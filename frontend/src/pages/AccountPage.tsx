import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const AccountPage = () => {
  const { user, token, refreshProfile } = useCustomerAuth();

  // Profile form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Pre-fill profile form when user loads
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await api.patch('/customer/me', { name, phone }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post('/customer/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Account</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>
          Manage your profile information and security settings.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 8 }}>

        {/* ── Profile form ─────────────────────────────── */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r)',
            padding: 28,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Profile Information</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
              Update your name and phone number. Your email address cannot be changed here.
            </p>
          </div>

          <form onSubmit={handleProfileSave} className="stack gap-16">
            {/* Read-only email */}
            <div className="field">
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                Email cannot be changed.
              </span>
            </div>

            <div className="field">
              <label className="label">Full name</label>
              <input
                id="account-name"
                className="input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                maxLength={80}
                required
              />
            </div>

            <div className="field">
              <label className="label">Phone number</label>
              <input
                id="account-phone"
                className="input"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                maxLength={20}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                id="account-save-btn"
                type="submit"
                className="btn btn-primary"
                disabled={profileLoading}
              >
                {profileLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Password form ─────────────────────────────── */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r)',
            padding: 28,
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Change Password</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
              Choose a strong password. You'll need your current password to confirm the change.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="stack gap-16">
            <div className="field">
              <label className="label">Current password</label>
              <input
                id="account-current-password"
                className="input"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="field">
              <label className="label">New password</label>
              <input
                id="account-new-password"
                className="input"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="field">
              <label className="label">Confirm new password</label>
              <input
                id="account-confirm-password"
                className="input"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                minLength={8}
                required
                autoComplete="new-password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <span style={{ fontSize: 12, color: 'var(--ember, #c0392b)', marginTop: 4, display: 'block' }}>
                  Passwords do not match.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                id="account-change-password-btn"
                type="submit"
                className="btn btn-primary"
                disabled={passwordLoading || !currentPassword || !newPassword || newPassword !== confirmPassword}
              >
                {passwordLoading ? 'Updating…' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
