import { describe, it, expect } from 'vitest';
import { deriveEventStatus } from './events';

describe('deriveEventStatus', () => {
  const now = new Date('2026-08-23T12:00:00Z');

  it('returns Live for an event happening today without endDate', () => {
    const eventDate = new Date('2026-08-23T09:00:00Z');
    expect(deriveEventStatus(eventDate, null, now)).toBe('Live');
  });

  it('returns Upcoming for a future event without endDate', () => {
    const eventDate = new Date('2026-09-04T18:00:00Z');
    expect(deriveEventStatus(eventDate, null, now)).toBe('Upcoming');
  });

  it('returns Completed for a past event without endDate', () => {
    const eventDate = new Date('2026-08-02T19:00:00Z');
    expect(deriveEventStatus(eventDate, null, now)).toBe('Completed');
  });

  it('returns Upcoming when now is before eventDate with endDate', () => {
    const eventDate = new Date('2026-08-24T10:00:00Z');
    const endDate = new Date('2026-08-24T18:00:00Z');
    expect(deriveEventStatus(eventDate, endDate, now)).toBe('Upcoming');
  });

  it('returns Live when now is between eventDate and endDate', () => {
    const eventDate = new Date('2026-08-23T10:00:00Z');
    const endDate = new Date('2026-08-23T18:00:00Z');
    expect(deriveEventStatus(eventDate, endDate, now)).toBe('Live');
  });

  it('returns Completed when now is after endDate', () => {
    const eventDate = new Date('2026-08-23T08:00:00Z');
    const endDate = new Date('2026-08-23T11:00:00Z');
    expect(deriveEventStatus(eventDate, endDate, now)).toBe('Completed');
  });
});
