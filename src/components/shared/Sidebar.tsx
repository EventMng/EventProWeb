'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: 'dashboard' },
    { name: 'Events', href: '/events', icon: 'calendar_today' },
    { name: 'Participants', href: '/participants', icon: 'group' },
    { name: 'Members', href: '/members', icon: 'badge' },
    { name: 'Settings', href: '/admin', icon: 'settings' },
  ];

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: '#111827',
        minHeight: '100vh',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Urbanist', sans-serif",
      }}
    >
      {/* EP Logo Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px', paddingLeft: '8px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '900',
            fontSize: '16px',
          }}
        >
          EP
        </div>
        <span style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em' }}>
          EventPro
        </span>
      </div>

      {/* Navigation Menu Items with Google Material Symbols */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {menuItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/' || pathname === '/(dashboard)' || pathname === ''
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                textDecoration: 'none',
                backgroundColor: isActive ? '#2563EB' : 'transparent',
                color: isActive ? '#FFFFFF' : '#9CA3AF',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Google Material Symbol Icon */}
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '20px',
                  color: isActive ? '#FFFFFF' : '#9CA3AF',
                }}
              >
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
