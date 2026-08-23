'use client';

import { Sidebar } from '@/components/shared/Sidebar';
import Link from 'next/link';

export default function EventsPage() {
  const events = [
    {
      id: '1',
      name: 'Tech Summit 2026',
      date: 'Today, 9:00 AM',
      location: 'Grand Ballroom, Colombo',
      status: 'Live',
      statusType: 'live',
      headcount: '1,248 / 1,520',
    },
    {
      id: '2',
      name: 'Alumni Meetup',
      date: 'Sep 4, 6:00 PM',
      location: 'Hilton Residences',
      status: 'Upcoming',
      statusType: 'upcoming',
      headcount: '0 / 340',
    },
    {
      id: '3',
      name: 'Founders Night',
      date: 'Aug 2, 7:00 PM',
      location: 'Cinnamon Grand',
      status: 'Completed',
      statusType: 'completed',
      headcount: '210 / 240',
    },
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
      <Sidebar />
      <main style={{ flex: 1, padding: '36px 48px' }}>
        {/* Top Header matching Image 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
            Events
          </h1>

          <button
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
              {events.map((event) => (
                <tr key={event.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '18px 16px', fontWeight: '700', color: '#111827' }}>
                    <Link href="/participants" style={{ textDecoration: 'none', color: '#111827' }}>
                      {event.name}
                    </Link>
                  </td>
                  <td style={{ padding: '18px 16px', color: '#4B5563', fontSize: '13px' }}>
                    {event.date}
                  </td>
                  <td style={{ padding: '18px 16px', color: '#4B5563', fontSize: '13px' }}>
                    {event.location}
                  </td>
                  <td style={{ padding: '18px 16px' }}>
                    {getStatusBadge(event.statusType, event.status)}
                  </td>
                  <td style={{ padding: '18px 16px', fontWeight: '700', color: '#111827', fontSize: '14px' }}>
                    {event.headcount}
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
