import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

  const { registrationId } = await request.json();

  if (typeof registrationId !== 'string') {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
  }

  const registration = await loadOwnedRegistration(registrationId, user.organizationId);

  if (!registration) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  if (registration.attended) {
    return NextResponse.json({ error: 'ALREADY_MARKED' }, { status: 409 });
  }

  // markedBy always comes from the authenticated caller, never the request
  // body — otherwise any client could attribute a check-in to any user.
  const updated = await db.eventRegistration.update({
    where: { id: registrationId },
    data: { attended: true, attendedAt: new Date(), markedBy: user.id },
  });

  return NextResponse.json({ registrationId: updated.id, attended: true });
}
