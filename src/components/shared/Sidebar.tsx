'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ROLE_LABELS } from '@/lib/roles';

type SessionProfile = {
  fullName: string;
  roleLabel: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sessionProfile, setSessionProfile] = useState<SessionProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.user) return;
        setSessionProfile({
          fullName: data.user.fullName,
          roleLabel: ROLE_LABELS[data.user.role as keyof typeof ROLE_LABELS] ?? data.user.role,
        });
      })
      .catch(() => {
        // Not authenticated (or request failed) — fall back to the mock profile below.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('eventpro_user_role');
      router.push('/login');
    }
  };

  // Set initial role based on pathname to avoid UI flash during SSR/initial render
  const initialRole = pathname.startsWith('/organizer') ? 'ORGANIZER' : 'ORG_ADMIN';
  const [role, setRole] = useState<'ORG_ADMIN' | 'ORGANIZER'>(initialRole);

  useEffect(() => {
    let activeRole: 'ORG_ADMIN' | 'ORGANIZER' = 'ORG_ADMIN';
    if (pathname.startsWith('/organizer')) {
      activeRole = 'ORGANIZER';
      localStorage.setItem('eventpro_user_role', 'ORGANIZER');
    } else if (pathname === '/' || pathname.startsWith('/admin') || pathname.startsWith('/members')) {
      activeRole = 'ORG_ADMIN';
      localStorage.setItem('eventpro_user_role', 'ORG_ADMIN');
    } else {
      // For general routes like /events, check localStorage to preserve state
      const saved = localStorage.getItem('eventpro_user_role');
      if (saved === 'ORGANIZER') {
        activeRole = 'ORGANIZER';
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberately deferred to an effect: reading localStorage during render would cause an SSR/hydration mismatch, which is exactly why initialRole above is used for the first render instead.
    setRole(activeRole);
  }, [pathname]);

  const menuItems = role === 'ORGANIZER'
    ? [
      { name: 'Dashboard', href: '/organizer', icon: 'dashboard' },
      { name: 'Events', href: '/events', icon: 'calendar_today' },
      { name: 'Participants', href: '/participants', icon: 'group' },
      { name: 'Members', href: '/members', icon: 'badge' },
      { name: 'Settings', href: '/admin', icon: 'settings' },
    ]
    : [
      { name: 'Dashboard', href: '/', icon: 'dashboard' },
      { name: 'Events', href: '/events', icon: 'calendar_today' },
      { name: 'Members', href: '/members', icon: 'badge' },
      { name: 'Settings', href: '/admin', icon: 'settings' },
    ];

  const mockProfile = role === 'ORGANIZER'
    ? { name: 'Kamal Perera', roleLabel: 'Event Organizer', initial: 'K' }
    : { name: 'Sanduni Perera', roleLabel: 'Org Admin', initial: 'S' };

  // Prefer the real logged-in user's name/role once /api/auth/me resolves;
  // fall back to the pathname-based mock profile on pages without a session
  // (or before the fetch above completes).
  const profile = sessionProfile
    ? {
        name: sessionProfile.fullName,
        roleLabel: sessionProfile.roleLabel,
        initial: sessionProfile.fullName.trim().charAt(0).toUpperCase() || '?',
      }
    : mockProfile;

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: '#111827',
        minHeight: '100vh',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: "'Urbanist', sans-serif",
        flexShrink: 0,
      }}
    >
      <div>
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
              item.href === '/' || item.href === '/organizer'
                ? pathname === item.href || pathname === '/(dashboard)' || pathname === ''
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
      </div>

      {/* Bottom Profile / App Indicator (Matching Image 1) */}
      <div>
        <div style={{ paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#2563EB',
              border: '1.5px solid #3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: '13px',
            }}
          >
            {profile.initial}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF', lineHeight: '1.2' }}>
              {profile.name}
            </span>
            <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '600' }}>
              {profile.roleLabel}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          style={{
            width: '100%',
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 16px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: 'transparent',
            color: '#9CA3AF',
            fontSize: '15px',
            fontWeight: '700',
            fontFamily: "'Urbanist', sans-serif",
            cursor: isLoggingOut ? 'default' : 'pointer',
            opacity: isLoggingOut ? 0.6 : 1,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#9CA3AF' }}>
            logout
          </span>
          <span>{isLoggingOut ? 'Logging out…' : 'Log out'}</span>
        </button>
      </div>
    </aside>
  );
}
