import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { sendMemberInvitation } from "@/lib/mailer";

const ASSIGNABLE_ROLES = ["ORGANIZER", "FRONTMAN", "MEMBER", "ORG_ADMIN"] as const;

// GET /api/members — list this organization's members
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    // GET/api/members - list this organization's members
    const roleCheck = requireRole(user, ["ORG_ADMIN", "ORGANIZER"]);
    if (roleCheck) return roleCheck;

    const rawMembers = await db.user.findMany({
      where: {
        OR: [
          { organizationId: user.organizationId },
          { organizations: { some: { id: user.organizationId } } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        imageUrl: true,
        isTemporaryPassword: true,
        createdAt: true,
        organizationId: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // In this organization, any user linked from another organization, or any user whose
    // role was temporarily set to FRONTMAN for an event, is a general MEMBER of this organization.
    const members = rawMembers.map((m) => {
      let effectiveRole = m.role as string;
      if (m.organizationId !== user.organizationId || m.role === "FRONTMAN") {
        effectiveRole = "MEMBER";
      }

      return {
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        role: effectiveRole,
        imageUrl: m.imageUrl,
        isTemporaryPassword: m.isTemporaryPassword,
        createdAt: m.createdAt,
      };
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/members — add a member (or link existing user) to organization
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    // POST /api/members - add a member (or link existing user) to organization
    const roleCheck = requireRole(user, ["ORG_ADMIN", "ORGANIZER"]);
    if (roleCheck) return roleCheck;

    const body = await request.json();
    const { fullName, email, imageUrl } = body;
    const role = body.role || "MEMBER";

    if (user.role === 'ORGANIZER' && role === 'ORG_ADMIN') {
      return NextResponse.json({ error: 'FORBIDDEN: Organizers cannot create Org Admins' }, { status: 403 });
    }

    if (typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "fullName is required." }, { status: 400 });
    }
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "email is required." }, { status: 400 });
    }
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists in system
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: { organizations: { select: { id: true } } },
    });

    if (existing) {
      // Check if user is ALREADY a member of this organization
      const isAlreadyMember =
        existing.organizationId === user.organizationId ||
        existing.organizations.some((o) => o.id === user.organizationId);

      if (isAlreadyMember) {
        return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 409 });
      }

      // Link existing user to this organization
      const updatedMember = await db.user.update({
        where: { id: existing.id },
        data: {
          organizations: {
            connect: { id: user.organizationId },
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          imageUrl: true,
          isTemporaryPassword: true,
          createdAt: true,
          organizationId: true,
        },
      });

      // When added to this organization, their effective role in this organization is MEMBER,
      // never inheriting external FRONTMAN or ORGANIZER roles from other organizations.
      const effectiveRole = role === "ORGANIZER" && updatedMember.organizationId === user.organizationId
        ? "ORGANIZER"
        : "MEMBER";

      return NextResponse.json(
        {
          member: {
            ...updatedMember,
            role: effectiveRole,
          },
          isExistingUser: true,
        },
        { status: 200 }
      );
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const member = await db.user.create({
      data: {
        organizationId: user.organizationId,
        organizations: {
          connect: { id: user.organizationId },
        },
        fullName: fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        imageUrl: typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null,
        isTemporaryPassword: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        imageUrl: true,
        isTemporaryPassword: true,
        createdAt: true,
      },
    });

    const organization = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    });

    const emailSent = await sendMemberInvitation({
      to: member.email,
      fullName: member.fullName,
      organizationName: organization?.name ?? "your organization",
      role: member.role,
      tempPassword,
    });

    // Credentials are sent directly via email. Do not expose tempPassword in HTTP response.
    return NextResponse.json({ member, emailSent }, { status: 201 });
  } catch (error) {
    console.error("Failed to add member:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
