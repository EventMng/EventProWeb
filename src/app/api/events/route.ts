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

    const roleCheck = requireRole(user, ['ORG_ADMIN', 'ORGANIZER', 'FRONTMAN']);
    if (roleCheck) return roleCheck;

    const whereClause: any = { organizationId: user.organizationId };
    if (user.role === "FRONTMAN") {
      whereClause.frontmen = { some: { userId: user.id } };
    }

    const events = await db.event.findMany({
      where: whereClause,
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

// POST /api/events — create a new event (Event ID is auto-generated via UUID)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const roleCheck = requireRole(user, ['ORG_ADMIN', 'ORGANIZER']);
    if (roleCheck) return roleCheck;

    const body = await request.json();
    const { name, location, eventDate } = body;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 });
    }
    if (!eventDate) {
      return NextResponse.json({ error: 'eventDate is required.' }, { status: 400 });
    }

    const parsedDate = new Date(eventDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid eventDate format.' }, { status: 400 });
    }

    const event = await db.event.create({
      data: {
        organizationId: user.organizationId,
        createdBy: user.id,
        name: name.trim(),
        location: typeof location === 'string' && location.trim() ? location.trim() : null,
        eventDate: parsedDate,
      },
    });

    return NextResponse.json(
      {
        message: 'Event created successfully',
        event: {
          id: event.id,
          name: event.name,
          location: event.location,
          eventDate: event.eventDate,
          status: deriveEventStatus(event.eventDate, new Date()),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
