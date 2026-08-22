'use client';

import { useState, useEffect } from 'react';
import { parseParticipantCSV } from '@/lib/csv-parser';

interface RegistrationItem {
  id: string;
  qrToken: string;
  attended: boolean;
  attendedAt?: string;
  participant: {
    fullName: string;
    email: string;
  };
}

export default function ParticipantsPage() {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'CHECKED_IN' | 'REGISTERED'>('ALL');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active Event ID
  const eventId = 'sample-event-id';

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/participants?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  // Filter & Search logic
  const filtered = registrations.filter((item) => {
    const matchesSearch =
      item.participant.fullName.toLowerCase().includes(search.toLowerCase()) ||
      item.participant.email.toLowerCase().includes(search.toLowerCase());
    if (filter === 'CHECKED_IN') return matchesSearch && item.attended;
    if (filter === 'REGISTERED') return matchesSearch && !item.attended;
    return matchesSearch;
  });

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#111827', margin: 0 }}>Participants</h1>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: '4px 0 0 0' }}>Manage event attendees and issue digital QR tickets.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowCsvModal(true)}
            style={{ border: '1px solid #D1D5DB', backgroundColor: '#FFFFFF', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
          >
            Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ backgroundColor: '#184F95', color: '#FFFFFF', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
          >
            + Add Participant
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Filter Pills */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '16px' }}>
        <input
          type="text"
          placeholder="Search participants by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '320px', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilter('ALL')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: filter === 'ALL' ? '#184F95' : '#F3F4F6',
              color: filter === 'ALL' ? '#FFFFFF' : '#374151',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            All ({registrations.length})
          </button>
          <button
            onClick={() => setFilter('CHECKED_IN')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: filter === 'CHECKED_IN' ? '#184F95' : '#F3F4F6',
              color: filter === 'CHECKED_IN' ? '#FFFFFF' : '#374151',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Checked In
          </button>
          <button
            onClick={() => setFilter('REGISTERED')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: filter === 'REGISTERED' ? '#184F95' : '#F3F4F6',
              color: filter === 'REGISTERED' ? '#FFFFFF' : '#374151',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Registered
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', textTransform: 'uppercase', fontSize: '12px' }}>
              <th style={{ padding: '14px 20px' }}>Participant</th>
              <th style={{ padding: '14px 20px' }}>Email</th>
              <th style={{ padding: '14px 20px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>Loading participants...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>No participants found.</td></tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: '#111827' }}>{item.participant.fullName}</td>
                  <td style={{ padding: '16px 20px', color: '#4B5563' }}>{item.participant.email}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: item.attended ? '#E6F4ED' : '#DBEAFE',
                        color: item.attended ? '#0D5235' : '#032042',
                      }}
                    >
                      {item.attended ? 'Checked in' : 'Registered'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <form onSubmit={handleAddParticipant} style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', width: '400px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Add New Participant</h3>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', marginBottom: '12px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', marginBottom: '16px', border: '1px solid #D1D5DB', borderRadius: '6px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', border: '1px solid #D1D5DB', borderRadius: '6px' }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ padding: '8px 16px', backgroundColor: '#184F95', color: '#FFF', border: 'none', borderRadius: '6px' }}>
                {submitting ? 'Adding...' : 'Add & Send Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '12px', width: '500px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Import Participants via CSV</h3>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 12px 0' }}>Paste CSV content (fullName, email, ticketType):</p>
            <textarea
              rows={6}
              placeholder="fullName,email,ticketType&#10;Kasun Fernando,kasun@example.com,VIP"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowCsvModal(false)} style={{ padding: '8px 16px', border: '1px solid #D1D5DB', borderRadius: '6px' }}>Cancel</button>
              <button onClick={handleCsvImport} disabled={submitting} style={{ padding: '8px 16px', backgroundColor: '#184F95', color: '#FFF', border: 'none', borderRadius: '6px' }}>
                {submitting ? 'Importing...' : 'Import & Dispatch Tickets'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
