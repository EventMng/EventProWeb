'use client';

import { useState, useEffect } from 'react';
import { parseParticipantCSV } from '@/lib/csv-parser';
import { Sidebar } from '@/components/shared/Sidebar';

interface RegistrationItem {
  id: string;
  qrToken: string;
  attended: boolean;
  status: 'Checked in' | 'Registered' | 'No-show';
  attendedAt?: string;
  ticketType: string;
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
    ticketType: 'VIP',
    participant: { fullName: 'Nadeesha Perera', email: 'nadeesha@example.com' },
  },
  {
    id: '2',
    qrToken: 'tok_2',
    attended: false,
    status: 'Registered',
    ticketType: 'General',
    participant: { fullName: 'Kasun Fernando', email: 'kasun@example.com' },
  },
  {
    id: '3',
    qrToken: 'tok_3',
    attended: false,
    status: 'No-show',
    ticketType: 'General',
    participant: { fullName: 'Ishara Silva', email: 'ishara@example.com' },
  },
  {
    id: '4',
    qrToken: 'tok_4',
    attended: true,
    status: 'Checked in',
    ticketType: 'Staff',
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
  const [ticketType, setTicketType] = useState('General');
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
        body: JSON.stringify({ eventId, fullName, email, ticketType }),
      });
      if (res.ok) {
        setFullName('');
        setEmail('');
        setTicketType('General');
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

  const getTicketBadgeStyle = (ticketType: string) => {
    switch (ticketType) {
      case 'VIP':
        return { bg: '#FEF3C7', color: '#92400E' };
      case 'Staff':
        return { bg: '#EDE9FE', color: '#5B21B6' };
      default:
        return { bg: '#F3F4F6', color: '#374151' };
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
        {/* Top Header matching Image 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Participants
          </h1>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowCsvModal(true)}
              style={{
                border: '1.5px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: "'Urbanist', sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload_file</span>
              Import CSV
            </button>

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
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Add participant
            </button>
          </div>
        </div>

        {/* Card Container */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
          {/* Top Label */}
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '20px' }}>
            PARTICIPANT LIST
          </div>

          {/* Live Search & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search participants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '280px',
                  padding: '10px 18px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '24px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  fontFamily: "'Urbanist', sans-serif",
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
                  border: filter === 'ALL' ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: filter === 'ALL' ? '#2563EB' : '#FFFFFF',
                  color: filter === 'ALL' ? '#FFFFFF' : '#4B5563',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: "'Urbanist', sans-serif",
                }}
              >
                All (1,520)
              </button>

              <button
                onClick={() => setFilter('CHECKED_IN')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  border: filter === 'CHECKED_IN' ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: filter === 'CHECKED_IN' ? '#2563EB' : '#FFFFFF',
                  color: filter === 'CHECKED_IN' ? '#FFFFFF' : '#4B5563',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: "'Urbanist', sans-serif",
                }}
              >
                Checked in
              </button>

              <button
                onClick={() => setFilter('REGISTERED')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  border: filter === 'REGISTERED' ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: filter === 'REGISTERED' ? '#2563EB' : '#FFFFFF',
                  color: filter === 'REGISTERED' ? '#FFFFFF' : '#4B5563',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: "'Urbanist', sans-serif",
                }}
              >
                Registered
              </button>

              <button
                onClick={() => setFilter('NO_SHOW')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  border: filter === 'NO_SHOW' ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: filter === 'NO_SHOW' ? '#2563EB' : '#FFFFFF',
                  color: filter === 'NO_SHOW' ? '#FFFFFF' : '#4B5563',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: "'Urbanist', sans-serif",
                }}
              >
                No-show
              </button>
            </div>
          </div>

          {/* Table Container */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    style={{ cursor: 'pointer', borderRadius: '4px' }}
                  />
                </th>
                <th style={{ padding: '12px 16px' }}>PARTICIPANT</th>
                <th style={{ padding: '12px 16px' }}>TICKET</th>
                <th style={{ padding: '12px 16px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>Loading participants...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>No participants found matching "{search}".</td></tr>
              ) : (
                filtered.map((item) => {
                  const badge = getStatusBadgeStyle(item.status);
                  const ticketBadge = getTicketBadgeStyle(item.ticketType);
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: isSelected ? '#F9FAFB' : 'transparent' }}>
                      <td style={{ padding: '18px 16px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(item.id)}
                          style={{ cursor: 'pointer', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ padding: '18px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#111827' }}>{item.participant.fullName}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{item.participant.email}</div>
                      </td>
                      <td style={{ padding: '18px 16px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: '700',
                            backgroundColor: ticketBadge.bg,
                            color: ticketBadge.color,
                            display: 'inline-block',
                          }}
                        >
                          {item.ticketType}
                        </span>
                      </td>
                      <td style={{ padding: '18px 16px' }}>
                        <span
                          style={{
                            padding: '4px 12px',
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
                style={{ width: '100%', padding: '12px 14px', marginBottom: '14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              />
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', marginBottom: '20px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: '#FFFFFF', color: '#111827' }}
              >
                <option value="General">General</option>
                <option value="VIP">VIP</option>
                <option value="Staff">Staff</option>
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '10px 18px', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', backgroundColor: '#FFF' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 18px', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
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
                <button onClick={handleCsvImport} disabled={submitting} style={{ padding: '10px 18px', backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                  {submitting ? 'Importing...' : 'Import & Dispatch Tickets'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
