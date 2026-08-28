'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterResponse = {
  message: string;
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: 'SYSTEM_ADMIN' | 'ORG_ADMIN' | 'ORGANIZER' | 'FRONTMAN';
    organizationId: string;
    isTemporaryPassword: boolean;
    imageUrl: string | null;
  };
};

export default function SignupPage() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationName, fullName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Unable to create your account.');
        return;
      }

      const { user } = data as RegisterResponse;
      void user;

      // The session cookie is already set httpOnly by the API — no token
      // handling needed here, ORG_ADMIN always lands on the admin dashboard.
      router.push('/');
    } catch {
      setError('Unable to reach the server. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Urbanist', sans-serif" }}>
      {/* Left Brand Panel — identical to login/page.tsx */}
      <div
        style={{
          flex: '1 1 50%',
          backgroundColor: '#111827',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '64px',
          color: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
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
          <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em' }}>
            EventPro
          </span>
        </div>

        <h1
          style={{
            fontSize: '40px',
            fontWeight: '800',
            letterSpacing: '-0.02em',
            lineHeight: '1.2',
            margin: '0 0 16px 0',
            maxWidth: '460px',
          }}
        >
          Run the room, not the spreadsheet.
        </h1>
        <p style={{ fontSize: '15px', color: '#9CA3AF', fontWeight: '600', maxWidth: '420px', margin: 0 }}>
          Manage events, scan attendees, and track check-ins in real time — all from one dashboard.
        </p>
      </div>

      {/* Right Form Panel */}
      <div
        style={{
          flex: '1 1 50%',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
        }}
      >
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '360px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Sign up
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', fontWeight: '600', margin: '0 0 28px 0' }}>
            Create your account to get started with EventPro.
          </p>

          {error && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                color: '#B91C1C',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '18px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              Organization name
            </label>
            <input
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
              autoComplete="organization"
              placeholder="Acme Events Ltd"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: "'Urbanist', sans-serif",
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Jane Doe"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: "'Urbanist', sans-serif",
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              Work email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: "'Urbanist', sans-serif",
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: "'Urbanist', sans-serif",
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                fontFamily: "'Urbanist', sans-serif",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: isSubmitting ? 'default' : 'pointer',
              fontFamily: "'Urbanist', sans-serif",
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Creating your account…' : 'Sign up'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280', fontWeight: '600', marginTop: '20px' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#2563EB', fontWeight: '700', textDecoration: 'none' }}>
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
