import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signQRToken } from "@/lib/qr-token";
import { sendQRInvitation } from "@/lib/mailer";

// GET /api/participants?eventId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId query parameter' },
        { status: 400 }
      );
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
    const body = await request.json();
    const { eventId, fullName, email } = body;

    if (!eventId || !fullName || !email) {
      return NextResponse.json(
        { error: 'eventId, fullName, and email are required.' },
        { status: 400 }
      );
    }

    // 1. Verify Event exists
    const event = await db.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
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
        qrToken: `temp_${Date.now()}`,
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