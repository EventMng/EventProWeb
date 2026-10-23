import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mailer";
import crypto from "crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If the user doesn't exist, we still return 200 OK so we don't leak user existence
    if (!user) {
      return NextResponse.json({
        message: "If that email is registered, a password reset link has been sent.",
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");

    // Expiry: 30 minutes from now
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Delete any existing reset tokens for this email to invalidate old ones
    await db.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    });

    // Save token in DB
    await db.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token,
        expiresAt,
      },
    });

    // Construct reset URL
    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || request.nextUrl.origin;
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send the email via existing nodemailer mailer
    await sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      resetUrl,
    });

    return NextResponse.json({
      message: "If that email is registered, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request. Please try again later." },
      { status: 500 }
    );
  }
}
