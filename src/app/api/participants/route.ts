import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signQRToken } from "@/lib/qr-token";
import { sendQRInvitation } from "@/lib/mailer";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";

// GET /api/participants?eventId=xxx
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const roleCheck = requireRole(user, ['ORG_ADMIN', 'ORGANIZER', 'FRONTMAN']);
    if (roleCheck) return roleCheck;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId query parameter' },
        { status: 400 }
      );
    }

    const event = await db.event.findUnique({ where: { id: eventId } });

    // Same response for "doesn't exist" and "exists in another org" —
    // don't let a 403 confirm the ID is real.
    if (!event || event.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const registrations = await db.eventRegistration.findMany({
      where: { eventId },
      include: {
        participant: true,
        event: true,
      },
      orderBy: { participant: { fullName: 'asc' } },
    });

    return NextResponse.json(registrations);
  } catch (error: any) {
    console.error('Failed to fetch participants:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/participants
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const roleCheck = requireRole(user, ['ORG_ADMIN', 'ORGANIZER']);
    if (roleCheck) return roleCheck;

    const body = await request.json();
    const { eventId, fullName, email, ticketType } = body;

    if (!eventId || !fullName || !email) {
      return NextResponse.json(
        { error: 'eventId, fullName, and email are required.' },
        { status: 400 }
      );
    }

    // 1. Verify Event exists and belongs to the caller's organization
    const event = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!event || event.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // 2. Find or Create Participant
    let participant = await db.participant.findFirst({
      where: { email, organizationId: event.organizationId },
    });

    if (!participant) {
      participant = await db.participant.create({
        data: {
          organizationId: event.organizationId,
          fullName,
          email,
        },
      });
    }

    // 3. Create Event Registration
    const registration = await db.eventRegistration.create({
      data: {
        eventId,
        participantId: participant.id,
        ticketType: typeof ticketType === 'string' && ticketType.trim() ? ticketType : 'General',
        qrToken: `temp_${Date.now()}_${Math.random()}`,
      },
    });

    // 4. Generate Cryptographic Signed QR Token
    const qrToken = await signQRToken({
      registrationId: registration.id,
      eventId,
      participantId: participant.id,
    });

    // 5. Update Registration Record with Signed Token
    await db.eventRegistration.update({
      where: { id: registration.id },
      data: {
        qrToken,
        invitationSentAt: new Date(),
      },
    });

    // 6. Send Email QR Ticket
    await sendQRInvitation({
      to: email,
      participantName: fullName,
      eventName: event.name,
      qrToken,
    });

    return NextResponse.json(
      {
        message: 'Participant registered and QR ticket dispatched successfully',
        registrationId: registration.id,
        qrToken,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to register participant:', error);
    return NextResponse.json(
      { error: 'Failed to process participant registration' },
      { status: 500 }
    );
  }
}