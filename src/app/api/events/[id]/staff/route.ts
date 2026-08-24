import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";

// GET /api/events/[id]/staff — List members assigned to this event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizationId: true },
    });

    if (!event || event.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const staffAssignments = await db.eventFrontman.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            imageUrl: true,
            isTemporaryPassword: true,
          },
        },
      },
      orderBy: { assignedAt: "asc" },
    });

    const staff = staffAssignments.map((sa) => ({
      id: sa.user.id,
      fullName: sa.user.fullName,
      email: sa.user.email,
      imageUrl: sa.user.imageUrl,
      isTemporaryPassword: sa.user.isTemporaryPassword,
      assignedAt: sa.assignedAt,
      role: "FRONTMAN", // Event role assigned for ticket scanning/management
    }));

    return NextResponse.json(staff);
  } catch (error: any) {
    console.error("Failed to fetch event staff:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/events/[id]/staff — Assign member(s) to this event with Event Frontman role
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["ORG_ADMIN", "ORGANIZER"]);
    if (roleCheck) return roleCheck;

    const { id: eventId } = await params;
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizationId: true },
    });

    if (!event || event.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Check user belongs to organization
    const targetUser = await db.user.findFirst({
      where: { id: userId, organizationId: user.organizationId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found in organization" }, { status: 404 });
    }

    // Assign to event
    const assignment = await db.eventFrontman.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      update: {},
      create: {
        eventId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            imageUrl: true,
            isTemporaryPassword: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Member assigned to event successfully",
      staff: {
        id: assignment.user.id,
        fullName: assignment.user.fullName,
        email: assignment.user.email,
        imageUrl: assignment.user.imageUrl,
        isTemporaryPassword: assignment.user.isTemporaryPassword,
        assignedAt: assignment.assignedAt,
        role: "FRONTMAN",
      },
    });
  } catch (error: any) {
    console.error("Failed to assign staff to event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/events/[id]/staff — Unassign a member from this event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["ORG_ADMIN", "ORGANIZER"]);
    if (roleCheck) return roleCheck;

    const { id: eventId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await db.eventFrontman.deleteMany({
      where: {
        eventId,
        userId,
      },
    });

    return NextResponse.json({ message: "Member removed from event successfully" });
  } catch (error: any) {
    console.error("Failed to remove staff from event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
