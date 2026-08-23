'use client';

import { Sidebar } from '@/components/shared/Sidebar';

export default function MembersPage() {
  const members = [
    { id: '1', name: 'Sanduni Perera', email: 'sanduni@apexevents.com', role: 'ORGANIZER', status: 'Active' },
    { id: '2', name: 'Kamal Jayawardena', email: 'kamal@apexevents.com', role: 'FRONTMAN', status: 'Active' },
    { id: '3', name: 'Nimal Fernando', email: 'nimal@apexevents.com', role: 'FRONTMAN', status: 'Invited' },
  ];

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
        {/* Top Header matching Image 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Members
          </h1>

          <button
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
            Invite member
          </button>
        </div>

        {/* Table Container */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '20px' }}>
            ORGANIZATION MEMBERS
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>NAME</th>
                <th style={{ padding: '12px 16px' }}>EMAIL</th>
                <th style={{ padding: '12px 16px' }}>ROLE</th>
                <th style={{ padding: '12px 16px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '18px 16px', fontWeight: '700', color: '#111827' }}>
                    {member.name}
                  </td>
                  <td style={{ padding: '18px 16px', color: '#4B5563', fontSize: '13px' }}>
                    {member.email}
                  </td>
                  <td style={{ padding: '18px 16px' }}>
                    <span style={{ backgroundColor: '#EFF6FF', color: '#2563EB', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '700' }}>
                      {member.role}
                    </span>
                  </td>
                  <td style={{ padding: '18px 16px' }}>
                    <span style={{ backgroundColor: member.status === 'Active' ? '#ECFDF5' : '#FFEDD5', color: member.status === 'Active' ? '#059669' : '#EA580C', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '700' }}>
                      {member.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
