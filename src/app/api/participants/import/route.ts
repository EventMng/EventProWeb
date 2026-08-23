import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signQRToken } from "@/lib/qr-token";
import { sendQRInvitation } from "@/lib/mailer";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const roleCheck = requireRole(user, ['ORG_ADMIN', 'ORGANIZER']);
    if (roleCheck) return roleCheck;

    const { eventId, participants } = await request.json();

    if (!eventId || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: 'eventId and a non-empty participants array are required.' },
        { status: 400 }
      );
    }

    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    let successCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Batch process participants
    for (const item of participants) {
      const { fullName, email, ticketType } = item;
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
              imageUrl: item.imageUrl || null,
              createdById: user.id,
            },
          });
        }

        // Skip participants already registered for this event instead of
        // creating a duplicate registration and re-sending their ticket.
        const existingRegistration = await db.eventRegistration.findUnique({
          where: {
            eventId_participantId: {
              eventId,
              participantId: participant.id,
            },
          },
        });

        if (existingRegistration) {
          skippedCount++;
          continue;
        }

        const registration = await db.eventRegistration.create({
          data: {
            eventId,
            participantId: participant.id,
            ticketType: typeof ticketType === 'string' && ticketType.trim() ? ticketType : 'General',
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
      message: `Successfully imported ${successCount} participants (${skippedCount} already registered, skipped)`,
      successCount,
      skippedCount,
      errorsCount: errors.length,
      errors,
    });
  } catch (error: any) {
    console.error('CSV import failed:', error);
    return NextResponse.json({ error: 'Failed to process CSV import' }, { status: 500 });
  }
}
