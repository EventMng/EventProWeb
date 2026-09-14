import { describe, it, expect } from 'vitest';
import { deriveEventStatus } from './events';

describe('deriveEventStatus', () => {
  const now = new Date('2026-08-23T12:00:00Z');

  it('returns Live for an event happening today', () => {
    const eventDate = new Date('2026-08-23T09:00:00Z');
    expect(deriveEventStatus(eventDate, now)).toBe('Live');
  });

  it('returns Upcoming for a future event', () => {
    const eventDate = new Date('2026-09-04T18:00:00Z');
    expect(deriveEventStatus(eventDate, now)).toBe('Upcoming');
  });

  it('returns Completed for a past event', () => {
    const eventDate = new Date('2026-08-02T19:00:00Z');
    expect(deriveEventStatus(eventDate, now)).toBe('Completed');
  });
});
