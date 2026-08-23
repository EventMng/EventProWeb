'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Events', href: '/events' },
    { name: 'Reports', href: '/reports' },
    { name: 'Admin', href: '/admin' },
  ];

  return (
    <header style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 40 }}>
      {/* Left: Brand Logo & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#184F95', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: '800', fontSize: '15px' }}>
            EP
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '18px', color: '#111827', lineHeight: 1.2 }}>EventPro</div>
            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600', letterSpacing: '0.05em' }}>ORGANIZER DASHBOARD</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', gap: '8px', marginLeft: '32px' }}>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                  color: isActive ? '#184F95' : '#4B5563',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: User Profile & Org */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Apex Events Ltd</div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>Organizer Account</div>
        </div>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#032042', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: '700', fontSize: '14px' }}>
          AO
        </div>
      </div>
    </header>
  );
}
