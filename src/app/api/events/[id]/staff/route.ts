import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { signQRToken } from "@/lib/qr-token";
import { sendQRInvitation } from "@/lib/mailer";

// Helper to ensure member/user is also registered as a participant for the event
async function ensureEventParticipant(
  eventId: string,
  eventOrgId: string,
  eventName: string,
  user: { id: string; fullName: string; email: string; imageUrl?: string | null; role?: string },
  creatorId: string,
  ticketType?: string
) {
  const normalizedEmail = user.email.trim().toLowerCase();

  // 1. Find or create Participant record
  let participant = await db.participant.findFirst({
    where: {
      email: normalizedEmail,
      organizationId: eventOrgId,
    },
  });

  if (!participant) {
    participant = await db.participant.create({
      data: {
        organizationId: eventOrgId,
        fullName: user.fullName.trim(),
        email: normalizedEmail,
        imageUrl: user.imageUrl ?? null,
        createdById: creatorId,
      },
    });
  }

  // 2. Check if already registered for this event
  const existingReg = await db.eventRegistration.findUnique({
    where: {
      eventId_participantId: {
        eventId,
        participantId: participant.id,
      },
    },
  });

  if (!existingReg) {
    const regTicketType =
      ticketType ||
      (user.role === "ORGANIZER"
        ? "Organizer"
        : user.role === "FRONTMAN"
          ? "Staff"
          : "General");

    const registration = await db.eventRegistration.create({
      data: {
        eventId,
        participantId: participant.id,
        ticketType: regTicketType,
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
      data: {
        qrToken,
        invitationSentAt: new Date(),
      },
    });

    try {
      await sendQRInvitation({
        to: normalizedEmail,
        participantName: user.fullName,
        eventName: eventName,
        qrToken,
      });
    } catch (e) {
      console.error("Failed to send QR invitation to assigned member:", e);
    }
  }
}

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
  } catch (error) {
    console.error("Failed to fetch event staff:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/events/[id]/staff — Assign member(s) to this event with Event Frontman role & register as participants
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
      select: { id: true, name: true, organizationId: true },
    });

    if (!event || event.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await request.json();
    const { userId, userIds, all, newcomer, newMember } = body;
    const newcomerData = newcomer || newMember;

    // --- Newcomer Registration and Event Assignment ---
    if (newcomerData) {
      const { fullName, email, ticketType } = newcomerData;
      if (typeof fullName !== "string" || !fullName.trim()) {
        return NextResponse.json({ error: "fullName is required for newcomer" }, { status: 400 });
      }
      if (typeof email !== "string" || !email.trim()) {
        return NextResponse.json({ error: "email is required for newcomer" }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      let targetUser = await db.user.findUnique({
        where: { email: normalizedEmail },
        include: { organizations: { select: { id: true } } },
      });

      let tempPassword: string | undefined;

      if (targetUser) {
        // Link to organization if not already linked, but preserve existing role and password
        const isLinked =
          targetUser.organizationId === user.organizationId ||
          targetUser.organizations.some((o) => o.id === user.organizationId);

        if (!isLinked) {
          targetUser = await db.user.update({
            where: { id: targetUser.id },
            data: {
              organizations: { connect: { id: user.organizationId } },
            },
            include: { organizations: { select: { id: true } } },
          });
        }
      } else {
        tempPassword = generateTempPassword();
        const passwordHash = await hashPassword(tempPassword);

        targetUser = await db.user.create({
          data: {
            organizationId: user.organizationId,
            organizations: {
              connect: { id: user.organizationId },
            },
            fullName: fullName.trim(),
            email: normalizedEmail,
            passwordHash,
            role: "FRONTMAN",
            isTemporaryPassword: true,
          },
          include: { organizations: { select: { id: true } } },
        });
      }

      const assignment = await db.eventFrontman.upsert({
        where: {
          eventId_userId: {
            eventId,
            userId: targetUser.id,
          },
        },
        update: {},
        create: {
          eventId,
          userId: targetUser.id,
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

      // Ensure registered in participants for this event
      await ensureEventParticipant(
        eventId,
        event.organizationId,
        event.name,
        targetUser,
        user.id,
        ticketType || "General"
      );

      return NextResponse.json({
        message: "New member registered and assigned to event successfully",
        staff: {
          id: assignment.user.id,
          fullName: assignment.user.fullName,
          email: assignment.user.email,
          imageUrl: assignment.user.imageUrl,
          isTemporaryPassword: assignment.user.isTemporaryPassword,
          assignedAt: assignment.assignedAt,
          role: "FRONTMAN",
        },
        tempPassword,
      });
    }

    // --- Bulk Assignment (all: true or userIds: string[]) ---
    if (all === true || Array.isArray(userIds)) {
      let targetUsers: { id: string; fullName: string; email: string; imageUrl: string | null; role?: string }[] = [];

      if (all === true) {
        // Fetch all organization users not yet assigned to this event
        const existingStaff = await db.eventFrontman.findMany({
          where: { eventId },
          select: { userId: true },
        });
        const assignedIds = new Set(existingStaff.map((s) => s.userId));

        const orgUsers = await db.user.findMany({
          where: {
            OR: [
              { organizationId: user.organizationId },
              { organizations: { some: { id: user.organizationId } } },
            ],
          },
          select: { id: true, fullName: true, email: true, imageUrl: true, role: true },
        });

        targetUsers = orgUsers.filter((u) => !assignedIds.has(u.id));
      } else {
        // Fetch specific users by IDs
        targetUsers = await db.user.findMany({
          where: {
            id: { in: userIds },
            OR: [
              { organizationId: user.organizationId },
              { organizations: { some: { id: user.organizationId } } },
            ],
          },
          select: { id: true, fullName: true, email: true, imageUrl: true, role: true },
        });
      }

      if (targetUsers.length === 0) {
        return NextResponse.json({
          message: "No new members to assign",
          count: 0,
          staffList: [],
        });
      }

      const assignedList = [];

      for (const targetUser of targetUsers) {
        await db.eventFrontman.upsert({
          where: {
            eventId_userId: {
              eventId,
              userId: targetUser.id,
            },
          },
          update: {},
          create: {
            eventId,
            userId: targetUser.id,
          },
        });

        // Also register member as a participant of the event
        await ensureEventParticipant(
          eventId,
          event.organizationId,
          event.name,
          targetUser,
          user.id
        );

        assignedList.push({
          id: targetUser.id,
          fullName: targetUser.fullName,
          email: targetUser.email,
          role: targetUser.role || "FRONTMAN",
        });
      }

      return NextResponse.json({
        message: `Successfully assigned ${assignedList.length} member(s) to event`,
        count: assignedList.length,
        staffList: assignedList,
      });
    }

    // --- Single Member Assignment ---
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId or all: true is required" }, { status: 400 });
    }

    // Check user belongs to organization
    const targetUser = await db.user.findFirst({
      where: {
        id: userId,
        OR: [
          { organizationId: user.organizationId },
          { organizations: { some: { id: user.organizationId } } },
        ],
      },
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
            role: true,
          },
        },
      },
    });

    // Also register member as a participant of the event
    await ensureEventParticipant(
      eventId,
      event.organizationId,
      event.name,
      targetUser,
      user.id
    );

    return NextResponse.json({
      message: "Member assigned to event successfully",
      staff: {
        id: assignment.user.id,
        fullName: assignment.user.fullName,
        email: assignment.user.email,
        imageUrl: assignment.user.imageUrl,
        isTemporaryPassword: assignment.user.isTemporaryPassword,
        assignedAt: assignment.assignedAt,
        role: assignment.user.role || "FRONTMAN",
      },
    });
  } catch (error) {
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
  } catch (error) {
    console.error("Failed to remove staff from event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
