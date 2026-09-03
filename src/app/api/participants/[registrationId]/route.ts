import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { loadOwnedRegistration } from "@/lib/participants";

// PATCH /api/participants/[registrationId] — edit a roster entry's details
export async function PATCH(
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

    // Same response for "doesn't exist" and "exists in another org".
    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    const body = await request.json();
    const { fullName, email, ticketType } = body;

    const participantData: { fullName?: string; email?: string } = {};
    if (typeof fullName === 'string' && fullName.trim()) participantData.fullName = fullName;
    if (typeof email === 'string' && email.trim()) participantData.email = email;

    if (Object.keys(participantData).length > 0) {
      await db.participant.update({
        where: { id: registration.participantId },
        data: participantData,
      });
    }

    const registrationData: { ticketType?: string } = {};
    if (typeof ticketType === 'string' && ticketType.trim()) registrationData.ticketType = ticketType;

    const updated = await db.eventRegistration.update({
      where: { id: registrationId },
      data: registrationData,
      include: { participant: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update participant:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/participants/[registrationId] — remove an attendee from this event
export async function DELETE(
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

    await db.eventRegistration.delete({ where: { id: registrationId } });

    return NextResponse.json({ message: 'Removed from event', registrationId });
  } catch (error) {
    console.error('Failed to remove participant:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
