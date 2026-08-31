'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { UserRole } from '@prisma/client';
import { Sidebar } from '@/components/shared/Sidebar';
import { ROLE_LABELS } from '@/lib/roles';

type DashboardClientProps = {
  fullName: string;
  organizationName: string;
  role: UserRole;
};

type DashboardSummary = {
  liveNow: number;
  checkedInToday: number;
  attendanceRate: number;
  attendedRegistrations: number;
  totalRegistrations: number;
  upcomingEvents: number;
  nextEvent: { name: string; eventDate: string } | null;
};

type EventListItem = {
  id: string;
  name: string;
  location: string | null;
  eventDate: string;
  status: 'Live' | 'Upcoming' | 'Completed';
  totalRegistrations: number;
  checkedInCount: number;
};

type TrafficBucket = {
  label: string;
  periodLabel: string;
  count: number;
  peak: boolean;
};

export default function DashboardClient({ fullName, organizationName, role }: DashboardClientProps) {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const roleLabel = ROLE_LABELS[role] ?? role;

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [trafficData, setTrafficData] = useState<TrafficBucket[]>([]);
  const [trafficLoading, setTrafficLoading] = useState(true);
  const [trafficError, setTrafficError] = useState(false);

  // Add Organizer modal state
  const [showAddOrganizerModal, setShowAddOrganizerModal] = useState(false);
  const [organizerName, setOrganizerName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [addingOrganizer, setAddingOrganizer] = useState(false);
  const [addOrganizerError, setAddOrganizerError] = useState<string | null>(null);
  const [addedOrganizer, setAddedOrganizer] = useState<{ fullName: string; email: string; tempPassword?: string } | null>(null);

  const closeAddOrganizerModal = () => {
    setShowAddOrganizerModal(false);
    setOrganizerName('');
    setOrganizerEmail('');
    setAddOrganizerError(null);
    setAddedOrganizer(null);
  };

  const handleAddOrganizer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddOrganizerError(null);
    setAddingOrganizer(true);

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: organizerName, email: organizerEmail, role: 'ORGANIZER' }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'ALREADY_MEMBER') {
          setAddOrganizerError('This person is already a member of your organization.');
        } else {
          setAddOrganizerError(data.error ?? 'Failed to add organizer.');
        }
        return;
      }

      setAddedOrganizer({
        fullName: data.member.fullName,
        email: data.member.email,
        tempPassword: data.tempPassword,
      });
    } catch {
      setAddOrganizerError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setAddingOrganizer(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      setLoading(true);
      setLoadError(false);
      try {
        const [summaryRes, eventsRes] = await Promise.all([
          fetch('/api/dashboard/summary'),
          fetch('/api/events'),
        ]);

        if (!summaryRes.ok || !eventsRes.ok) throw new Error('Failed to load dashboard data');

        const summaryData: DashboardSummary = await summaryRes.json();
        const eventsData: EventListItem[] = await eventsRes.json();

        if (cancelled) return;
        setSummary(summaryData);
        setEvents(eventsData);
      } catch (err) {
        console.error(err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Attendance Traffic Graph — real check-in data from
  // /api/dashboard/traffic, re-fetched whenever the Today/This Week filter
  // changes (the "month" filter value exists on state but has no button
  // wired to it, same as before this change).
  useEffect(() => {
    let cancelled = false;

    async function loadTraffic() {
      setTrafficLoading(true);
      setTrafficError(false);
      try {
        const range = timeFilter === 'week' ? 'week' : 'today';
        const res = await fetch(`/api/dashboard/traffic?range=${range}`);
        if (!res.ok) throw new Error('Failed to load traffic data');
        const data: { data: TrafficBucket[] } = await res.json();
        if (cancelled) return;
        setTrafficData(data.data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setTrafficError(true);
      } finally {
        if (!cancelled) setTrafficLoading(false);
      }
    }

    loadTraffic();
    return () => {
      cancelled = true;
    };
  }, [timeFilter]);

  const trafficMaxCount = Math.max(1, ...trafficData.map((d) => d.count));

  // Still placeholder — no backing data source for ticket-type breakdown
  // yet, unlike the KPI cards, events list, and traffic graph above.
  // Ticket Distribution statistics
  const ticketStats = [
    { type: 'VIP Admission', checkedIn: 350, total: 400, percent: 87.5, color: '#F59E0B', bg: '#FEF3C7' },
    { type: 'General Admission', checkedIn: 800, total: 1000, percent: 80.0, color: '#2563EB', bg: '#EFF6FF' },
    { type: 'Staff & Speakers', checkedIn: 98, total: 120, percent: 81.6, color: '#8B5CF6', bg: '#F3E8FF' },
  ];

  const getStatusBadge = (type: string, label: string) => {
    switch (type) {
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
            ● {label}
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
            {label}
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
            {label}
          </span>
        );
      default:
        return null;
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
                {organizationName}
              </span>

              {/* Organization Admin Role Pill */}
              <span
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#D97706',
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
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>admin_panel_settings</span>
                {roleLabel}
              </span>
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Good morning, {fullName}
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0', fontWeight: '600' }}>
              Logged in as {roleLabel} for {organizationName}.
            </p>
          </div>

          <button
            onClick={() => setShowAddOrganizerModal(true)}
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
            Add Organizer
          </button>
        </div>

        {loadError && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '18px',
            }}
          >
            Couldn&apos;t load live dashboard data. Showing what we have — try refreshing.
          </div>
        )}

        {/* 4 KPI Summary Stat Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
          {/* Card 1: LIVE NOW */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '16px' }}>
              LIVE NOW
            </div>
            <div>
              <span style={{ backgroundColor: '#FFEDD5', color: '#EA580C', padding: '6px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: '700' }}>
                ● {loading ? '…' : `${summary?.liveNow ?? 0} event${summary?.liveNow === 1 ? '' : 's'}`}
              </span>
            </div>
          </div>

          {/* Card 2: CHECKED IN TODAY */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              CHECKED IN TODAY
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              {loading ? '—' : (summary?.checkedInToday ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '6px' }}>
              So far today
            </div>
          </div>

          {/* Card 3: ATTENDANCE RATE */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              ATTENDANCE RATE
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              {loading ? '—' : `${summary?.attendanceRate ?? 0}%`}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '6px' }}>
              {loading
                ? 'Loading…'
                : `${(summary?.attendedRegistrations ?? 0).toLocaleString()} / ${(summary?.totalRegistrations ?? 0).toLocaleString()} registrations`}
            </div>
          </div>

          {/* Card 4: UPCOMING EVENTS */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              UPCOMING EVENTS
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              {loading ? '—' : summary?.upcomingEvents ?? 0}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '6px' }}>
              {!loading && summary?.nextEvent
                ? `Next: ${summary.nextEvent.name} (${new Date(summary.nextEvent.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`
                : !loading
                  ? 'No upcoming events'
                  : ''}
            </div>
          </div>
        </div>

        {/* Analytics Graphs Section: 2 Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '28px' }}>

          {/* Left Column: Hourly Check-in Bar Chart */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  ATTENDANCE TRAFFIC GRAPH
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: '4px 0 0 0' }}>
                  {timeFilter === 'week' ? 'Daily Check-in Peak Analysis' : 'Hourly Check-in Peak Analysis'}
                </h3>
              </div>

              {/* Time Filter Pills */}
              <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '8px' }}>
                <button
                  onClick={() => setTimeFilter('today')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: timeFilter === 'today' ? '#FFFFFF' : 'transparent',
                    color: timeFilter === 'today' ? '#111827' : '#6B7280',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: timeFilter === 'today' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => setTimeFilter('week')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: timeFilter === 'week' ? '#FFFFFF' : 'transparent',
                    color: timeFilter === 'week' ? '#111827' : '#6B7280',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: timeFilter === 'week' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  This Week
                </button>
              </div>
            </div>

            {/* Visual Bar Chart */}
            {trafficLoading ? (
              <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '13px' }}>
                Loading traffic…
              </div>
            ) : trafficError ? (
              <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', fontSize: '13px', fontWeight: '600' }}>
                Failed to load traffic data.
              </div>
            ) : (
              <>
                <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '14px', paddingTop: '20px', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
                  {trafficData.map((item, idx) => {
                    const heightPercent = (item.count / trafficMaxCount) * 100;
                    const isHovered = hoveredBar === idx;
                    return (
                      <div
                        key={item.label + idx}
                        onMouseEnter={() => setHoveredBar(idx)}
                        onMouseLeave={() => setHoveredBar(null)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          height: '100%',
                          justifyContent: 'flex-end',
                          position: 'relative',
                          cursor: 'pointer',
                        }}
                      >
                        {/* Tooltip on Hover or Peak */}
                        {(isHovered || item.peak) && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '-28px',
                              backgroundColor: item.peak ? '#EA580C' : '#111827',
                              color: '#FFFFFF',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '800',
                              whiteSpace: 'nowrap',
                              zIndex: 10,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            }}
                          >
                            {item.count} check-ins · {item.periodLabel} {item.peak ? '(Peak)' : ''}
                          </div>
                        )}

                        {/* Bar Visual */}
                        <div
                          style={{
                            width: '100%',
                            height: `${heightPercent}%`,
                            backgroundColor: item.peak ? '#2563EB' : isHovered ? '#3B82F6' : '#93C5FD',
                            borderRadius: '6px 6px 0 0',
                            transition: 'all 0.2s ease',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Bar Labels (Time Axis) — with 24 hourly bars in "today" view,
                    only every 3rd label is drawn to avoid overlap; all 7 daily
                    labels in "this week" view are shown since they fit. */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  {trafficData.map((item, idx) => {
                    const showLabel = trafficData.length <= 12 || idx % 3 === 0 || item.peak;
                    return (
                      <div key={item.label + idx} style={{ flex: 1, textAlign: 'center', fontSize: '11px', fontWeight: '700', color: item.peak ? '#2563EB' : '#9CA3AF' }}>
                        {showLabel ? item.label : ''}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Ticket Type Breakdown */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                CATEGORY BREAKDOWN
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: '4px 0 20px 0' }}>
                Attendance by Ticket
              </h3>

              {/* Progress Bars for each Ticket Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {ticketStats.map((ticket) => (
                  <div key={ticket.type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                      <span style={{ color: '#374151' }}>{ticket.type}</span>
                      <span style={{ color: '#111827' }}>
                        {ticket.checkedIn} / {ticket.total} ({ticket.percent}%)
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div style={{ height: '8px', width: '100%', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${ticket.percent}%`,
                          backgroundColor: ticket.color,
                          borderRadius: '4px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Live Gate Metric */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>
                Avg Scan Speed: <strong style={{ color: '#111827' }}>1.2s / ticket</strong>
              </div>
              <span style={{ backgroundColor: '#ECFDF5', color: '#059669', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px' }}>
                Gate Active
              </span>
            </div>
          </div>

        </div>

        {/* YOUR EVENTS Table Section */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '20px' }}>
            YOUR EVENTS
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>EVENT</th>
                <th style={{ padding: '12px 16px' }}>DATE</th>
                <th style={{ padding: '12px 16px' }}>STATUS</th>
                <th style={{ padding: '12px 16px' }}>HEADCOUNT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
                    Loading events...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#DC2626', fontWeight: '600' }}>
                    Failed to load events.
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
                    No events yet.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '18px 16px', fontWeight: '700', color: '#111827' }}>
                      <Link href={`/events/${event.id}`} style={{ textDecoration: 'none', color: '#111827' }}>
                        {event.name}
                      </Link>
                    </td>
                    <td style={{ padding: '18px 16px', color: '#4B5563', fontSize: '13px' }}>
                      {new Date(event.eventDate).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '18px 16px' }}>
                      {getStatusBadge(event.status.toLowerCase(), event.status)}
                    </td>
                    <td style={{ padding: '18px 16px', fontWeight: '700', color: '#111827', fontSize: '14px' }}>
                      {event.checkedInCount.toLocaleString()} / {event.totalRegistrations.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Organizer Modal */}
        {showAddOrganizerModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            {addedOrganizer ? (
              <div style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>Organizer Added</h3>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0' }}>
                  {addedOrganizer.fullName} ({addedOrganizer.email}) has been added as an Organizer.
                </p>

                {addedOrganizer.tempPassword && (
                  <div style={{ backgroundColor: '#EFF6FF', borderRadius: '8px', padding: '14px', marginBottom: '18px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#374151', margin: '0 0 6px 0' }}>
                      Temporary password (share this with them — it won&apos;t be shown again):
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: '800', color: '#2563EB', margin: 0, fontFamily: 'monospace' }}>
                      {addedOrganizer.tempPassword}
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={closeAddOrganizerModal}
                    style={{ padding: '10px 18px', backgroundColor: '#F97316', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Urbanist', sans-serif" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddOrganizer} style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>Add Organizer</h3>
                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0' }}>
                  They&apos;ll be added to your organization with the Organizer role and a temporary password.
                </p>

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kamal Perera"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  required
                  autoComplete="name"
                  style={{ width: '100%', padding: '10px 14px', marginBottom: '14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: "'Urbanist', sans-serif" }}
                />

                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. kamal@company.com"
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  required
                  autoComplete="email"
                  style={{ width: '100%', padding: '10px 14px', marginBottom: '20px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: "'Urbanist', sans-serif" }}
                />

                {addOrganizerError && (
                  <div style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>
                    {addOrganizerError}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={closeAddOrganizerModal} style={{ padding: '10px 18px', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', backgroundColor: '#FFF', fontFamily: "'Urbanist', sans-serif" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={addingOrganizer} style={{ padding: '10px 18px', backgroundColor: '#F97316', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: addingOrganizer ? 'default' : 'pointer', opacity: addingOrganizer ? 0.7 : 1, fontFamily: "'Urbanist', sans-serif" }}>
                    {addingOrganizer ? 'Adding...' : 'Add Organizer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
