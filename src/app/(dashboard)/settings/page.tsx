'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  fontFamily: "'Urbanist', sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '700',
  color: '#374151',
  marginBottom: '6px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid #E5E7EB',
  maxWidth: '640px',
  marginBottom: '24px',
};

const saveButtonStyle = (disabled: boolean): React.CSSProperties => ({
  backgroundColor: '#2563EB',
  color: '#FFFFFF',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '700',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.7 : 1,
  fontFamily: "'Urbanist', sans-serif",
});

function Banner({ kind, message }: { kind: 'error' | 'success'; message: string }) {
  const isError = kind === 'error';
  return (
    <div
      style={{
        backgroundColor: isError ? '#FEF2F2' : '#ECFDF5',
        color: isError ? '#B91C1C' : '#065F46',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '13px',
        fontWeight: '600',
        marginBottom: '16px',
      }}
    >
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  // Organization Profile
  const [orgName, setOrgName] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [orgSuccess, setOrgSuccess] = useState(false);

  // Your Account — email
  const [email, setEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setOrgName(data.user.organizationName);
        setEmail(data.user.email);
        setRole(data.user.role);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveOrgName = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgError(null);
    setOrgSuccess(false);
    setOrgSaving(true);
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrgError(data.error ?? 'Failed to update organization.');
        return;
      }
      setOrgName(data.organization.name);
      setOrgSuccess(true);
    } catch {
      setOrgError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setOrgSaving(false);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(false);
    setEmailSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error ?? 'Failed to update email.');
        return;
      }
      setEmail(data.user.email);
      setEmailSuccess(true);
    } catch {
      setEmailError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error ?? 'Failed to change password.');
        return;
      }
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch {
      setPasswordError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#F9FAFB',
        fontFamily: "'Urbanist', sans-serif",
      }}
    >
      <Sidebar />
      <main style={{ flex: 1, padding: '36px 48px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: '0 0 32px 0', letterSpacing: '-0.02em' }}>
          Settings
        </h1>

        {loading ? (
          <div style={{ color: '#6B7280', fontSize: '14px' }}>Loading settings...</div>
        ) : loadError ? (
          <div style={{ color: '#DC2626', fontSize: '14px', fontWeight: '600' }}>Failed to load settings.</div>
        ) : (
          <>
            {/* Organization Profile — ORG_ADMIN only */}
            {role === 'ORG_ADMIN' && (
              <form onSubmit={handleSaveOrgName} style={cardStyle}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '20px' }}>
                  ORGANIZATION PROFILE
                </div>

                {orgError && <Banner kind="error" message={orgError} />}
                {orgSuccess && <Banner kind="success" message="Organization name updated." />}

                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => { setOrgName(e.target.value); setOrgSuccess(false); }}
                    required
                    style={inputStyle}
                  />
                </div>

                <button type="submit" disabled={orgSaving} style={saveButtonStyle(orgSaving)}>
                  {orgSaving ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            )}

            {/* Your Account — email, any authenticated role */}
            <form onSubmit={handleSaveEmail} style={cardStyle}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '20px' }}>
                YOUR ACCOUNT
              </div>

              {emailError && <Banner kind="error" message={emailError} />}
              {emailSuccess && <Banner kind="success" message="Email updated." />}

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailSuccess(false); }}
                  required
                  autoComplete="email"
                  style={inputStyle}
                />
              </div>

              <button type="submit" disabled={emailSaving} style={saveButtonStyle(emailSaving)}>
                {emailSaving ? 'Saving...' : 'Save changes'}
              </button>
            </form>

            {/* Change Password */}
            <form onSubmit={handleChangePassword} style={cardStyle}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '20px' }}>
                CHANGE PASSWORD
              </div>

              {passwordError && <Banner kind="error" message={passwordError} />}
              {passwordSuccess && <Banner kind="success" message="Password changed successfully." />}

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </div>

              <button type="submit" disabled={passwordSaving} style={saveButtonStyle(passwordSaving)}>
                {passwordSaving ? 'Saving...' : 'Change password'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
