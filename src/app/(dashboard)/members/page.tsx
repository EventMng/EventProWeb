'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';

interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: 'ORGANIZER' | 'FRONTMAN' | 'ORG_ADMIN';
  imageUrl?: string | null;
  status: 'Active' | 'Temp Password Issued';
  tempPassword?: string;
}

interface ApiMember {
  id: string;
  fullName: string;
  email: string;
  role: 'ORGANIZER' | 'FRONTMAN' | 'ORG_ADMIN' | 'SYSTEM_ADMIN';
  imageUrl?: string | null;
  isTemporaryPassword: boolean;
}

function toMemberItem(m: ApiMember): MemberItem {
  return {
    id: m.id,
    name: m.fullName,
    email: m.email,
    role: m.role as MemberItem['role'],
    imageUrl: m.imageUrl,
    status: m.isTemporaryPassword ? 'Temp Password Issued' : 'Active',
  };
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [issuedTempPass, setIssuedTempPass] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      try {
        const res = await fetch('/api/members');
        if (!res.ok) throw new Error(`Failed to load members (${res.status})`);
        const data: ApiMember[] = await res.json();
        if (!cancelled) setMembers(data.map(toMemberItem));
      } catch (err: any) {
        if (!cancelled) setLoadError(err.message ?? 'Failed to load members');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setSubmitError('Image size must be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, imageUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error === 'EMAIL_TAKEN' ? 'That email is already in use.' : (data.error ?? 'Failed to add member.'));
        return;
      }

      const newItem = toMemberItem(data.member);
      setMembers((prev) => [...prev, newItem]);
      setIssuedTempPass('ADDED');
    } catch (err: any) {
      setSubmitError(err.message ?? 'Failed to add member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setFullName('');
    setEmail('');
    setImageUrl('');
    setIssuedTempPass(null);
    setSubmitError(null);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ORG_ADMIN':
        return { bg: '#FEF3C7', color: '#D97706', label: 'ORG ADMIN' };
      case 'ORGANIZER':
        return { bg: '#EFF6FF', color: '#2563EB', label: 'ORGANIZER' };
      case 'FRONTMAN':
        return { bg: '#F3E8FF', color: '#7C3AED', label: 'FRONTMAN (MOBILE)' };
      default:
        return { bg: '#F3F4F6', color: '#4B5563', label: role };
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
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Organization Members
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0', fontWeight: '600' }}>
              Add staff members to your organization and generate temporary passwords. Event roles are assigned when allocating members to specific events.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: "'Urbanist', sans-serif",
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
            Add Member
          </button>
        </div>

        {/* Table Container */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '20px' }}>
            ALL TEAM MEMBERS ({members.length})
          </div>

          {isLoading && (
            <div style={{ padding: '24px', color: '#6B7280', fontSize: '14px' }}>Loading members...</div>
          )}

          {loadError && (
            <div style={{ padding: '16px', backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              {loadError}
            </div>
          )}

          {!isLoading && !loadError && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>NAME</th>
                <th style={{ padding: '12px 16px' }}>EMAIL (USERNAME)</th>
                <th style={{ padding: '12px 16px' }}>APP CREDENTIALS</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                return (
                  <tr key={member.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '18px 16px', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {member.imageUrl ? (
                        <img src={member.imageUrl} alt={member.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {member.name}
                    </td>
                    <td style={{ padding: '18px 16px', color: '#4B5563', fontSize: '13px' }}>
                      {member.email}
                    </td>
                    <td style={{ padding: '18px 16px' }}>
                      {member.tempPassword ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                            Temp Pass: {member.tempPassword}
                          </span>
                        </div>
                      ) : (
                        <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '700' }}>
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>

        {/* Add Member Modal */}
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              {!issuedTempPass ? (
                <form onSubmit={handleAddMember}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>
                    Add Team Member
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0' }}>
                    Members do not register themselves. Org Admin adds them to the organization and generates temporary passwords for mobile app access.
                  </p>

                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                    Profile Photo
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    {imageUrl ? (
                      <div style={{ position: 'relative' }}>
                        <img src={imageUrl} alt="Preview" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563EB' }} />
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', color: '#FFF', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#F3F4F6', border: '2px dashed #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>account_circle</span>
                      </div>
                    )}
                    <div>
                      <label style={{ display: 'inline-block', backgroundColor: '#EFF6FF', color: '#2563EB', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                        Upload Photo
                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                      </label>
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>PNG, JPG or WEBP up to 2MB</div>
                    </div>
                  </div>

                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kasun Jayawardena"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', marginBottom: '14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                  />

                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                    Email (App Login Username)
                  </label>
                  <input
                    type="email"
                    placeholder="kasun@apexevents.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', marginBottom: '20px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                  />

                  {submitError && (
                    <div style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>
                      {submitError}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" onClick={handleCloseModal} style={{ padding: '10px 18px', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', backgroundColor: '#FFF' }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} style={{ padding: '10px 18px', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: isSubmitting ? 'default' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                      {isSubmitting ? 'Adding Member...' : 'Add Member'}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#059669' }}>check_circle</span>
                    <h3 style={{ margin: '8px 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>
                      Member Added Successfully!
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                      Member has been added to your organization team.
                    </p>
                  </div>

                  <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '700', marginBottom: '4px' }}>MEMBER EMAIL</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>{email}</div>

                    <div style={{ fontSize: '12px', color: '#2563EB', fontWeight: '700', marginTop: '8px' }}>💡 FRONTMAN MOBILE APP ACCESS</div>
                    <div style={{ fontSize: '13px', color: '#4B5563', marginTop: '4px' }}>
                      To issue mobile app scanner credentials, go to an <strong>Event</strong> and assign this member as an <strong>Event Frontman</strong>.
                    </div>
                  </div>

                  <button
                    onClick={handleCloseModal}
                    style={{ width: '100%', padding: '12px', backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
