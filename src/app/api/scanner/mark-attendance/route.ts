import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { registrationId, markedBy } = await request.json();

  if (typeof registrationId !== 'string' || typeof markedBy !== 'string') {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
  }

  const registration = await db.eventRegistration.findUnique({ where: { id: registrationId } });

  if (!registration) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  if (registration.attended) {
    return NextResponse.json({ error: 'ALREADY_MARKED' }, { status: 409 });
  }

  const updated = await db.eventRegistration.update({
    where: { id: registrationId },
    data: { attended: true, attendedAt: new Date(), markedBy },
  });

  return NextResponse.json({ registrationId: updated.id, attended: true });
}
