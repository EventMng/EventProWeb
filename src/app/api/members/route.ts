import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { hashPassword, generateTempPassword } from "@/lib/password";

const ASSIGNABLE_ROLES = ["ORGANIZER", "FRONTMAN"] as const;

// GET /api/members — list this organization's members
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["ORG_ADMIN"]);
    if (roleCheck) return roleCheck;

    const members = await db.user.findMany({
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
      },
      orderBy: { createdAt: "asc" },
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

    const roleCheck = requireRole(user, ["ORG_ADMIN"]);
    if (roleCheck) return roleCheck;

    const body = await request.json();
    const { fullName, email, imageUrl } = body;
    const role = body.role || "FRONTMAN";

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
        },
      });

      return NextResponse.json(
        { member: updatedMember, isExistingUser: true },
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

    // tempPassword is only ever returned here — it isn't stored in plaintext.
    return NextResponse.json({ member, tempPassword }, { status: 201 });
  } catch (error) {
    console.error("Failed to add member:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
