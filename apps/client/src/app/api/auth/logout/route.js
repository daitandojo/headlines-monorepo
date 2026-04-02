// apps/client/src/app/api/auth/logout/route.js
import { NextResponse } from "next/server";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { verifySession } from "@/lib/auth/server";
import { logger } from "@headlines/utils-shared";

const JWT_COOKIE_NAME = "headlines-jwt";
const REFRESH_COOKIE_NAME = "headlines-refresh";

export async function POST() {
  try {
    await dbConnect();

    // Verify session to get userId
    const { user } = await verifySession();

    if (user?.userId) {
      // Invalidate refresh token in database
      const { Subscriber } = await import("@headlines/models");
      await Subscriber.findByIdAndUpdate(user.userId, {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      });

      logger.info(`User logged out, refresh token invalidated: ${user.userId}`);
    }

    const response = NextResponse.json({ success: true });

    // Clear both cookies
    response.cookies.set({
      name: JWT_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set({
      name: REFRESH_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    logger.error({ err: error }, "[API Logout Error]");

    // Still clear cookies even on error
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: JWT_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set({
      name: REFRESH_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  }
}
