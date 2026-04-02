// apps/client/src/app/api/auth/verify-2fa/route.js
import { NextResponse } from "next/server";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { logger } from "@headlines/utils-shared";
import { authenticator } from "otplib";
import * as jose from "jose";
import { randomBytes } from "crypto";

const JWT_COOKIE_NAME = "headlines-jwt";
const REFRESH_COOKIE_NAME = "headlines-refresh";
const JWT_EXPIRY = "24h";
const REFRESH_EXPIRY_DAYS = 7;

function generateRefreshToken() {
  return randomBytes(32).toString("hex");
}

async function createTokens(user) {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

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

    const body = await request.json();
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json(
        { error: "User ID and verification code required" },
        { status: 400 },
      );
    }

    const { Subscriber } = await import("@headlines/models");
    const user = await Subscriber.findById(userId).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA is not enabled for this user" },
        { status: 400 },
      );
    }

    // Verify the TOTP code
    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 },
      );
    }

    // Create tokens after successful 2FA
    const { accessToken, refreshToken, refreshTokenExpiresAt } =
      await createTokens(user);

    // Update user with refresh token and reset login attempts
    await Subscriber.findByIdAndUpdate(user._id, {
      refreshToken: refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt,
      loginAttempts: 0,
      lockUntil: null,
      lastLoginAt: new Date(),
    });

    logger.info(`2FA verified for user: ${user.email}`);

    const response = NextResponse.json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        email: user.email,
        role: user.role,
        twoFactorEnabled: true,
      },
    });

    // Set access token (24 hours)
    response.cookies.set({
      name: JWT_COOKIE_NAME,
      value: accessToken,
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    // Set refresh token (7 days)
    response.cookies.set({
      name: REFRESH_COOKIE_NAME,
      value: refreshToken,
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * REFRESH_EXPIRY_DAYS,
    });

    return response;
  } catch (error) {
    logger.error({ err: error }, "[API 2FA Verify Error]");
    return NextResponse.json(
      { error: "Failed to verify 2FA code" },
      { status: 500 },
    );
  }
}
