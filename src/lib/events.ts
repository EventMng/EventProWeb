export type EventStatus = 'Live' | 'Upcoming' | 'Completed';

// Derived from eventDate since Event has no stored status column:
// past -> Completed, same calendar day as now -> Live, future -> Upcoming.
export function deriveEventStatus(eventDate: Date, now: Date = new Date()): EventStatus {
  if (eventDate.toDateString() === now.toDateString()) return 'Live';
  return eventDate < now ? 'Completed' : 'Upcoming';
}
