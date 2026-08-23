import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { deriveEventStatus } from "@/lib/events";

// GET /api/events/[id] — a single event's details with derived status and headcount
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const roleCheck = requireRole(user, ['ORG_ADMIN', 'ORGANIZER']);
    if (roleCheck) return roleCheck;

    const { id } = await params;
    const event = await db.event.findUnique({
      where: { id },
      include: { registrations: { select: { attended: true } } },
    });

    // Same response for "doesn't exist" and "exists in another org".
    if (!event || event.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: event.id,
      name: event.name,
      location: event.location,
      eventDate: event.eventDate,
      status: deriveEventStatus(event.eventDate),
      totalRegistrations: event.registrations.length,
      checkedInCount: event.registrations.filter((r) => r.attended).length,
    });
  } catch (error: any) {
    console.error('Failed to fetch event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
