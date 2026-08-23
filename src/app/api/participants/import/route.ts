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
    let duplicateInFileCount = 0;
    const errors: string[] = [];

    // De-dupe rows by email within this one upload first. The rows in a
    // batch below are processed concurrently, so two rows for the same new
    // email would otherwise race find-or-create and end up as two separate
    // Participant records (the eventId+participantId unique constraint
    // can't catch that, since they'd have different participantIds).
    const seenEmails = new Set<string>();
    const rows: { fullName: string; email: string; ticketType?: string; imageUrl?: string }[] = [];

    for (const item of participants) {
      const { fullName, email, ticketType, imageUrl } = item;
      if (!fullName || !email) {
        errors.push(`Skipped invalid entry: ${JSON.stringify(item)}`);
        continue;
      }
      const key = email.trim().toLowerCase();
      if (seenEmails.has(key)) {
        duplicateInFileCount++;
        continue;
      }
      seenEmails.add(key);
      rows.push({ fullName, email, ticketType, imageUrl });
    }

    // Process in small concurrent batches rather than one row at a time
    // (too slow for hundreds of rows) or all at once (bursts the SMTP/
    // Resend connection past its rate limit). A short pause between
    // batches spreads the email sends out instead of firing them in one
    // spike.
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 300;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (row) => {
          const { fullName, email, ticketType, imageUrl } = row;

          let participant = await db.participant.findFirst({
            where: { email, organizationId: event.organizationId },
          });

          if (!participant) {
            participant = await db.participant.create({
              data: {
                organizationId: event.organizationId,
                fullName,
                email,
                imageUrl: imageUrl || null,
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
            return { email, skipped: true };
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

          return { email, skipped: false };
        })
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.skipped) skippedCount++;
          else successCount++;
        } else {
          errors.push(`Failed for ${batch[index].email}: ${result.reason?.message ?? result.reason}`);
        }
      });

      const isLastBatch = i + BATCH_SIZE >= rows.length;
      if (!isLastBatch) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    return NextResponse.json({
      message: `Successfully imported ${successCount} participants (${skippedCount} already registered, ${duplicateInFileCount} duplicate rows in file, skipped)`,
      successCount,
      skippedCount,
      duplicateInFileCount,
      errorsCount: errors.length,
      errors,
    });
  } catch (error: any) {
    console.error('CSV import failed:', error);
    return NextResponse.json({ error: 'Failed to process CSV import' }, { status: 500 });
  }
}
