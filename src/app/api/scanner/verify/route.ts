import { NextRequest, NextResponse } from 'next/server';
import { verifyQRToken } from '@/lib/qr-token';
import { getSessionUser } from '@/lib/session';
import { requireRole } from '@/lib/authz';
import { db } from '@/lib/db';
import { loadOwnedRegistration } from '@/lib/participants';

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const roleCheck = requireRole(user, ['FRONTMAN', 'ORGANIZER', 'ORG_ADMIN']);
  if (roleCheck) return roleCheck;

  const { qrToken, eventId } = await request.json();

  if (typeof qrToken !== 'string') {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
  }

  let payload;
  try {
    payload = await verifyQRToken(qrToken);
  } catch {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
  }

  // Scoped to the caller's organization or frontman assignments
  const registration = await loadOwnedRegistration(payload.registrationId, user.organizationId, user.id);

  if (!registration) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  // Business Rule: Frontman can ONLY scan QR codes for events explicitly assigned to them
  if (user.role === 'FRONTMAN') {
    const isAssigned = await db.eventFrontman.findUnique({
      where: {
        eventId_userId: {
          eventId: registration.eventId,
          userId: user.id,
        },
      },
    });

    if (!isAssigned) {
      return NextResponse.json({
        error: 'NOT_ASSIGNED',
        message: 'You are only allowed to scan tickets for events assigned to you.',
      }, { status: 403 });
    }
  }

  // The mobile scanner is opened scoped to one event (/scanner/[eventId]).
  // Reject a ticket that's valid but belongs to a different event, rather
  // than letting it check someone into the wrong event.
  console.log(`[Scanner Verify] Ticket event: "${registration.event?.name}" (${registration.eventId}) vs Scanner event: (${eventId})`);
  if (typeof eventId === 'string' && eventId && registration.eventId !== eventId) {
    console.log(`[Scanner Verify] Mismatch: Ticket is for "${registration.event?.name}", but scanner opened for "${eventId}"`);
    return NextResponse.json({
      error: 'WRONG_EVENT',
      ticketEventName: registration.event?.name,
    }, { status: 409 });
  }

  return NextResponse.json({
    registrationId: registration.id,
    participant: registration.participant,
    event: registration.event,
    attended: registration.attended,
  });
}
