// apps/client/src/app/api/auth/refresh/route.js
import { NextResponse } from "next/server";
import * as jose from "jose";
import { env } from "@headlines/config/next";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { logger } from "@headlines/utils-shared";
import { randomBytes } from "crypto";

const JWT_COOKIE_NAME = "headlines-jwt";
const REFRESH_COOKIE_NAME = "headlines-refresh";
const JWT_EXPIRY = "24h";
const REFRESH_EXPIRY_DAYS = 7;

function generateRefreshToken() {
  return randomBytes(32).toString("hex");
}

async function createTokens(user) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  const accessToken = await new jose.SignJWT({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);

  const refreshToken = generateRefreshToken();
  const refreshTokenExpiresAt = new Date();
  refreshTokenExpiresAt.setDate(
    refreshTokenExpiresAt.getDate() + REFRESH_EXPIRY_DAYS,
  );

  return { accessToken, refreshToken, refreshTokenExpiresAt };
}

export async function POST(request) {
  try {
    await dbConnect();

    const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token provided" },
        { status: 401 },
      );
    }

    // Find user with this refresh token
    const { Subscriber } = await import("@headlines/models");
    const user = await Subscriber.findOne({
      refreshToken: refreshToken,
      refreshTokenExpiresAt: { $gt: new Date() },
    })
      .select("+refreshToken")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 },
      );
    }

    // Generate new tokens (rotation)
    const {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt,
    } = await createTokens(user);

    // Update user with new refresh token
    await Subscriber.findByIdAndUpdate(user._id, {
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt,
    });

    const response = NextResponse.json({
      success: true,
      expiresIn: 86400, // 24 hours in seconds
    });

    // Update cookies
    response.cookies.set({
      name: JWT_COOKIE_NAME,
      value: newAccessToken,
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    response.cookies.set({
      name: REFRESH_COOKIE_NAME,
      value: newRefreshToken,
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * REFRESH_EXPIRY_DAYS,
    });

    logger.info(`Token refresh successful for user: ${user.email}`);
    return response;
  } catch (error) {
    logger.error({ err: error }, "[API Refresh Token Error]");
    return NextResponse.json(
      { error: "Failed to refresh session" },
      { status: 500 },
    );
  }
}
