import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { deriveEventStatus } from "@/lib/events";

// GET /api/events — list this organization's events with derived status and headcount
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const roleCheck = requireRole(user, ['ORG_ADMIN', 'ORGANIZER']);
    if (roleCheck) return roleCheck;

    const events = await db.event.findMany({
      where: { organizationId: user.organizationId },
      include: { registrations: { select: { attended: true } } },
      orderBy: { eventDate: 'desc' },
    });

    const now = new Date();
    const formatted = events.map((event) => ({
      id: event.id,
      name: event.name,
      location: event.location,
      eventDate: event.eventDate,
      status: deriveEventStatus(event.eventDate, now),
      totalRegistrations: event.registrations.length,
      checkedInCount: event.registrations.filter((r) => r.attended).length,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
