'use client';

import { useState, useEffect } from 'react';
import { parseParticipantCSV } from '@/lib/csv-parser';
import { Navbar } from '@/components/shared/Navbar';
import { Sidebar } from '@/components/shared/Sidebar';

interface RegistrationItem {
  id: string;
  qrToken: string;
  attended: boolean;
  status: 'Checked in' | 'Registered' | 'No-show';
  attendedAt?: string;
  participant: {
    fullName: string;
    email: string;
  };
}

const MOCK_PARTICIPANTS: RegistrationItem[] = [
  {
    id: '1',
    qrToken: 'tok_1',
    attended: true,
    status: 'Checked in',
    participant: { fullName: 'Nadeesha Perera', email: 'nadeesha@example.com' },
  },
  {
    id: '2',
    qrToken: 'tok_2',
    attended: false,
    status: 'Registered',
    participant: { fullName: 'Kasun Fernando', email: 'kasun@example.com' },
  },
  {
    id: '3',
    qrToken: 'tok_3',
    attended: false,
    status: 'No-show',
    participant: { fullName: 'Ishara Silva', email: 'ishara@example.com' },
  },
  {
    id: '4',
    qrToken: 'tok_4',
    attended: true,
    status: 'Checked in',
    participant: { fullName: 'Tharindu Jayasuriya', email: 'tharindu@example.com' },
  },
];

export default function ParticipantsPage() {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>(MOCK_PARTICIPANTS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'CHECKED_IN' | 'REGISTERED' | 'NO_SHOW'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const eventId = 'sample-event-id';

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    try {
      const res = await fetch(`/api/participants?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const formatted = data.map((item: any) => ({
            ...item,
            status: item.attended ? 'Checked in' : 'Registered',
          }));
          setRegistrations(formatted);
        }
      }
    } catch (err) {
      // Retain design system spec mock participants
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, fullName, email }),
      });
      if (res.ok) {
        setFullName('');
        setEmail('');
        setShowAddModal(false);
        fetchParticipants();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvImport = async () => {
    const parsed = parseParticipantCSV(csvText);
    if (parsed.length === 0) return alert('No valid CSV records found');
    setSubmitting(true);
    try {
      const res = await fetch('/api/participants/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, participants: parsed }),
      });
      if (res.ok) {
        setCsvText('');
        setShowCsvModal(false);
        fetchParticipants();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Live Search & Filter Logic (Matches Name & Email instantly)
  const filtered = registrations.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      item.participant.fullName.toLowerCase().includes(query) ||
      item.participant.email.toLowerCase().includes(query);

    if (filter === 'CHECKED_IN') return matchesSearch && item.status === 'Checked in';
    if (filter === 'REGISTERED') return matchesSearch && item.status === 'Registered';
    if (filter === 'NO_SHOW') return matchesSearch && item.status === 'No-show';
    return matchesSearch;
  });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Checked in':
        return { bg: '#D1FAE5', color: '#065F46' };
      case 'No-show':
        return { bg: '#FEE2E2', color: '#991B1B' };
      default:
        return { bg: '#DBEAFE', color: '#1E40AF' };
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '32px 40px' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            
            {/* Card Container */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          
          {/* Top Label */}
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
            PARTICIPANT LIST
          </div>

          {/* Live Search & Filter Bar (Design System Match) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            
            {/* Search Input (Name or Email Live Filter) */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search participants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '260px',
                  padding: '10px 16px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '24px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            {/* Status Filter Pills */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setFilter('ALL')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  border: filter === 'ALL' ? 'none' : '1px solid #D1D5DB',
                  backgroundColor: filter === 'ALL' ? '#184F95' : '#FFFFFF',
                  color: filter === 'ALL' ? '#FFFFFF' : '#374151',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                All (1,520)
              </button>

              <button
                onClick={() => setFilter('CHECKED_IN')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  border: filter === 'CHECKED_IN' ? 'none' : '1px solid #D1D5DB',
                  backgroundColor: filter === 'CHECKED_IN' ? '#184F95' : '#FFFFFF',
                  color: filter === 'CHECKED_IN' ? '#FFFFFF' : '#374151',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Checked in
              </button>

              <button
                onClick={() => setFilter('REGISTERED')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  border: filter === 'REGISTERED' ? 'none' : '1px solid #D1D5DB',
                  backgroundColor: filter === 'REGISTERED' ? '#184F95' : '#FFFFFF',
                  color: filter === 'REGISTERED' ? '#FFFFFF' : '#374151',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Registered
              </button>

              <button
                onClick={() => setFilter('NO_SHOW')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  border: filter === 'NO_SHOW' ? 'none' : '1px solid #D1D5DB',
                  backgroundColor: filter === 'NO_SHOW' ? '#184F95' : '#FFFFFF',
                  color: filter === 'NO_SHOW' ? '#FFFFFF' : '#374151',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                No-show
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowCsvModal(true)}
                style={{
                  border: '1.5px solid #184F95',
                  backgroundColor: '#FFFFFF',
                  color: '#184F95',
                  padding: '8px 20px',
                  borderRadius: '24px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Import CSV
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  backgroundColor: '#184F95',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '24px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 16px', width: '40px' }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      style={{ cursor: 'pointer', borderRadius: '4px' }}
                    />
                  </th>
                  <th style={{ padding: '14px 20px' }}>PARTICIPANT</th>
                  <th style={{ padding: '14px 20px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>Loading participants...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>No participants found matching "{search}".</td></tr>
                ) : (
                  filtered.map((item) => {
                    const badge = getStatusBadgeStyle(item.status);
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: isSelected ? '#F3F4F6' : '#FFFFFF' }}>
                        <td style={{ padding: '16px 16px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(item.id)}
                            style={{ cursor: 'pointer', borderRadius: '4px' }}
                          />
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: '700', color: '#111827' }}>{item.participant.fullName}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{item.participant.email}</div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span
                            style={{
                              padding: '6px 16px',
                              borderRadius: '16px',
                              fontSize: '12px',
                              fontWeight: '700',
                              backgroundColor: badge.bg,
                              color: badge.color,
                              display: 'inline-block',
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <form onSubmit={handleAddParticipant} style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>Add New Participant</h3>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', marginBottom: '14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '12px 14px', marginBottom: '20px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 18px', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', backgroundColor: '#FFF' }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ padding: '10px 18px', backgroundColor: '#184F95', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                {submitting ? 'Adding...' : 'Add & Send Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>Import Participants via CSV</h3>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 16px 0' }}>Paste CSV content (fullName, email, ticketType):</p>
            <textarea
              rows={6}
              placeholder="fullName,email,ticketType&#10;Nadeesha Perera,nadeesha@example.com,VIP&#10;Kasun Fernando,kasun@example.com,Regular"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', marginBottom: '20px', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowCsvModal(false)} style={{ padding: '10px 18px', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', backgroundColor: '#FFF' }}>Cancel</button>
              <button onClick={handleCsvImport} disabled={submitting} style={{ padding: '10px 18px', backgroundColor: '#184F95', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                {submitting ? 'Importing...' : 'Import & Dispatch Tickets'}
              </button>
            </div>
          </div>
        </div>
      )}
        </main>
      </div>
    </div>
  );
}
