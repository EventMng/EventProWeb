import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Look up token record
    const resetRecord = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "Invalid or expired password reset link." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > resetRecord.expiresAt) {
      // Clean up expired token
      await db.passwordResetToken.delete({
        where: { id: resetRecord.id },
      }).catch(() => {});

      return NextResponse.json(
        { error: "This password reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update user's password and remove temporary password flag if any
    const updatedUser = await db.user.updateMany({
      where: { email: resetRecord.email },
      data: {
        passwordHash,
        isTemporaryPassword: false,
      },
    });

    if (updatedUser.count === 0) {
      return NextResponse.json(
        { error: "Account could not be found." },
        { status: 404 }
      );
    }

    // Invalidate the token so it cannot be used again
    await db.passwordResetToken.delete({
      where: { id: resetRecord.id },
    }).catch(() => {});

    return NextResponse.json({
      message: "Password has been successfully reset. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password. Please try again later." },
      { status: 500 }
    );
  }
}
