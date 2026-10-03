'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';

interface DashboardSummary {
  liveNow: number;
  checkedInToday: number;
  attendanceRate: number;
  attendedRegistrations: number;
  totalRegistrations: number;
  upcomingEvents: number;
  nextEvent: { name: string; eventDate: string } | null;
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadSummary() {
      try {
        const res = await fetch('/api/dashboard/summary');
        if (!res.ok) throw new Error('Failed to fetch summary');
        const data = await res.json();
        if (isMounted) {
          setSummary(data);
          setError(false);
        }
      } catch (err) {
        console.error('Failed to load reports summary:', err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadSummary();
    return () => {
      isMounted = false;
    };
  }, []);

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
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Reports & Analytics
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0', fontWeight: '600' }}>
              Aggregate attendance metrics and organization event performance.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', fontWeight: '600', fontSize: '14px' }}>
            Failed to load aggregate report metrics. Please try again.
          </div>
        )}

        {/* 4 Stat Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '36px' }}>
          {/* Card 1: TOTAL ATTENDANCE */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              TOTAL ATTENDANCE
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              {loading ? '—' : summary ? summary.attendedRegistrations.toLocaleString() : '0'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '6px' }}>
              {loading ? 'Loading...' : `of ${summary ? summary.totalRegistrations.toLocaleString() : 0} registered`}
            </div>
          </div>

          {/* Card 2: ATTENDANCE RATE */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              ATTENDANCE RATE
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              {loading ? '—' : `${summary?.attendanceRate ?? 0}%`}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#059669', marginTop: '6px' }}>
              Overall completion rate
            </div>
          </div>

          {/* Card 3: CHECKED IN TODAY */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              CHECKED IN TODAY
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              {loading ? '—' : summary ? summary.checkedInToday.toLocaleString() : '0'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#2563EB', marginTop: '6px' }}>
              Real-time gate scans today
            </div>
          </div>

          {/* Card 4: ACTIVE & UPCOMING EVENTS */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              UPCOMING EVENTS
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              {loading ? '—' : summary ? summary.upcomingEvents.toLocaleString() : '0'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '6px' }}>
              {summary?.liveNow ? `${summary.liveNow} Live now` : 'Prepared for gate check-in'}
            </div>
          </div>
        </div>

        {/* Detailed Metrics Overview Card */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
            ORGANIZATION PERFORMANCE SUMMARY
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>Total Registrations Across Events</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#111827', marginTop: '4px' }}>
                {loading ? '...' : summary ? summary.totalRegistrations.toLocaleString() : '0'}
              </div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>Verified Checked-In Attendees</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#059669', marginTop: '4px' }}>
                {loading ? '...' : summary ? summary.attendedRegistrations.toLocaleString() : '0'}
              </div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>Next Scheduled Event</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#2563EB', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {loading ? '...' : summary?.nextEvent?.name || 'No upcoming event'}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
