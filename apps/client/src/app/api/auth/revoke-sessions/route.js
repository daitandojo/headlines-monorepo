// apps/client/src/app/api/auth/revoke-sessions/route.js
import { NextResponse } from "next/server";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { verifySession } from "@/lib/auth/server";
import { logger } from "@headlines/utils-shared";

export async function POST() {
  try {
    const { user, error } = await verifySession();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Invalidate all refresh tokens for this user
    const { Subscriber } = await import("@headlines/models");
    await Subscriber.findByIdAndUpdate(user.userId, {
      refreshToken: null,
      refreshTokenExpiresAt: null,
      loginAttempts: 0,
      lockUntil: null,
    });

    logger.info(`All sessions revoked for user: ${user.userId}`);

    return NextResponse.json({
      success: true,
      message: "All sessions have been revoked. You will need to log in again.",
    });
  } catch (error) {
    logger.error({ err: error }, "[API Revoke Sessions Error]");
    return NextResponse.json(
      { error: "Failed to revoke sessions" },
      { status: 500 },
    );
  }
}
