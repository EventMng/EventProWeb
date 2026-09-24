'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Sidebar } from '@/components/shared/Sidebar';
import { EventComparisonChart } from '@/components/organizer/EventComparisonChart';

interface EventListItem {
  id: string;
  name: string;
  location: string | null;
  eventDate: string;
  status: string;
  totalRegistrations: number;
  checkedInCount: number;
}

interface OrgMemberOption {
  id: string;
  fullName: string;
  email: string;
  role?: string;
  imageUrl?: string | null;
}

export default function OrganizerDashboardPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create event modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDateStr, setEventDateStr] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Assign Member / Newcomer Participant states
  const [assignTargetEvent, setAssignTargetEvent] = useState<EventListItem | null>(null);
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [assignMode, setAssignMode] = useState<'SELECT' | 'ALL' | 'NEWCOMER'>('SELECT');
  const [memberFilterType, setMemberFilterType] = useState<'ALL' | 'AVAILABLE' | 'ASSIGNED'>('ALL');
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([]);
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [memberSearchFilter, setMemberSearchFilter] = useState('');
  const [newcomerFullName, setNewcomerFullName] = useState('');
  const [newcomerEmail, setNewcomerEmail] = useState('');
  const [newcomerTicketType, setNewcomerTicketType] = useState('General');
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState<string | null>(null);
  const [issuedFrontmanCredentials, setIssuedFrontmanCredentials] = useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);
  const [issuedBulkCredentials, setIssuedBulkCredentials] = useState<{
    id: string;
    fullName: string;
    email: string;
    tempPassword: string;
  }[] | null>(null);
  const [issuedParticipantPass, setIssuedParticipantPass] = useState<{
    name: string;
    email: string;
    ticketType: string;
    qrToken: string;
    qrDataUrl?: string;
  } | null>(null);

  // Open modal and fetch members + already assigned staff
  const handleOpenAssignModal = async (event: EventListItem) => {
    setAssignTargetEvent(event);
    setSelectedStaffIds([]);
    setMemberSearchFilter('');
    setMemberFilterType('ALL');
    setNewcomerFullName('');
    setNewcomerEmail('');
    setNewcomerTicketType('General');
    setAssignMode('SELECT');
    setAssignError(null);
    setIssuedFrontmanCredentials(null);
    setIssuedBulkCredentials(null);
    setIssuedParticipantPass(null);
    setShowAssignStaffModal(true);
    setLoadingMembers(true);

    try {
      const [membersRes, staffRes] = await Promise.all([
        fetch('/api/members'),
        fetch(`/api/events/${event.id}/staff`),
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setOrgMembers(
          membersData.map((m: { id: string; fullName: string; email: string; role?: string; imageUrl?: string | null }) => ({
            id: m.id,
            fullName: m.fullName,
            email: m.email,
            role: m.role,
            imageUrl: m.imageUrl,
          }))
        );
      }

      if (staffRes.ok) {
        const staffData: { id: string }[] = await staffRes.json();
        setAssignedStaffIds(staffData.map((s) => s.id));
      } else {
        setAssignedStaffIds([]);
      }
    } catch (err) {
      console.error('Failed to fetch members/staff:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Toggle selection for individual member
  const handleToggleMemberSelect = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Submit Member Assignment or Participant Registration
  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetEvent) return;

    if (assignMode === 'SELECT' && selectedStaffIds.length === 0) {
      setAssignError('Please select at least one member to assign.');
      return;
    }

    if (assignMode === 'NEWCOMER') {
      if (!newcomerFullName.trim() || !newcomerEmail.trim()) {
        setAssignError('Please provide both full name and email for the newcomer participant.');
        return;
      }

      setIsAssigningStaff(true);
      setAssignError(null);

      try {
        const res = await fetch('/api/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: assignTargetEvent.id,
            fullName: newcomerFullName.trim(),
            email: newcomerEmail.trim(),
            ticketType: newcomerTicketType || 'General',
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.error === 'ALREADY_REGISTERED') {
            setAssignError('This participant is already registered for this event.');
          } else {
            setAssignError(data.error ?? 'Failed to register participant.');
          }
          return;
        }

        let qrDataUrl = '';
        try {
          qrDataUrl = await QRCode.toDataURL(data.qrToken, { width: 220, margin: 1 });
        } catch (err) {
          console.error('Failed to generate QR Code data URL:', err);
        }

        setIssuedParticipantPass({
          name: newcomerFullName.trim(),
          email: newcomerEmail.trim(),
          ticketType: newcomerTicketType || 'General',
          qrToken: data.qrToken,
          qrDataUrl,
        });

        setNewcomerFullName('');
        setNewcomerEmail('');
        setNewcomerTicketType('General');

        // Refresh events list to show updated headcount
        await fetchEvents();
      } catch (err) {
        setAssignError(err instanceof Error ? err.message : 'Failed to register participant.');
      } finally {
        setIsAssigningStaff(false);
      }
      return;
    }

    setIsAssigningStaff(true);
    setAssignError(null);

    try {
      let payload: Record<string, unknown>;
      if (assignMode === 'ALL') {
        payload = { all: true };
      } else {
        payload = { userIds: selectedStaffIds };
      }

      const res = await fetch(`/api/events/${assignTargetEvent.id}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        await fetchEvents();
        if (data.staffList && data.staffList.length > 1) {
          setIssuedBulkCredentials(data.staffList);
        } else if (data.staffList && data.staffList.length === 1) {
          const single = data.staffList[0];
          setIssuedFrontmanCredentials({
            name: single.fullName,
            email: single.email,
            tempPassword: single.tempPassword,
          });
        } else if (data.tempPassword) {
          const singleMember = orgMembers.find((m) => selectedStaffIds.includes(m.id));
          setIssuedFrontmanCredentials({
            name: data.staff?.fullName || singleMember?.fullName || 'Frontman',
            email: data.staff?.email || singleMember?.email || '',
            tempPassword: data.tempPassword,
          });
        } else {
          setAssignSuccessMsg(`Successfully assigned member(s) to ${assignTargetEvent.name}`);
          setTimeout(() => setAssignSuccessMsg(null), 5000);
          setShowAssignStaffModal(false);
          setSelectedStaffIds([]);
        }
      } else {
        setAssignError(data.error ?? 'Failed to assign member(s) to event.');
      }
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Failed to assign staff.');
    } finally {
      setIsAssigningStaff(false);
    }
  };

  // Fetch events list
  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events', {
        headers: {
          'x-dev-role': 'ORGANIZER',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEvents(data);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchEvents is the standard mount-time data load (async, sets state only after the fetch resolves); this isn't the synchronous-render-loop pattern the rule targets.
    fetchEvents();
  }, []);

  // Handle Event Creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !eventDateStr) return;

    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-role': 'ORGANIZER',
        },
        body: JSON.stringify({
          name: eventName,
          location: eventLocation,
          eventDate: new Date(eventDateStr).toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? 'Failed to create event');
        return;
      }

      // Reset form states & hide modal
      setEventName('');
      setEventLocation('');
      setEventDateStr('');
      setShowCreateModal(false);

      // Refresh events
      await fetchEvents();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setCreating(false);
    }
  };

  // Derived statistics for Organizer KPIs
  const totalEventsCount = events.length;
  const totalCheckedInCount = events.reduce((sum, e) => sum + e.checkedInCount, 0);
  const totalRegistrationsCount = events.reduce((sum, e) => sum + e.totalRegistrations, 0);
  const attendanceRate = totalRegistrationsCount > 0 
    ? Math.round((totalCheckedInCount / totalRegistrationsCount) * 100) 
    : 0;

  // Upcoming events count
  const upcomingEventsCount = events.filter((e) => e.status.toLowerCase() === 'upcoming').length;



  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'live':
        return (
          <span
            style={{
              backgroundColor: '#FFEDD5',
              color: '#EA580C',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ● Live
          </span>
        );
      case 'upcoming':
        return (
          <span
            style={{
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '700',
            }}
          >
            Upcoming
          </span>
        );
      case 'completed':
        return (
          <span
            style={{
              backgroundColor: '#ECFDF5',
              color: '#059669',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '700',
            }}
          >
            Completed
          </span>
        );
      default:
        return (
          <span
            style={{
              backgroundColor: '#F3F4F6',
              color: '#374151',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '700',
            }}
          >
            {status}
          </span>
        );
    }
  };

  const filteredEvents = events.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()))
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
      {/* Dark Sidebar */}
      <Sidebar />

      {/* Main Dashboard Canvas */}
      <main style={{ flex: 1, padding: '36px 48px' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {/* Organization Name Pill */}
              <span
                style={{
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: '800',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>apartment</span>
                Apex Events Ltd
              </span>

              {/* Organizer Role Pill */}
              <span
                style={{
                  backgroundColor: '#E0F2FE',
                  color: '#0369A1',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>assignment_ind</span>
                Organizer
              </span>
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Good morning, Kamal Perera
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0', fontWeight: '600' }}>
              Logged in as Event Organizer for Apex Events Ltd.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#F97316',
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
              boxShadow: '0 2px 4px rgba(249, 115, 22, 0.2)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            New event
          </button>
        </div>

        {/* 4 KPI Summary Stat Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
          {/* Card 1: TOTAL EVENTS */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              MY ASSIGNED EVENTS
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              {totalEventsCount}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '6px' }}>
              Active event campaigns
            </div>
          </div>

          {/* Card 2: CHECKED IN TODAY */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              CHECKED IN TODAY
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              {totalCheckedInCount.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_upward</span>
              Active scanning
            </div>
          </div>

          {/* Card 3: ATTENDANCE RATE */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              ATTENDANCE RATE
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              {attendanceRate}%
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '6px' }}>
              {totalCheckedInCount} / {totalRegistrationsCount} expected
            </div>
          </div>

          {/* Card 4: UPCOMING EVENTS */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              UPCOMING EVENTS
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              {upcomingEventsCount}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '6px' }}>
              Preparing gates
            </div>
          </div>
        </div>

        {assignSuccessMsg && (
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#047857',
              padding: '14px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              fontWeight: '700',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-outlined">check_circle</span>
            {assignSuccessMsg}
          </div>
        )}

        {/* SEARCH AND FILTERS FOR EVENTS TABLE */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em' }}>
              MY ASSIGNED EVENTS LIST
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#9CA3AF' }}>search</span>
              <input
                type="text"
                placeholder="Search events by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: "'Urbanist', sans-serif",
                  width: '280px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>EVENT</th>
                <th style={{ padding: '12px 16px' }}>DATE</th>
                <th style={{ padding: '12px 16px' }}>LOCATION</th>
                <th style={{ padding: '12px 16px' }}>STATUS</th>
                <th style={{ padding: '12px 16px' }}>HEADCOUNT</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
                    Loading events...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#DC2626', fontWeight: '600' }}>
                    Failed to load events.
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
                    {searchQuery ? 'No matching events found.' : 'No events assigned to you.'}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '18px 16px', fontWeight: '700', color: '#111827' }}>
                      <Link href={`/events/${event.id}`} style={{ textDecoration: 'none', color: '#111827' }}>
                        {event.name}
                      </Link>
                    </td>
                    <td style={{ padding: '18px 16px', color: '#4B5563', fontSize: '13px' }}>
                      {new Date(event.eventDate).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td style={{ padding: '18px 16px', color: '#4B5563', fontSize: '13px' }}>
                      {event.location || '—'}
                    </td>
                    <td style={{ padding: '18px 16px' }}>
                      {getStatusBadge(event.status)}
                    </td>
                    <td style={{ padding: '18px 16px', fontWeight: '700', color: '#111827', fontSize: '14px' }}>
                      {event.checkedInCount} / {event.totalRegistrations}
                    </td>
                    <td style={{ padding: '18px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenAssignModal(event)}
                        style={{
                          backgroundColor: '#F3E8FF',
                          color: '#7C3AED',
                          border: '1px solid #E9D5FF',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontFamily: "'Urbanist', sans-serif",
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person_add</span>
                        Add member
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* EVENT ATTENDANCE & REGISTRATION MULTI-BAR CHART */}
        <div style={{ marginTop: '24px' }}>
          <EventComparisonChart events={events} loading={loading} />
        </div>

        {/* Assign Member to Event Modal */}
        {/* Assign Member / Register Participant Modal */}
        {showAssignStaffModal && assignTargetEvent && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              {!issuedFrontmanCredentials && !issuedBulkCredentials && !issuedParticipantPass ? (
                <form onSubmit={handleAssignStaff}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ backgroundColor: '#F3E8FF', color: '#7C3AED', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                      {assignMode === 'NEWCOMER' ? 'PARTICIPANT REGISTRATION' : 'EVENT STAFF ASSIGNMENT'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>
                      Event: <strong style={{ color: '#111827' }}>{assignTargetEvent.name}</strong>
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>
                    {assignMode === 'NEWCOMER' ? 'Add Participant to Event' : 'Add Members to Event'}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 18px 0' }}>
                    {assignMode === 'NEWCOMER'
                      ? <>Register a new attendee for <strong>{assignTargetEvent.name}</strong> and issue a QR entry ticket.</>
                      : <>Select members from your organization to assign to <strong>{assignTargetEvent.name}</strong> for event duties and mobile scanning.</>}
                  </p>

                  {/* Mode Selector Tabs (3 Ways to Add) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
                    <button
                      type="button"
                      onClick={() => setAssignMode('SELECT')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: assignMode === 'SELECT' ? '#FFFFFF' : 'transparent',
                        color: assignMode === 'SELECT' ? '#111827' : '#6B7280',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        boxShadow: assignMode === 'SELECT' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        fontFamily: "'Urbanist', sans-serif",
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
                      Select Member ({orgMembers.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignMode('ALL')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: assignMode === 'ALL' ? '#FFFFFF' : 'transparent',
                        color: assignMode === 'ALL' ? '#7C3AED' : '#6B7280',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        boxShadow: assignMode === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        fontFamily: "'Urbanist', sans-serif",
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group_add</span>
                      All Available ({orgMembers.filter((m) => !assignedStaffIds.includes(m.id)).length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignMode('NEWCOMER')}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: assignMode === 'NEWCOMER' ? '#FFFFFF' : 'transparent',
                        color: assignMode === 'NEWCOMER' ? '#059669' : '#6B7280',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        boxShadow: assignMode === 'NEWCOMER' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        fontFamily: "'Urbanist', sans-serif",
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person_add</span>
                      Newcomers
                    </button>
                  </div>

                  {loadingMembers ? (
                    <div style={{ padding: '36px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
                      <div className="material-symbols-outlined" style={{ fontSize: '32px', color: '#7C3AED', animation: 'spin 1s linear infinite' }}>
                        progress_activity
                      </div>
                      <div style={{ marginTop: '8px' }}>Loading organization members...</div>
                    </div>
                  ) : (() => {
                    const availableMembers = orgMembers.filter((m) => !assignedStaffIds.includes(m.id));
                    const assignedMembers = orgMembers.filter((m) => assignedStaffIds.includes(m.id));

                    if (assignMode === 'NEWCOMER') {
                      return (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#166534', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16A34A' }}>how_to_reg</span>
                              Register Participant to Event
                            </div>
                            <p style={{ fontSize: '12px', color: '#15803D', margin: 0 }}>
                              This person will be registered as an attendee for this event and issued an official cryptographic QR Code entry ticket.
                            </p>
                          </div>

                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                            Full Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Nimal Fernando"
                            value={newcomerFullName}
                            onChange={(e) => setNewcomerFullName(e.target.value)}
                            required
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              marginBottom: '14px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              fontFamily: "'Urbanist', sans-serif",
                              backgroundColor: '#FFFFFF',
                            }}
                          />

                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                            Email Address
                          </label>
                          <input
                            type="email"
                            placeholder="e.g. nimal@example.com"
                            value={newcomerEmail}
                            onChange={(e) => setNewcomerEmail(e.target.value)}
                            required
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              marginBottom: '14px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              fontFamily: "'Urbanist', sans-serif",
                              backgroundColor: '#FFFFFF',
                            }}
                          />

                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                            Ticket Type
                          </label>
                          <select
                            value={newcomerTicketType}
                            onChange={(e) => setNewcomerTicketType(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              fontFamily: "'Urbanist', sans-serif",
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            <option value="General">General Admission</option>
                            <option value="VIP">VIP Pass</option>
                            <option value="Early Bird">Early Bird</option>
                            <option value="Student">Student</option>
                            <option value="Speaker">Speaker</option>
                            <option value="Press">Press / Media</option>
                          </select>
                        </div>
                      );
                    }

                    if (orgMembers.length === 0) {
                      return (
                        <div style={{ padding: '24px', backgroundColor: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#9CA3AF', marginBottom: '8px', display: 'block' }}>
                            group_off
                          </span>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                            No organization members found
                          </div>
                          <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0' }}>
                            You haven&apos;t added any team members to your organization yet. Go to the Members page to add them.
                          </p>
                          <Link
                            href="/members"
                            target="_blank"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#2563EB',
                              color: '#FFFFFF',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '700',
                              textDecoration: 'none',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person_add</span>
                            Add Members on Members Page
                          </Link>
                        </div>
                      );
                    }

                    if (assignMode === 'SELECT') {
                      // Filter by search query
                      const searchFiltered = orgMembers.filter(
                        (m) =>
                          m.fullName.toLowerCase().includes(memberSearchFilter.toLowerCase()) ||
                          m.email.toLowerCase().includes(memberSearchFilter.toLowerCase())
                      );

                      // Filter by status tab (All / Available / Assigned)
                      const filteredMembers = searchFiltered.filter((m) => {
                        const isAssigned = assignedStaffIds.includes(m.id);
                        if (memberFilterType === 'AVAILABLE') return !isAssigned;
                        if (memberFilterType === 'ASSIGNED') return isAssigned;
                        return true;
                      });

                      const availableFiltered = filteredMembers.filter((m) => !assignedStaffIds.includes(m.id));

                      return (
                        <div style={{ marginBottom: '20px' }}>
                          {/* Search + Filter Header */}
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <input
                                type="text"
                                placeholder="Search members by name or email..."
                                value={memberSearchFilter}
                                onChange={(e) => setMemberSearchFilter(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px 8px 32px',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '8px',
                                  fontSize: '13px',
                                  outline: 'none',
                                  fontFamily: "'Urbanist', sans-serif",
                                  backgroundColor: '#FFFFFF',
                                }}
                              />
                              <span
                                className="material-symbols-outlined"
                                style={{
                                  position: 'absolute',
                                  left: '8px',
                                  top: '8px',
                                  fontSize: '16px',
                                  color: '#9CA3AF',
                                }}
                              >
                                search
                              </span>
                            </div>

                            {availableFiltered.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newIds = Array.from(
                                    new Set([...selectedStaffIds, ...availableFiltered.map((m) => m.id)])
                                  );
                                  setSelectedStaffIds(newIds);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#F3E8FF',
                                  border: '1px solid #E9D5FF',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#7C3AED',
                                  cursor: 'pointer',
                                  fontFamily: "'Urbanist', sans-serif",
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Select Available
                              </button>
                            )}

                            {selectedStaffIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedStaffIds([])}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#FEE2E2',
                                  border: '1px solid #FECACA',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  fontFamily: "'Urbanist', sans-serif",
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Clear ({selectedStaffIds.length})
                              </button>
                            )}
                          </div>

                          {/* Member Status Filter Pills */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => setMemberFilterType('ALL')}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '16px',
                                  border: memberFilterType === 'ALL' ? '1px solid #7C3AED' : '1px solid #E5E7EB',
                                  backgroundColor: memberFilterType === 'ALL' ? '#F5F3FF' : '#FFFFFF',
                                  color: memberFilterType === 'ALL' ? '#7C3AED' : '#6B7280',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                }}
                              >
                                All ({orgMembers.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberFilterType('AVAILABLE')}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '16px',
                                  border: memberFilterType === 'AVAILABLE' ? '1px solid #2563EB' : '1px solid #E5E7EB',
                                  backgroundColor: memberFilterType === 'AVAILABLE' ? '#EFF6FF' : '#FFFFFF',
                                  color: memberFilterType === 'AVAILABLE' ? '#2563EB' : '#6B7280',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                }}
                              >
                                Available ({availableMembers.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setMemberFilterType('ASSIGNED')}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '16px',
                                  border: memberFilterType === 'ASSIGNED' ? '1px solid #059669' : '1px solid #E5E7EB',
                                  backgroundColor: memberFilterType === 'ASSIGNED' ? '#ECFDF5' : '#FFFFFF',
                                  color: memberFilterType === 'ASSIGNED' ? '#059669' : '#6B7280',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                }}
                              >
                                Already Assigned ({assignedMembers.length})
                              </button>
                            </div>

                            <span style={{ fontSize: '12px', fontWeight: '800', color: selectedStaffIds.length > 0 ? '#7C3AED' : '#6B7280' }}>
                              {selectedStaffIds.length} selected
                            </span>
                          </div>

                          {/* Scrollable member list */}
                          <div
                            style={{
                              border: '1px solid #E5E7EB',
                              borderRadius: '10px',
                              maxHeight: '260px',
                              overflowY: 'auto',
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            {filteredMembers.length === 0 ? (
                              <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                                No members found matching your search/filter.
                              </div>
                            ) : (
                              filteredMembers.map((m) => {
                                const isAssigned = assignedStaffIds.includes(m.id);
                                const isChecked = selectedStaffIds.includes(m.id);

                                return (
                                  <div
                                    key={m.id}
                                    onClick={() => {
                                      if (!isAssigned) {
                                        handleToggleMemberSelect(m.id);
                                      }
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '10px 14px',
                                      borderBottom: '1px solid #F3F4F6',
                                      backgroundColor: isAssigned
                                        ? '#F9FAFB'
                                        : isChecked
                                        ? '#F5F3FF'
                                        : '#FFFFFF',
                                      cursor: isAssigned ? 'default' : 'pointer',
                                      opacity: isAssigned ? 0.85 : 1,
                                      transition: 'background-color 0.12s ease',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      {!isAssigned ? (
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleMemberSelect(m.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                      ) : (
                                        <span
                                          className="material-symbols-outlined"
                                          style={{ fontSize: '18px', color: '#059669', width: '16px' }}
                                        >
                                          check
                                        </span>
                                      )}

                                      {m.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={m.imageUrl}
                                          alt={m.fullName}
                                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                      ) : (
                                        <div
                                          style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            backgroundColor: isAssigned ? '#E5E7EB' : isChecked ? '#7C3AED' : '#E0E7FF',
                                            color: isAssigned ? '#4B5563' : isChecked ? '#FFFFFF' : '#4338CA',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: '800',
                                            fontSize: '13px',
                                            flexShrink: 0,
                                          }}
                                        >
                                          {m.fullName.charAt(0).toUpperCase()}
                                        </div>
                                      )}

                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                                            {m.fullName}
                                          </span>
                                          {m.role && (
                                            <span
                                              style={{
                                                fontSize: '10px',
                                                fontWeight: '800',
                                                padding: '1px 6px',
                                                borderRadius: '8px',
                                                backgroundColor: m.role === 'ORGANIZER' ? '#FEF3C7' : '#EFF6FF',
                                                color: m.role === 'ORGANIZER' ? '#D97706' : '#2563EB',
                                              }}
                                            >
                                              {m.role}
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                          {m.email}
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      {isAssigned ? (
                                        <span
                                          style={{
                                            backgroundColor: '#ECFDF5',
                                            color: '#059669',
                                            border: '1px solid #A7F3D0',
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                          }}
                                        >
                                          ✓ Assigned to Event
                                        </span>
                                      ) : isChecked ? (
                                        <span
                                          className="material-symbols-outlined"
                                          style={{ fontSize: '20px', color: '#7C3AED' }}
                                        >
                                          check_circle
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            color: '#6B7280',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            padding: '2px 8px',
                                            backgroundColor: '#F3F4F6',
                                            borderRadius: '10px',
                                          }}
                                        >
                                          Available
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      // ALL Members Mode
                      return (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#7C3AED' }}>how_to_reg</span>
                              Assign all {availableMembers.length} available member(s) at once:
                            </div>
                            {availableMembers.length === 0 ? (
                              <p style={{ fontSize: '13px', color: '#D97706', margin: 0, fontWeight: '600' }}>
                                All {orgMembers.length} organization members are already assigned to this event!
                              </p>
                            ) : (
                              <>
                                <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                                  Every available member listed below will be assigned to <strong>{assignTargetEvent.name}</strong> for event duties and mobile scanning.
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '140px', overflowY: 'auto', padding: '4px 0' }}>
                                  {availableMembers.map((m) => (
                                    <span
                                      key={m.id}
                                      style={{
                                        backgroundColor: '#EFF6FF',
                                        color: '#1D4ED8',
                                        border: '1px solid #BFDBFE',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        padding: '4px 10px',
                                        borderRadius: '16px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      {m.fullName}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    }
                  })()}

                  {assignError && (
                    <div style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>
                      {assignError}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <Link
                      href="/members"
                      target="_blank"
                      style={{
                        fontSize: '12px',
                        color: '#2563EB',
                        textDecoration: 'none',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>open_in_new</span>
                      Manage Organization Members
                    </Link>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAssignStaffModal(false);
                          setSelectedStaffIds([]);
                          setNewcomerFullName('');
                          setNewcomerEmail('');
                          setNewcomerTicketType('General');
                          setAssignError(null);
                        }}
                        style={{ padding: '10px 18px', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', backgroundColor: '#FFF', fontFamily: "'Urbanist', sans-serif" }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          isAssigningStaff ||
                          loadingMembers ||
                          (assignMode === 'SELECT' && selectedStaffIds.length === 0) ||
                          (assignMode === 'ALL' && orgMembers.filter((m) => !assignedStaffIds.includes(m.id)).length === 0) ||
                          (assignMode === 'NEWCOMER' && (!newcomerFullName.trim() || !newcomerEmail.trim()))
                        }
                        style={{
                          padding: '10px 20px',
                          backgroundColor: assignMode === 'NEWCOMER' ? '#059669' : '#7C3AED',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          opacity:
                            isAssigningStaff ||
                            loadingMembers ||
                            (assignMode === 'SELECT' && selectedStaffIds.length === 0) ||
                            (assignMode === 'ALL' && orgMembers.filter((m) => !assignedStaffIds.includes(m.id)).length === 0) ||
                            (assignMode === 'NEWCOMER' && (!newcomerFullName.trim() || !newcomerEmail.trim()))
                              ? 0.6
                              : 1,
                          fontFamily: "'Urbanist', sans-serif",
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                          {assignMode === 'ALL' ? 'group_add' : assignMode === 'NEWCOMER' ? 'how_to_reg' : 'person_add'}
                        </span>
                        {isAssigningStaff
                          ? (assignMode === 'NEWCOMER' ? 'Registering...' : 'Assigning...')
                          : assignMode === 'NEWCOMER'
                          ? 'Register Participant & Issue Ticket'
                          : assignMode === 'ALL'
                          ? `Add All (${orgMembers.filter((m) => !assignedStaffIds.includes(m.id)).length}) Members`
                          : selectedStaffIds.length > 0
                          ? `Add Selected (${selectedStaffIds.length}) Member${selectedStaffIds.length === 1 ? '' : 's'}`
                          : 'Add Member(s)'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : issuedParticipantPass ? (
                /* Participant Registered QR Ticket Modal */
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#059669' }}>confirmation_number</span>
                    <h3 style={{ margin: '8px 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>
                      Participant Registered!
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                      Official entry ticket with QR Code has been generated.
                    </p>
                  </div>

                  <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '700' }}>EVENT</div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#111827' }}>{assignTargetEvent.name}</div>
                      </div>
                      <span
                        style={{
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          border: '1px solid #A7F3D0',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '800',
                        }}
                      >
                        {issuedParticipantPass.ticketType} Pass
                      </span>
                    </div>

                    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '8px', marginTop: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '700' }}>PARTICIPANT</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#111827' }}>{issuedParticipantPass.name}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>{issuedParticipantPass.email}</div>
                    </div>

                    {issuedParticipantPass.qrDataUrl ? (
                      <div style={{ textAlign: 'center', marginTop: '14px', padding: '14px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px dashed #D1D5DB' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={issuedParticipantPass.qrDataUrl}
                          alt="Participant QR Code"
                          style={{ width: '180px', height: '180px', margin: '0 auto', display: 'block' }}
                        />
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', fontWeight: '600' }}>
                          Scan at gate for instant check-in
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#F3F4F6', borderRadius: '8px', fontSize: '12px', color: '#4B5563', wordBreak: 'break-all' }}>
                        <strong>QR Token:</strong> {issuedParticipantPass.qrToken}
                      </div>
                    )}
                  </div>

                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 20px 0', textAlign: 'center' }}>
                    An invitation with the QR ticket has been dispatched to <strong>{issuedParticipantPass.email}</strong>.
                  </p>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(issuedParticipantPass.qrToken);
                        alert('QR Token copied to clipboard!');
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#FFFFFF',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontFamily: "'Urbanist', sans-serif",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
                      Copy Token
                    </button>

                    <button
                      onClick={() => {
                        const registeredName = issuedParticipantPass.name;
                        setIssuedParticipantPass(null);
                        setShowAssignStaffModal(false);
                        setAssignSuccessMsg(`Successfully registered ${registeredName} for ${assignTargetEvent.name}`);
                        setTimeout(() => setAssignSuccessMsg(null), 5000);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontFamily: "'Urbanist', sans-serif",
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : issuedFrontmanCredentials ? (
                /* Single Member Credentials Modal */
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#7C3AED' }}>verified_user</span>
                    <h3 style={{ margin: '8px 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>
                      Frontman Assigned to Event!
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                      Temporary login credentials generated for mobile app ticket scanning.
                    </p>
                  </div>

                  <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '700', marginBottom: '4px' }}>EVENT</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#111827', marginBottom: '10px' }}>{assignTargetEvent.name}</div>

                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '700', marginBottom: '4px' }}>FRONTMAN NAME</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#111827', marginBottom: '10px' }}>{issuedFrontmanCredentials.name}</div>

                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '700', marginBottom: '4px' }}>APP LOGIN USERNAME</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#111827', marginBottom: '10px' }}>{issuedFrontmanCredentials.email}</div>

                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '700', marginBottom: '4px' }}>TEMPORARY PASSWORD</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#7C3AED', letterSpacing: '0.05em' }}>{issuedFrontmanCredentials.tempPassword}</div>
                  </div>

                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 20px 0', textAlign: 'center' }}>
                    Provide these credentials to <strong>{issuedFrontmanCredentials.name}</strong> so they can log into the <strong>EventPro Mobile App</strong> for this event.
                  </p>

                  <button
                    onClick={() => {
                      setIssuedFrontmanCredentials(null);
                      setSelectedStaffIds([]);
                      setShowAssignStaffModal(false);
                      setAssignSuccessMsg(`Successfully assigned member to ${assignTargetEvent.name}`);
                      setTimeout(() => setAssignSuccessMsg(null), 5000);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#7C3AED',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontFamily: "'Urbanist', sans-serif",
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : issuedBulkCredentials ? (
                /* Bulk Members Credentials Modal */
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#7C3AED' }}>group_add</span>
                    <h3 style={{ margin: '8px 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>
                      {issuedBulkCredentials.length} Members Assigned!
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                      Temporary mobile app credentials generated for all assigned members.
                    </p>
                  </div>

                  <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '12px', maxHeight: '240px', overflowY: 'auto', marginBottom: '20px' }}>
                    {issuedBulkCredentials.map((staff) => (
                      <div
                        key={staff.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          borderBottom: '1px solid #E5E7EB',
                          fontSize: '13px',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '800', color: '#111827' }}>{staff.fullName}</div>
                          <div style={{ color: '#6B7280', fontSize: '12px' }}>{staff.email}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600' }}>Pass: </span>
                          <span style={{ fontWeight: '800', color: '#7C3AED', backgroundColor: '#F3E8FF', padding: '2px 8px', borderRadius: '6px' }}>
                            {staff.tempPassword}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const text = issuedBulkCredentials
                          .map((s) => `Name: ${s.fullName}\nEmail: ${s.email}\nPassword: ${s.tempPassword}`)
                          .join('\n\n---\n\n');
                        navigator.clipboard.writeText(text);
                        alert('All credentials copied to clipboard!');
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#FFFFFF',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontFamily: "'Urbanist', sans-serif",
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
                      Copy All Credentials
                    </button>

                    <button
                      onClick={() => {
                        setIssuedBulkCredentials(null);
                        setSelectedStaffIds([]);
                        setShowAssignStaffModal(false);
                        setAssignSuccessMsg(`Successfully assigned ${issuedBulkCredentials.length} member(s) to ${assignTargetEvent.name}`);
                        setTimeout(() => setAssignSuccessMsg(null), 5000);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#7C3AED',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontFamily: "'Urbanist', sans-serif",
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Create Event Modal */}
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <form onSubmit={handleCreateEvent} style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>Create New Event</h3>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0' }}>
                You will be set as the creator/organizer of this event.
              </p>

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Event Name
              </label>
              <input
                type="text"
                placeholder="e.g. Annual Tech Summit 2026"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', marginBottom: '14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: "'Urbanist', sans-serif" }}
              />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Location / Venue
              </label>
              <input
                type="text"
                placeholder="e.g. BMICH Main Hall, Colombo"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', marginBottom: '14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: "'Urbanist', sans-serif" }}
              />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Event Date & Time
              </label>
              <input
                type="datetime-local"
                value={eventDateStr}
                onChange={(e) => setEventDateStr(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', marginBottom: '20px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: "'Urbanist', sans-serif" }}
              />

              {createError && (
                <div style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '10px 18px', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', backgroundColor: '#FFF', fontFamily: "'Urbanist', sans-serif" }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} style={{ padding: '10px 18px', backgroundColor: '#F97316', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.7 : 1, fontFamily: "'Urbanist', sans-serif" }}>
                  {creating ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
