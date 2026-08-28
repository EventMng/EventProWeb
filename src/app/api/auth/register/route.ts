import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { SignJWT } from "jose";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationName, fullName, email, password } = body;

    if (!organizationName || !fullName || !email || !password) {
      return NextResponse.json(
        { error: "Organization name, full name, email, and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: organizationName.trim() },
      });

      return tx.user.create({
        data: {
          organizationId: organization.id,
          organizations: {
            connect: { id: organization.id },
          },
          fullName: fullName.trim(),
          email: normalizedEmail,
          passwordHash,
          role: "ORG_ADMIN",
        },
      });
    });

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Server authentication configuration error" }, { status: 500 });
    }

    const secretKey = new TextEncoder().encode(secret);
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secretKey);

    const response = NextResponse.json({
      message: "Registration successful",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        isTemporaryPassword: user.isTemporaryPassword,
        imageUrl: (user as any).imageUrl ?? null,
      },
    });

    // Set cookie for web application
    response.cookies.set({
      name: "eventpro_session",
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("Register API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
