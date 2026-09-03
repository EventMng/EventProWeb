import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { loadOwnedRegistration } from "@/lib/participants";
import { sendQRInvitation } from "@/lib/mailer";

// POST /api/participants/[registrationId]/resend — resend an attendee's existing QR ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const roleCheck = requireRole(user, ['ORG_ADMIN', 'ORGANIZER']);
    if (roleCheck) return roleCheck;

    const { registrationId } = await params;
    const registration = await loadOwnedRegistration(registrationId, user.organizationId);

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    // The signed token was generated once at registration time and is still
    // valid (90d expiry) — resend reuses it rather than minting a new one,
    // so a participant's old email link/QR image keeps working too.
    await sendQRInvitation({
      to: registration.participant.email,
      participantName: registration.participant.fullName,
      eventName: registration.event.name,
      qrToken: registration.qrToken,
    });

    await db.eventRegistration.update({
      where: { id: registrationId },
      data: { invitationSentAt: new Date() },
    });

    return NextResponse.json({ message: 'Ticket resent', registrationId });
  } catch (error) {
    console.error('Failed to resend ticket:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
