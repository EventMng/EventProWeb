import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signQRToken } from "@/lib/qr-token";
import { sendQRInvitation } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  try {
    const { eventId, participants } = await request.json();

    if (!eventId || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: 'eventId and a non-empty participants array are required.' },
        { status: 400 }
      );
    }

    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    let successCount = 0;
    const errors: string[] = [];

    // Batch process participants
    for (const item of participants) {
      const { fullName, email } = item;
      if (!fullName || !email) {
        errors.push(`Skipped invalid entry: ${JSON.stringify(item)}`);
        continue;
      }

      try {
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

        const registration = await db.eventRegistration.create({
          data: {
            eventId,
            participantId: participant.id,
            qrToken: `temp_${Date.now()}_${Math.random()}`,
          },
        });

        const qrToken = await signQRToken({
          registrationId: registration.id,
          eventId,
          participantId: participant.id,
        });

        await db.eventRegistration.update({
          where: { id: registration.id },
          data: { qrToken, invitationSentAt: new Date() },
        });

        await sendQRInvitation({
          to: email,
          participantName: fullName,
          eventName: event.name,
          qrToken,
        });

        successCount++;
      } catch (err: any) {
        errors.push(`Failed for ${email}: ${err.message}`);
      }
    }

    return NextResponse.json({
      message: `Successfully imported ${successCount} participants`,
      successCount,
      errorsCount: errors.length,
      errors,
    });
  } catch (error: any) {
    console.error('CSV import failed:', error);
    return NextResponse.json({ error: 'Failed to process CSV import' }, { status: 500 });
  }
}
