import { describe, it, expect, beforeAll } from 'vitest';
import { signQRToken, verifyToken, verifyQRToken, generateQRCodeDataURL } from './qr-token';

beforeAll(() => {
  process.env.QR_TOKEN_SECRET = 'test-secret-for-qr-token-suite';
});

const samplePayload = {
  registrationId: 'reg_1',
  eventId: 'event_1',
  participantId: 'participant_1',
};

describe('signQRToken / verifyToken', () => {
  it('round-trips a signed token back to its original payload', async () => {
    const token = await signQRToken(samplePayload);
    const result = await verifyToken(token);

    expect(result.valid).toBe(true);
    expect(result.payload?.registrationId).toBe(samplePayload.registrationId);
    expect(result.payload?.eventId).toBe(samplePayload.eventId);
    expect(result.payload?.participantId).toBe(samplePayload.participantId);
  });

  it('rejects an empty token as malformed', async () => {
    const result = await verifyToken('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('MALFORMED_TOKEN');
  });

  it('rejects a tampered token as invalid', async () => {
    const token = await signQRToken(samplePayload);
    const tampered = token.slice(0, -2) + (token.slice(-2) === 'aa' ? 'bb' : 'aa');

    const result = await verifyToken(tampered);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_TOKEN');
  });

  it('rejects an already-expired token', async () => {
    // jose's setExpirationTime accepts a number of seconds relative to
    // iat when given a plain number — a negative value backdates the
    // expiry into the past immediately, no need to sleep past a delay.
    const token = await signQRToken(samplePayload, -10);

    const result = await verifyToken(token);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('EXPIRED_TOKEN');
  });
});

describe('verifyQRToken', () => {
  it('returns the decoded payload for a valid token', async () => {
    const token = await signQRToken(samplePayload);
    const payload = await verifyQRToken(token);

    expect(payload.registrationId).toBe(samplePayload.registrationId);
  });

  it('throws for an invalid token', async () => {
    await expect(verifyQRToken('not-a-real-token')).rejects.toThrow();
  });
});

describe('generateQRCodeDataURL', () => {
  it('produces a base64 PNG data URL', async () => {
    const dataUrl = await generateQRCodeDataURL('some-token-string');
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });
});
