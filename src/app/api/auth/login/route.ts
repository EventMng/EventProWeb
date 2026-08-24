import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { SignJWT } from "jose";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

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
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        isTemporaryPassword: user.isTemporaryPassword,
        imageUrl: user.imageUrl,
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
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
