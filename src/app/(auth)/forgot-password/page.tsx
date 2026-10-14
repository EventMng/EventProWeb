'use client';

import { useState } from 'react';
import Link from 'next/link';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Urbanist', sans-serif" }}>
      {/* Left Brand Panel */}
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
          Recover your account in seconds.
        </h1>
        <p style={{ fontSize: '15px', color: '#9CA3AF', fontWeight: '600', maxWidth: '420px', margin: 0 }}>
          Don&apos;t worry, it happens. Enter your registered email and we will send you a secure link to reset your password.
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
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Forgot password
          </h2>
          <p style={{ fontSize: '14px', color: '#6B7280', fontWeight: '600', margin: '0 0 28px 0' }}>
            Enter your work email address below and we will send you a reset link.
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

          {success ? (
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                  fontSize: '20px',
                  fontWeight: '800',
                }}
              >
                ✓
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#166534', margin: '0 0 8px 0' }}>
                Check your inbox
              </h3>
              <p style={{ fontSize: '13px', color: '#15803D', fontWeight: '600', margin: '0 0 20px 0', lineHeight: '1.4' }}>
                If an account exists for <strong>{email}</strong>, we have sent a secure password reset link.
              </p>
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  textDecoration: 'none',
                }}
              >
                Back to Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '24px' }}>
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
                {isSubmitting ? 'Sending link…' : 'Send Reset Link'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '13px', color: '#6B7280', fontWeight: '600', marginTop: '20px' }}>
                Remember your password?{' '}
                <Link href="/login" style={{ color: '#2563EB', fontWeight: '700', textDecoration: 'none' }}>
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
