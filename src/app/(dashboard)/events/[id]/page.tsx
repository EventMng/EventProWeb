'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
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

interface EventDetail {
  id: string;
  name: string;
  location: string | null;
  eventDate: string;
  status: 'Live' | 'Upcoming' | 'Completed';
}

interface EventStaffItem {
  id: string;
  fullName: string;
  email: string;
  imageUrl?: string | null;
  role: string;
  assignedAt: string;
}

interface OrgMemberOption {
  id: string;
  fullName: string;
  email: string;
}

type RawRegistration = Omit<RegistrationItem, 'status'>;

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eventId = resolvedParams.id;

  const [eventInfo, setEventInfo] = useState<EventDetail | null>(null);
  const [eventLoadError, setEventLoadError] = useState(false);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'CHECKED_IN' | 'REGISTERED' | 'NO_SHOW'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Event Staff states
  const [eventStaff, setEventStaff] = useState<EventStaffItem[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([]);
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [ticketType, setTicketType] = useState('General');
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSendingPasses, setIsSendingPasses] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  const handleSendSelectedPasses = async () => {
    const targets = selectedIds.length > 0 ? selectedIds : registrations.map(r => r.id);
    if (targets.length === 0) return alert('No participants to send passes to.');

    setIsSendingPasses(true);
    let successCount = 0;
    for (const id of targets) {
      try {
        const res = await fetch(`/api/participants/${id}/resend`, { method: 'POST' });
        if (res.ok) successCount++;
      } catch (err) {
        console.error(err);
      }
    }
    setIsSendingPasses(false);
    setSendSuccessMsg(`Successfully dispatched ${successCount} QR ticket pass(es)!`);
    setTimeout(() => setSendSuccessMsg(null), 5000);
  };

  const fetchEventInfo = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      setEventInfo(await res.json());
    } catch {
      setEventLoadError(true);
    }
  };

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/participants?eventId=${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch participants');
      const data: RawRegistration[] = await res.json();
      const formatted = data.map((item) => ({
        ...item,
        status: item.attended ? 'Checked in' as const : 'Registered' as const,
      }));
      setRegistrations(formatted);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventStaff = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/staff`);
      if (res.ok) setEventStaff(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrgMembers = async () => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        setOrgMembers(data.map((m: any) => ({ id: m.id, fullName: m.fullName, email: m.email })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchEventInfo();
      await fetchParticipants();
      await fetchEventStaff();
      await fetchOrgMembers();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;

    setIsAssigningStaff(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedStaffId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedStaffId('');
        setShowAssignStaffModal(false);
        fetchEventStaff();
      } else {
        setAssignError(data.error ?? 'Failed to assign staff member.');
      }
    } catch (err: any) {
      setAssignError(err.message ?? 'Failed to assign staff.');
    } finally {
      setIsAssigningStaff(false);
    }
  };

  const handleRemoveStaff = async (userId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/staff?userId=${userId}`, { method: 'DELETE' });
      if (res.ok) fetchEventStaff();
    } catch (err) {
      console.error(err);
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
        return { bg: '#ECFDF5', color: '#059669' };
      case 'No-show':
        return { bg: '#FEF2F2', color: '#DC2626' };
      default:
        return { bg: '#EFF6FF', color: '#2563EB' };
    }
  };

  const getTicketBadgeStyle = (ticketType: string) => {
    switch (ticketType) {
      case 'VIP':
        return { bg: '#FEF3C7', color: '#D97706' };
      case 'Staff':
        return { bg: '#F3E8FF', color: '#7C3AED' };
      default:
        return { bg: '#F3F4F6', color: '#4B5563' };
    }
  };

  const unassignedMembers = orgMembers.filter(
    (m) => !eventStaff.some((s) => s.id === m.id)
  );

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
        {/* Breadcrumb & Navigation Back Link */}
        <div style={{ marginBottom: '16px' }}>
          <Link
            href="/events"
            style={{
              color: '#6B7280',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Back to Events
          </Link>
        </div>

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
              {eventLoadError ? 'Event not found' : eventInfo ? eventInfo.name : 'Loading…'}
            </h1>
            {eventInfo && (
              <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>
                  {new Date(eventInfo.eventDate).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
                <span>•</span>
                <span>{eventInfo.location || '—'}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSendSelectedPasses}
              disabled={isSendingPasses}
              style={{
                backgroundColor: '#059669',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: isSendingPasses ? 'default' : 'pointer',
                fontFamily: "'Urbanist', sans-serif",
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                opacity: isSendingPasses ? 0.7 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
              {isSendingPasses ? 'Sending Passes...' : selectedIds.length > 0 ? `Send Passes (${selectedIds.length})` : 'Send Passes (Invitations)'}
            </button>

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

        {sendSuccessMsg && (
          <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined">mark_email_read</span>
            {sendSuccessMsg}
          </div>
        )}

        {/* Assigned Event Staff Section */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                ASSIGNED EVENT STAFF ({eventStaff.length})
              </div>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0', fontWeight: '600' }}>
                Allocate organization members to scan ticket QR codes for this specific event.
              </p>
            </div>
            <button
              onClick={() => setShowAssignStaffModal(true)}
              style={{
                backgroundColor: '#F3E8FF',
                color: '#7C3AED',
                border: '1px solid #E9D5FF',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: "'Urbanist', sans-serif",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group_add</span>
              Assign Member to Event
            </button>
          </div>

          {eventStaff.length === 0 ? (
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px dashed #D1D5DB', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
              No staff members assigned to scan tickets for this event yet. Click <strong>"Assign Member to Event"</strong> to assign event roles.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {eventStaff.map((staff) => (
                <div
                  key={staff.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px', flexShrink: 0 }}>
                      {staff.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {staff.fullName}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ backgroundColor: '#F3E8FF', color: '#7C3AED', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>
                          FRONTMAN (MOBILE)
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveStaff(staff.id)}
                    title="Remove from Event"
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#EF4444',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>remove_circle_outline</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card Container - Participant List */}
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
                All ({registrations.length})
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
              ) : loadError ? (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#DC2626' }}>Failed to load participants. Please try again.</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
                  {registrations.length === 0 ? 'No participants registered yet.' : `No participants found matching "${search}".`}
                </td></tr>
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

        {/* Assign Staff Modal */}
        {showAssignStaffModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <form onSubmit={handleAssignStaff} style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>
                Assign Event Staff
              </h3>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0' }}>
                Select an organization member to grant <strong>Frontman (Mobile Scanner)</strong> role for this event.
              </p>

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Select Staff Member
              </label>
              {unassignedMembers.length === 0 ? (
                <div style={{ padding: '12px', backgroundColor: '#FEF3C7', color: '#D97706', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
                  All organization members are already assigned to this event or no other members exist.
                </div>
              ) : (
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 14px', marginBottom: '20px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value="">-- Choose Member --</option>
                  {unassignedMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.email})
                    </option>
                  ))}
                </select>
              )}

              {assignError && (
                <div style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>
                  {assignError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => { setShowAssignStaffModal(false); setSelectedStaffId(''); setAssignError(null); }} style={{ padding: '10px 18px', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', backgroundColor: '#FFF' }}>
                  Cancel
                </button>
                <button type="submit" disabled={isAssigningStaff || unassignedMembers.length === 0} style={{ padding: '10px 18px', backgroundColor: '#7C3AED', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', opacity: (isAssigningStaff || unassignedMembers.length === 0) ? 0.6 : 1 }}>
                  {isAssigningStaff ? 'Assigning...' : 'Assign Role'}
                </button>
              </div>
            </form>
          </div>
        )}

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
                  {submitting ? 'Adding...' : 'Add Participant'}
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
              <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 12px 0' }}>Upload a .csv file, or paste its content below (fullName, email, ticketType):</p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setCsvText(String(reader.result ?? ''));
                  reader.readAsText(file);
                  e.target.value = '';
                }}
                style={{ width: '100%', marginBottom: '14px', fontSize: '13px', color: '#4B5563' }}
              />
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
                  {submitting ? 'Importing...' : 'Import Participants'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
