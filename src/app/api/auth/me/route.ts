import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { verifyPassword } from "@/lib/password";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.id },
    include: { primaryOrganization: true },
  });

  if (!user || !user.primaryOrganization) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.primaryOrganization.name,
      isTemporaryPassword: user.isTemporaryPassword,
      imageUrl: user.imageUrl ?? null,
    },
  });
}

// PATCH /api/auth/me — update the caller's own email
export async function PATCH(request: NextRequest) {
  const session = await getSessionUser(request);
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, currentPassword } = body;

    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json({ error: "Current password is required to change email." }, { status: 400 });
    }

    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid current password" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing && existing.id !== session.id) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const updatedUser = await db.user.update({
      where: { id: session.id },
      data: { email: normalizedEmail },
      include: { primaryOrganization: true },
    });

    if (!updatedUser.primaryOrganization) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        role: updatedUser.role,
        organizationId: updatedUser.organizationId,
        organizationName: updatedUser.primaryOrganization.name,
        isTemporaryPassword: updatedUser.isTemporaryPassword,
        imageUrl: updatedUser.imageUrl ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to update email:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
