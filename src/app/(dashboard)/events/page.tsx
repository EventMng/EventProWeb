'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';
import Link from 'next/link';

interface EventListItem {
  id: string;
  name: string;
  location: string | null;
  eventDate: string;
  status: 'Live' | 'Upcoming' | 'Completed';
  totalRegistrations: number;
  checkedInCount: number;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // "New event" is hidden for ORG_ADMIN — only Organizers create events from
  // this page. Starts null (nothing shown) so admins never see a flash of
  // the button before their role is known.
  const [viewerRole, setViewerRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user?.role) setViewerRole(data.user.role);
      })
      .catch(() => {
        // Leave viewerRole null on failure — button stays hidden, the safe default.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDateStr, setEventDateStr] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !eventDateStr) return;

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setEvents((prev) => [
        {
          id: data.event.id,
          name: data.event.name,
          location: data.event.location,
          eventDate: data.event.eventDate,
          status: data.event.status,
          totalRegistrations: 0,
          checkedInCount: 0,
        },
        ...prev,
      ]);
      setShowCreateModal(false);
      setEventName('');
      setEventLocation('');
      setEventDateStr('');
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/events');
        if (!res.ok) throw new Error('Failed to fetch events');
        const data: EventListItem[] = await res.json();
        if (!cancelled) setEvents(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusTypeFor = (status: EventListItem['status']) =>
    status === 'Live' ? 'live' : status === 'Upcoming' ? 'upcoming' : 'completed';

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
      <Sidebar />
      <main style={{ flex: 1, padding: '36px 48px' }}>
        {/* Top Header matching Image 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Events
          </h1>

          {viewerRole && viewerRole !== 'ORG_ADMIN' && (
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
          )}
        </div>

        {/* Table Container */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '20px' }}>
            ALL EVENTS
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>EVENT</th>
                <th style={{ padding: '12px 16px' }}>DATE</th>
                <th style={{ padding: '12px 16px' }}>LOCATION</th>
                <th style={{ padding: '12px 16px' }}>STATUS</th>
                <th style={{ padding: '12px 16px' }}>HEADCOUNT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>Loading events...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#DC2626' }}>Failed to load events. Please try again.</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>No events yet.</td></tr>
              ) : (
                events.map((event) => (
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
                      {getStatusBadge(statusTypeFor(event.status), event.status)}
                    </td>
                    <td style={{ padding: '18px 16px', fontWeight: '700', color: '#111827', fontSize: '14px' }}>
                      {event.checkedInCount} / {event.totalRegistrations}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Create Event Modal */}
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <form onSubmit={handleCreateEvent} style={{ backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '16px', width: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>Create New Event</h3>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px 0' }}>
                The Event ID will be automatically generated by the backend system.
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
                style={{ width: '100%', padding: '10px 14px', marginBottom: '14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Location / Venue
              </label>
              <input
                type="text"
                placeholder="e.g. BMICH Main Hall, Colombo"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', marginBottom: '14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              />

              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                Event Date & Time
              </label>
              <input
                type="datetime-local"
                value={eventDateStr}
                onChange={(e) => setEventDateStr(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', marginBottom: '20px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
              />

              {createError && (
                <div style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '14px' }}>
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '10px 18px', border: '1px solid #D1D5DB', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', backgroundColor: '#FFF' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} style={{ padding: '10px 18px', backgroundColor: '#F97316', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.7 : 1 }}>
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
