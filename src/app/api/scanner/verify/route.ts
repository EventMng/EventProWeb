import { NextRequest, NextResponse } from 'next/server';
import { verifyQRToken } from '@/lib/qr-token';
import { getSessionUser } from '@/lib/session';
import { requireRole } from '@/lib/authz';
import { loadOwnedRegistration } from '@/lib/participants';

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const roleCheck = requireRole(user, ['FRONTMAN']);
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

  // Scoped to the caller's organization, same as every other lookup —
  // a Frontman in one org can't probe registration IDs from another.
  const registration = await loadOwnedRegistration(payload.registrationId, user.organizationId);

  if (!registration) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  // The mobile scanner is opened scoped to one event (/scanner/[eventId]).
  // Reject a ticket that's valid but belongs to a different event, rather
  // than letting it check someone into the wrong event.
  if (typeof eventId === 'string' && eventId && registration.eventId !== eventId) {
    return NextResponse.json({ error: 'WRONG_EVENT' }, { status: 409 });
  }

  return NextResponse.json({
    registrationId: registration.id,
    participant: registration.participant,
    event: registration.event,
    attended: registration.attended,
  });
}
