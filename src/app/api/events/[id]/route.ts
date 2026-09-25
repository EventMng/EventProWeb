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

    const roleCheck = requireRole(user, ['ORG_ADMIN', 'ORGANIZER', 'FRONTMAN']);
    if (roleCheck) return roleCheck;

    const { id } = await params;
    const event = await db.event.findUnique({
      where: { id },
      include: {
        registrations: { select: { attended: true } },
        frontmen: { select: { userId: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const userRecord = await db.user.findUnique({
      where: { id: user.id },
      select: {
        organizationId: true,
        organizations: { select: { id: true } },
      },
    });

    const userOrgIds = new Set(
      [
        user.organizationId,
        ...(userRecord?.organizations?.map((o) => o.id) || []),
      ].filter(Boolean) as string[]
    );

    const isAssignedFrontman = event.frontmen.some((f) => f.userId === user.id);
    const belongsToOrg = userOrgIds.has(event.organizationId);

    if (user.role !== 'SYSTEM_ADMIN' && !belongsToOrg && !isAssignedFrontman) {
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
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
