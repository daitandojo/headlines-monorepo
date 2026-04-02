// apps/client/src/app/api/auth/reset-password/route.js
import { NextResponse } from "next/server";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { logger } from "@headlines/utils-shared";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 },
      );
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Find user with valid reset token
    const { Subscriber } = await import("@headlines/models");
    const user = await Subscriber.findOne({
      "passwordReset.token": token,
      "passwordReset.expiresAt": { $gt: new Date() },
    }).lean();

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await Subscriber.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordReset: null,
      // Also invalidate any existing refresh tokens for security
      refreshToken: null,
      refreshTokenExpiresAt: null,
    });

    logger.info(`Password reset successful for user: ${user.email}`);

    return NextResponse.json({
      success: true,
      message:
        "Password has been reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    logger.error({ err: error }, "[API Reset Password Error]");
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 },
    );
  }
}

// Validate token endpoint
export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const { Subscriber } = await import("@headlines/models");
    const user = await Subscriber.findOne({
      "passwordReset.token": token,
      "passwordReset.expiresAt": { $gt: new Date() },
    }).lean();

    if (!user) {
      return NextResponse.json(
        { valid: false, error: "Invalid or expired token" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      valid: true,
      email: user.email,
    });
  } catch (error) {
    logger.error({ err: error }, "[API Validate Reset Token Error]");
    return NextResponse.json(
      { valid: false, error: "Failed to validate token" },
      { status: 500 },
    );
  }
}
