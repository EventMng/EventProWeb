'use client';

import { Sidebar } from '@/components/shared/Sidebar';

export default function ReportsPage() {
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
            Reports & Analytics
          </h1>
        </div>

        {/* 2 Stat Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '36px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              TOTAL ATTENDANCE
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827' }}>1,458</div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em', marginBottom: '8px' }}>
              AVERAGE CHECK-IN TIME
            </div>
            <div style={{ fontSize: '34px', fontWeight: '800', color: '#111827' }}>1.8 mins</div>
          </div>
        </div>
      </main>
    </div>
  );
}
