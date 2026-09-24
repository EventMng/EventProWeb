'use client';

import { useState } from 'react';

export interface EventChartItem {
  id: string;
  name: string;
  location?: string | null;
  eventDate: string;
  status: string;
  totalRegistrations: number;
  checkedInCount: number;
}

interface EventComparisonChartProps {
  events: EventChartItem[];
  loading?: boolean;
}

export function EventComparisonChart({ events, loading = false }: EventComparisonChartProps) {
  const [chartFilter, setChartFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const chartEvents = events.filter((e) => {
    if (chartFilter === 'ACTIVE') {
      return e.status.toLowerCase() === 'live' || e.status.toLowerCase() === 'upcoming';
    }
    if (chartFilter === 'COMPLETED') {
      return e.status.toLowerCase() === 'completed';
    }
    return true;
  });

  const maxRegistrations = Math.max(...chartEvents.map((e) => e.totalRegistrations), 5);
  const yAxisMax = Math.ceil(maxRegistrations / 5) * 5 || 10;
  const yTicks = [
    yAxisMax,
    Math.round(yAxisMax * 0.75),
    Math.round(yAxisMax * 0.5),
    Math.round(yAxisMax * 0.25),
    0,
  ];

  const totalChartRegs = chartEvents.reduce((s, e) => s + e.totalRegistrations, 0);
  const totalChartChecks = chartEvents.reduce((s, e) => s + e.checkedInCount, 0);
  const chartAvgTurnout =
    totalChartRegs > 0 ? Math.round((totalChartChecks / totalChartRegs) * 100) : 0;

  // Chart Dimensions for SVG
  const svgWidth = 840;
  const svgHeight = 270;
  const marginLeft = 55;
  const marginRight = 25;
  const marginTop = 30;
  const marginBottom = 65;
  const plotWidth = svgWidth - marginLeft - marginRight;
  const plotHeight = svgHeight - marginTop - marginBottom;

  const numGroups = chartEvents.length;
  const groupSlotWidth = numGroups > 0 ? plotWidth / numGroups : plotWidth;
  const barWidth = Math.min(26, Math.max(12, (groupSlotWidth - 28) / 2));
  const barGap = 4;

  const hoveredEvent = chartEvents.find((e) => e.id === hoveredEventId);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #E5E7EB',
        marginBottom: '28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Chart Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
          borderBottom: '1px solid #F3F4F6',
          paddingBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#F3E8FF',
                color: '#7C3AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                bar_chart
              </span>
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#111827', margin: 0 }}>
              Event Attendance & Registration Comparison
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: '500' }}>
            Side-by-side comparison of total registered attendees vs. checked-in attendees per event
          </p>
        </div>

        {/* Legend & Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Legend Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontWeight: '700' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#7C3AED' }} />
              <span style={{ color: '#4B5563' }}>Registered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10B981' }} />
              <span style={{ color: '#4B5563' }}>Checked In</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#F3F4F6',
              padding: '3px',
              borderRadius: '8px',
              gap: '2px',
            }}
          >
            {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setChartFilter(f)}
                style={{
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  backgroundColor: chartFilter === f ? '#FFFFFF' : 'transparent',
                  color: chartFilter === f ? '#7C3AED' : '#6B7280',
                  boxShadow: chartFilter === f ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  fontFamily: "'Urbanist', sans-serif",
                  transition: 'all 0.15s ease',
                }}
              >
                {f === 'ALL' ? 'All Events' : f === 'ACTIVE' ? 'Active / Upcoming' : 'Completed'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Body */}
      {loading ? (
        <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '13px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px', marginRight: '8px', animation: 'spin 1s linear infinite' }}>
            progress_activity
          </span>
          Loading chart metrics...
        </div>
      ) : chartEvents.length === 0 ? (
        <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6B7280', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#D1D5DB', marginBottom: '6px' }}>
            query_stats
          </span>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#374151' }}>No events found for this filter</div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>Create events or adjust the filter tab above.</div>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
          {/* Hover Tooltip Overlay */}
          {hoveredEvent && (
            <div
              style={{
                position: 'absolute',
                top: '10px',
                right: '16px',
                backgroundColor: '#111827',
                color: '#FFFFFF',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                zIndex: 10,
                pointerEvents: 'none',
                minWidth: '180px',
              }}
            >
              <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px' }}>
                {hoveredEvent.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#C4B5FD', marginBottom: '2px' }}>
                <span>Registered:</span>
                <strong>{hoveredEvent.totalRegistrations}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6EE7B7', marginBottom: '4px' }}>
                <span>Checked In:</span>
                <strong>{hoveredEvent.checkedInCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #374151', paddingTop: '4px', marginTop: '4px', fontSize: '11px', color: '#9CA3AF' }}>
                <span>Turnout Rate:</span>
                <strong style={{ color: '#FCD34D' }}>
                  {hoveredEvent.totalRegistrations > 0
                    ? `${Math.round((hoveredEvent.checkedInCount / hoveredEvent.totalRegistrations) * 100)}%`
                    : '0%'}
                </strong>
              </div>
            </div>
          )}

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: '100%', height: 'auto', minWidth: '600px', display: 'block' }}
          >
            <defs>
              {/* Gradient for Registered Bars */}
              <linearGradient id="purpleBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#6D28D9" />
              </linearGradient>

              {/* Gradient for Checked In Bars */}
              <linearGradient id="greenBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>

            {/* Y-Axis Horizontal Grid Lines & Milestone Values */}
            {yTicks.map((val, idx) => {
              const yPos = marginTop + (idx / (yTicks.length - 1)) * plotHeight;
              return (
                <g key={idx}>
                  <line
                    x1={marginLeft}
                    y1={yPos}
                    x2={marginLeft + plotWidth}
                    y2={yPos}
                    stroke="#F3F4F6"
                    strokeWidth="1.5"
                    strokeDasharray={idx === yTicks.length - 1 ? 'none' : '4 4'}
                  />
                  <text
                    x={marginLeft - 10}
                    y={yPos + 4}
                    textAnchor="end"
                    fontSize="11"
                    fontWeight="600"
                    fill="#9CA3AF"
                    fontFamily="'Urbanist', sans-serif"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Bars for Each Event */}
            {chartEvents.map((event, idx) => {
              const groupCenterX = marginLeft + idx * groupSlotWidth + groupSlotWidth / 2;
              const regBarX = groupCenterX - barWidth - barGap / 2;
              const checkBarX = groupCenterX + barGap / 2;

              const regHeight = (event.totalRegistrations / yAxisMax) * plotHeight;
              const checkHeight = (event.checkedInCount / yAxisMax) * plotHeight;

              const regY = marginTop + plotHeight - regHeight;
              const checkY = marginTop + plotHeight - checkHeight;

              const isHovered = hoveredEventId === event.id;
              const turnoutRate =
                event.totalRegistrations > 0
                  ? Math.round((event.checkedInCount / event.totalRegistrations) * 100)
                  : 0;

              return (
                <g
                  key={event.id}
                  onMouseEnter={() => setHoveredEventId(event.id)}
                  onMouseLeave={() => setHoveredEventId(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Hover Background Highlight Column */}
                  <rect
                    x={groupCenterX - groupSlotWidth / 2 + 4}
                    y={marginTop}
                    width={groupSlotWidth - 8}
                    height={plotHeight}
                    fill={isHovered ? '#F5F3FF' : 'transparent'}
                    rx="8"
                    style={{ transition: 'fill 0.15s ease' }}
                  />

                  {/* Registered Bar (Purple) */}
                  <rect
                    x={regBarX}
                    y={regY}
                    width={barWidth}
                    height={Math.max(regHeight, 3)}
                    fill="url(#purpleBarGrad)"
                    rx="4"
                    opacity={isHovered ? 1 : 0.9}
                    style={{ transition: 'all 0.2s ease' }}
                  />

                  {/* Checked-In Bar (Green) */}
                  <rect
                    x={checkBarX}
                    y={checkY}
                    width={barWidth}
                    height={Math.max(checkHeight, event.checkedInCount > 0 ? 3 : 0)}
                    fill="url(#greenBarGrad)"
                    rx="4"
                    opacity={isHovered ? 1 : 0.9}
                    style={{ transition: 'all 0.2s ease' }}
                  />

                  {/* Value Labels on top of bars */}
                  {event.totalRegistrations > 0 && (
                    <text
                      x={regBarX + barWidth / 2}
                      y={Math.max(regY - 4, marginTop + 10)}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="800"
                      fill="#6D28D9"
                      fontFamily="'Urbanist', sans-serif"
                    >
                      {event.totalRegistrations}
                    </text>
                  )}

                  {event.checkedInCount > 0 && (
                    <text
                      x={checkBarX + barWidth / 2}
                      y={Math.max(checkY - 4, marginTop + 10)}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="800"
                      fill="#047857"
                      fontFamily="'Urbanist', sans-serif"
                    >
                      {event.checkedInCount}
                    </text>
                  )}

                  {/* Turnout Percentage Pill above the group */}
                  <g transform={`translate(${groupCenterX}, ${marginTop - 12})`}>
                    <rect
                      x="-18"
                      y="-8"
                      width="36"
                      height="16"
                      rx="8"
                      fill={turnoutRate >= 75 ? '#ECFDF5' : turnoutRate >= 40 ? '#FEF3C7' : '#F3F4F6'}
                      stroke={turnoutRate >= 75 ? '#A7F3D0' : turnoutRate >= 40 ? '#FDE68A' : '#E5E7EB'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="800"
                      fill={turnoutRate >= 75 ? '#047857' : turnoutRate >= 40 ? '#B45309' : '#6B7280'}
                      fontFamily="'Urbanist', sans-serif"
                    >
                      {turnoutRate}%
                    </text>
                  </g>

                  {/* X-Axis Event Name Label */}
                  <text
                    x={groupCenterX}
                    y={marginTop + plotHeight + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill={isHovered ? '#7C3AED' : '#111827'}
                    fontFamily="'Urbanist', sans-serif"
                  >
                    {event.name.length > 15 ? `${event.name.substring(0, 13)}…` : event.name}
                  </text>

                  {/* Event Date Sub-label */}
                  <text
                    x={groupCenterX}
                    y={marginTop + plotHeight + 32}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#9CA3AF"
                    fontFamily="'Urbanist', sans-serif"
                  >
                    {new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Baseline */}
            <line
              x1={marginLeft}
              y1={marginTop + plotHeight}
              x2={marginLeft + plotWidth}
              y2={marginTop + plotHeight}
              stroke="#E5E7EB"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}

      {/* Bottom Chart Insights Strip */}
      {chartEvents.length > 0 && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #F3F4F6',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ backgroundColor: '#F9FAFB', padding: '10px 12px', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280' }}>COMPARED EVENTS</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#111827', marginTop: '2px' }}>
              {chartEvents.length}
            </div>
          </div>
          <div style={{ backgroundColor: '#F5F3FF', padding: '10px 12px', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#7C3AED' }}>TOTAL REGISTERED</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#6D28D9', marginTop: '2px' }}>
              {totalChartRegs.toLocaleString()}
            </div>
          </div>
          <div style={{ backgroundColor: '#ECFDF5', padding: '10px 12px', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#059669' }}>TOTAL CHECKED IN</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#047857', marginTop: '2px' }}>
              {totalChartChecks.toLocaleString()}
            </div>
          </div>
          <div style={{ backgroundColor: '#EFF6FF', padding: '10px 12px', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#2563EB' }}>AVG TURNOUT RATE</div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1D4ED8', marginTop: '2px' }}>
              {chartAvgTurnout}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
