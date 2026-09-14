'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/shared/Sidebar';

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

  // Assign Member to Event states
  const [assignTargetEvent, setAssignTargetEvent] = useState<EventListItem | null>(null);
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [assignMode, setAssignMode] = useState<'SELECT' | 'ALL' | 'NEWCOMER'>('SELECT');
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([]);
  const [assignedStaffIds, setAssignedStaffIds] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [memberSearchFilter, setMemberSearchFilter] = useState('');
  const [newcomerFullName, setNewcomerFullName] = useState('');
  const [newcomerEmail, setNewcomerEmail] = useState('');
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

  // Open modal and fetch members + already assigned staff
  const handleOpenAssignModal = async (event: EventListItem) => {
    setAssignTargetEvent(event);
    setSelectedStaffIds([]);
    setMemberSearchFilter('');
    setNewcomerFullName('');
    setNewcomerEmail('');
    setAssignMode('SELECT');
    setAssignError(null);
    setIssuedFrontmanCredentials(null);
    setIssuedBulkCredentials(null);
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
          membersData.map((m: { id: string; fullName: string; email: string }) => ({
            id: m.id,
            fullName: m.fullName,
            email: m.email,
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

  // Submit Member Assignment
  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetEvent) return;

    if (assignMode === 'SELECT' && selectedStaffIds.length === 0) {
      setAssignError('Please select at least one member to assign.');
      return;
    }

    if (assignMode === 'NEWCOMER') {
      if (!newcomerFullName.trim() || !newcomerEmail.trim()) {
        setAssignError('Please provide both full name and email for the newcomer.');
        return;
      }
    }

    setIsAssigningStaff(true);
    setAssignError(null);

    try {
      let payload: Record<string, unknown>;
      if (assignMode === 'ALL') {
        payload = { all: true };
      } else if (assignMode === 'NEWCOMER') {
        payload = {
          newcomer: {
            fullName: newcomerFullName.trim(),
            email: newcomerEmail.trim(),
          },
        };
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
        if (assignMode === 'NEWCOMER') {
          if (data.tempPassword) {
            setIssuedFrontmanCredentials({
              name: data.staff?.fullName || newcomerFullName.trim(),
              email: data.staff?.email || newcomerEmail.trim(),
              tempPassword: data.tempPassword,
            });
          } else {
            setAssignSuccessMsg(`Successfully registered and assigned ${newcomerFullName.trim()} to ${assignTargetEvent.name}`);
            setTimeout(() => setAssignSuccessMsg(null), 5000);
            setShowAssignStaffModal(false);
          }
          setNewcomerFullName('');
          setNewcomerEmail('');
        } else if (data.staffList && data.staffList.length > 1) {
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

        {/* Assign Member to Event Modal */}
        {showAssignStaffModal && assignTargetEvent && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              {!issuedFrontmanCredentials && !issuedBulkCredentials ? (
                <form onSubmit={handleAssignStaff}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ backgroundColor: '#F3E8FF', color: '#7C3AED', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
                      EVENT STAFF ASSIGNMENT
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>
                    Add Members to Event
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 18px 0' }}>
                    Assign staff to <strong>{assignTargetEvent.name}</strong> as Event Frontmen for ticket scanning.
                  </p>

                  {/* Mode Selector Tabs (3 Ways to Add Members) */}
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
                      Select Member
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
                      All Members ({orgMembers.filter((m) => !assignedStaffIds.includes(m.id)).length})
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
                    <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                      Loading organization members...
                    </div>
                  ) : (() => {
                    const availableMembers = orgMembers.filter((m) => !assignedStaffIds.includes(m.id));

                    if (assignMode === 'NEWCOMER') {
                      return (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#166534', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16A34A' }}>person_add</span>
                              Register Newcomer to Organization
                            </div>
                            <p style={{ fontSize: '12px', color: '#15803D', margin: 0 }}>
                              This person will be registered as a new member in your organization and assigned to this event as a Frontman scanner with auto-generated mobile login credentials.
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
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              fontFamily: "'Urbanist', sans-serif",
                              backgroundColor: '#FFFFFF',
                            }}
                          />
                        </div>
                      );
                    }

                    if (availableMembers.length === 0) {
                      return (
                        <div style={{ padding: '16px', backgroundColor: '#FEF3C7', color: '#D97706', borderRadius: '10px', fontSize: '13px', marginBottom: '20px', border: '1px solid #FDE68A' }}>
                          <strong>All organization members are already assigned</strong> to this event. You can still use the <strong>Newcomers</strong> tab to register and assign a new member!
                        </div>
                      );
                    }

                    if (assignMode === 'SELECT') {
                      const filteredMembers = availableMembers.filter(
                        (m) =>
                          m.fullName.toLowerCase().includes(memberSearchFilter.toLowerCase()) ||
                          m.email.toLowerCase().includes(memberSearchFilter.toLowerCase())
                      );

                      return (
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>
                              Select Member(s) to Assign
                            </label>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: selectedStaffIds.length > 0 ? '#7C3AED' : '#6B7280' }}>
                              {selectedStaffIds.length} of {availableMembers.length} selected
                            </span>
                          </div>

                          {/* Filter / Search input */}
                          <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
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

                            {/* Quick Select / Deselect actions */}
                            <button
                              type="button"
                              onClick={() => {
                                const newIds = Array.from(
                                  new Set([...selectedStaffIds, ...filteredMembers.map((m) => m.id)])
                                );
                                setSelectedStaffIds(newIds);
                              }}
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#F3F4F6',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: '#374151',
                                cursor: 'pointer',
                                fontFamily: "'Urbanist', sans-serif",
                              }}
                            >
                              Select All
                            </button>

                            {selectedStaffIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedStaffIds([])}
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#FEE2E2',
                                  border: '1px solid #FECACA',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  fontFamily: "'Urbanist', sans-serif",
                                }}
                              >
                                Clear
                              </button>
                            )}
                          </div>

                          {/* Scrollable multi-select list */}
                          <div
                            style={{
                              border: '1px solid #E5E7EB',
                              borderRadius: '10px',
                              maxHeight: '220px',
                              overflowY: 'auto',
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            {filteredMembers.length === 0 ? (
                              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                                No members found matching &quot;{memberSearchFilter}&quot;
                              </div>
                            ) : (
                              filteredMembers.map((m) => {
                                const isChecked = selectedStaffIds.includes(m.id);
                                return (
                                  <div
                                    key={m.id}
                                    onClick={() => handleToggleMemberSelect(m.id)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '10px 14px',
                                      borderBottom: '1px solid #F3F4F6',
                                      backgroundColor: isChecked ? '#F5F3FF' : 'transparent',
                                      cursor: 'pointer',
                                      transition: 'background-color 0.12s ease',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleMemberSelect(m.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                      />
                                      <div
                                        style={{
                                          width: '28px',
                                          height: '28px',
                                          borderRadius: '50%',
                                          backgroundColor: isChecked ? '#7C3AED' : '#E0E7FF',
                                          color: isChecked ? '#FFFFFF' : '#4338CA',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontWeight: '800',
                                          fontSize: '12px',
                                          flexShrink: 0,
                                        }}
                                      >
                                        {m.fullName.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                                          {m.fullName}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                          {m.email}
                                        </div>
                                      </div>
                                    </div>

                                    {isChecked && (
                                      <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: '18px', color: '#7C3AED' }}
                                      >
                                        check_circle
                                      </span>
                                    )}
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
                            <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 12px 0' }}>
                              Every member listed below will be assigned the <strong>Frontman (Scanner)</strong> role for this event and issued mobile app credentials.
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

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAssignStaffModal(false);
                        setSelectedStaffIds([]);
                        setNewcomerFullName('');
                        setNewcomerEmail('');
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
                        {assignMode === 'ALL' ? 'group_add' : assignMode === 'NEWCOMER' ? 'person_add' : 'how_to_reg'}
                      </span>
                      {isAssigningStaff
                        ? 'Assigning...'
                        : assignMode === 'NEWCOMER'
                        ? 'Register & Assign Newcomer'
                        : assignMode === 'ALL'
                        ? `Add All (${orgMembers.filter((m) => !assignedStaffIds.includes(m.id)).length}) Members`
                        : selectedStaffIds.length > 0
                        ? `Add Selected (${selectedStaffIds.length}) Member${selectedStaffIds.length === 1 ? '' : 's'}`
                        : 'Add Member(s)'}
                    </button>
                  </div>
                </form>
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
