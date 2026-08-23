'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/shared/Sidebar';

export default function DashboardPage() {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('today');
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const events = [
    {
      id: '1',
      name: 'Tech Summit 2026',
      date: 'Today, 9:00 AM',
      status: 'Live',
      statusType: 'live',
      headcount: '1,248 / 1,520',
    },
    {
      id: '2',
      name: 'Alumni Meetup',
      date: 'Sep 4, 6:00 PM',
      status: 'Upcoming',
      statusType: 'upcoming',
      headcount: '0 / 340',
    },
    {
      id: '3',
      name: 'Founders Night',
      date: 'Aug 2, 7:00 PM',
      status: 'Completed',
      statusType: 'completed',
      headcount: '210 / 240',
    },
  ];

  // Hourly check-in statistics data for graph
  const hourlyData = [
    { time: '8 AM', count: 95 },
    { time: '9 AM', count: 310 },
    { time: '10 AM', count: 450, peak: true },
    { time: '11 AM', count: 280 },
    { time: '12 PM', count: 140 },
    { time: '1 PM', count: 190 },
    { time: '2 PM', count: 110 },
    { time: '3 PM', count: 75 },
    { time: '4 PM', count: 40 },
  ];

  const maxCount = Math.max(...hourlyData.map((d) => d.count));

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
                Apex Events Ltd
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
                Org Admin
              </span>
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Good morning, Sanduni Perera
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0 0', fontWeight: '600' }}>
              Logged in as Organization Admin for Apex Events Ltd.
            </p>
          </div>

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

        {/* 4 KPI Summary Stat Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '28px' }}>
          {/* Card 1: LIVE NOW */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '16px' }}>
              LIVE NOW
            </div>
            <div>
              <span style={{ backgroundColor: '#FFEDD5', color: '#EA580C', padding: '6px 14px', borderRadius: '16px', fontSize: '13px', fontWeight: '700' }}>
                ● 1 event
              </span>
            </div>
          </div>

          {/* Card 2: CHECKED IN TODAY */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              CHECKED IN TODAY
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              1,248
            </div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_upward</span>
              12% vs 11am
            </div>
          </div>

          {/* Card 3: ATTENDANCE RATE */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              ATTENDANCE RATE
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              82%
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '6px' }}>
              1,248 / 1,520 expected
            </div>
          </div>

          {/* Card 4: UPCOMING EVENTS */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              UPCOMING EVENTS
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827', lineHeight: 1.1 }}>
              4
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '6px' }}>
              Next: Alumni Meetup (Sep 4)
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
                  Hourly Check-in Peak Analysis
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
            <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '14px', paddingTop: '20px', borderBottom: '1px solid #F3F4F6', paddingBottom: '8px' }}>
              {hourlyData.map((item, idx) => {
                const heightPercent = (item.count / maxCount) * 100;
                const isHovered = hoveredBar === idx;
                return (
                  <div
                    key={item.time}
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
                        {item.count} check-ins {item.peak ? '(Peak)' : ''}
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

            {/* Bar Labels (Time Axis) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              {hourlyData.map((item) => (
                <div key={item.time} style={{ flex: 1, textAlign: 'center', fontSize: '11px', fontWeight: '700', color: item.peak ? '#2563EB' : '#9CA3AF' }}>
                  {item.time}
                </div>
              ))}
            </div>
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
              {events.map((event) => (
                <tr key={event.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '18px 16px', fontWeight: '700', color: '#111827' }}>
                    <Link href={`/events/${event.id}`} style={{ textDecoration: 'none', color: '#111827' }}>
                      {event.name}
                    </Link>
                  </td>
                  <td style={{ padding: '18px 16px', color: '#4B5563', fontSize: '13px' }}>
                    {event.date}
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
