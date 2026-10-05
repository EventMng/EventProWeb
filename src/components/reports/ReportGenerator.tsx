'use client';

import { useState, useEffect } from 'react';

interface Event {
  id: string;
  name: string;
  eventDate: string;
}

export function ReportGenerator() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState('');

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch('/api/events');
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
          if (data.length > 0) {
            setSelectedEventId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const handleDownloadFull = () => {
    window.location.href = '/api/reports/full';
  };

  const handleDownloadEvent = () => {
    if (!selectedEventId) return;
    window.location.href = `/api/reports/event?eventId=${selectedEventId}`;
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E5E7EB', marginTop: '36px' }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
        Export & Generate Reports
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        
        {/* Full Organization Report Card */}
        <div style={{ padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>Full Organization Report</h3>
            <p style={{ margin: '8px 0 16px 0', fontSize: '13px', color: '#6B7280', lineHeight: 1.5 }}>
              Download a comprehensive CSV overview of all events hosted by your organization, including aggregate registrations and total attendance rates.
            </p>
          </div>
          <button 
            onClick={handleDownloadFull}
            style={{ backgroundColor: '#111827', color: 'white', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}
          >
            Download Full Report (CSV)
          </button>
        </div>

        {/* Event-by-Event Report Card */}
        <div style={{ padding: '20px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>Event-Specific Report</h3>
            <p style={{ margin: '8px 0 16px 0', fontSize: '13px', color: '#6B7280', lineHeight: 1.5 }}>
              Download a detailed CSV showing the name, email, ticket type, and check-in timestamp for every registered participant.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select 
              disabled={loading || events.length === 0}
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', backgroundColor: 'white', color: '#111827' }}
            >
              {loading ? (
                <option>Loading events...</option>
              ) : events.length === 0 ? (
                <option>No events found</option>
              ) : (
                events.map(event => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))
              )}
            </select>
            <button 
              onClick={handleDownloadEvent}
              disabled={!selectedEventId}
              style={{ backgroundColor: selectedEventId ? '#2563EB' : '#9CA3AF', color: 'white', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', border: 'none', cursor: selectedEventId ? 'pointer' : 'not-allowed' }}
            >
              Download
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
