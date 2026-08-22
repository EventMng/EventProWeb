import { NextRequest, NextResponse } from 'next/server';
import { verifyQRToken } from '@/lib/qr-token';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { qrToken } = await request.json();

  if (typeof qrToken !== 'string') {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
  }

  let payload;
  try {
    payload = await verifyQRToken(qrToken);
  } catch {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
  }

  const registration = await db.eventRegistration.findUnique({
    where: { id: payload.registrationId },
    include: { participant: true, event: true },
  });

  if (!registration) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    registrationId: registration.id,
    participant: registration.participant,
    event: registration.event,
    attended: registration.attended,
  });
}
