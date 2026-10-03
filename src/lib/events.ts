export type EventStatus = 'Live' | 'Upcoming' | 'Completed';

// Derived from eventDate (and optional endDate):
// If endDate is provided:
// - now < eventDate -> Upcoming
// - eventDate <= now <= endDate -> Live
// - now > endDate -> Completed
// If no endDate provided (legacy/single timestamp):
// - same calendar day as now -> Live
// - past -> Completed
// - future -> Upcoming
export function deriveEventStatus(
  eventDate: Date,
  endDate?: Date | null,
  now: Date = new Date()
): EventStatus {
  const current = now;
  if (endDate) {
    if (current < eventDate) return 'Upcoming';
    if (current > endDate) return 'Completed';
    return 'Live';
  }
  if (eventDate.toDateString() === current.toDateString()) return 'Live';
  return eventDate < current ? 'Completed' : 'Upcoming';
}

