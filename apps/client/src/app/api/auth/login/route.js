// apps/client/src/app/api/auth/login/route.js
import { NextResponse } from "next/server";
import { loginUser } from "@headlines/data-access/next";
import * as jose from "jose";
import { env } from "@headlines/config/next";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { loginSchema } from "@headlines/models/schemas";
import { sendErrorAlert } from "@headlines/utils-server/next";
import { logger } from "@headlines/utils-shared";
import { randomBytes } from "crypto";

const JWT_COOKIE_NAME = "headlines-jwt";
const REFRESH_COOKIE_NAME = "headlines-refresh";
const JWT_EXPIRY = "24h";
const REFRESH_EXPIRY_DAYS = 7;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

// Simple in-memory rate limiter (for production, use Redis)
const loginAttempts = new Map();

function checkRateLimit(email, ip) {
  const key = `${email}:${ip}`;
  const now = Date.now();
  const attempts = loginAttempts.get(key) || [];

  // Filter out attempts older than 15 minutes
  const recentAttempts = attempts.filter((t) => now - t < 15 * 60 * 1000);

  if (recentAttempts.length >= MAX_LOGIN_ATTEMPTS) {
    const oldestAttempt = recentAttempts[0];
    const retryAfter = Math.ceil(
      (15 * 60 * 1000 - (now - oldestAttempt)) / 1000,
    );
    return { blocked: true, retryAfter };
  }

  return { blocked: false };
}

function recordAttempt(email, ip) {
  const key = `${email}:${ip}`;
  const now = Date.now();
  const attempts = loginAttempts.get(key) || [];
  attempts.push(now);

  // Keep only last 15 minutes
  const recentAttempts = attempts.filter((t) => now - t < 15 * 60 * 1000);
  loginAttempts.set(key, recentAttempts);
}

function generateRefreshToken() {
  return randomBytes(32).toString("hex");
}

async function createTokens(user) {
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  // JWT (24 hours)
  const accessToken = await new jose.SignJWT({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);

  // Refresh token (7 days)
  const refreshToken = generateRefreshToken();
  const refreshTokenExpiresAt = new Date();
  refreshTokenExpiresAt.setDate(
    refreshTokenExpiresAt.getDate() + REFRESH_EXPIRY_DAYS,
  );

  return { accessToken, refreshToken, refreshTokenExpiresAt };
}

export async function POST(request) {
  const clientIp = request.headers.get("x-forwarded-for") || "unknown";

  try {
    await dbConnect();

    const body = await request.json();
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input.", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const { email } = validation.data;

    // Check rate limit
    const rateLimit = checkRateLimit(email, clientIp);
    if (rateLimit.blocked) {
      return NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": rateLimit.retryAfter.toString() },
        },
      );
    }

    logger.info(`Login attempt for user: ${email}`);
    const result = await loginUser({
      email,
      password: validation.data.password,
    });

    if (!result.success) {
      recordAttempt(email, clientIp);

      // Record failed attempt in database for persistent lockout
      try {
        const { Subscriber } = await import("@headlines/models");
        const userDoc = await Subscriber.findOne({
          email: email.toLowerCase(),
        }).lean();

        if (userDoc) {
          const newAttempts = (userDoc.loginAttempts || 0) + 1;

          if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            const lockUntil = new Date();
            lockUntil.setMinutes(
              lockUntil.getMinutes() + LOCK_DURATION_MINUTES,
            );

            await Subscriber.findByIdAndUpdate(userDoc._id, {
              loginAttempts: newAttempts,
              lockUntil,
            });

            logger.warn(
              `Account locked for user ${email} after ${newAttempts} failed attempts`,
            );
          } else {
            await Subscriber.findByIdAndUpdate(userDoc._id, {
              loginAttempts: newAttempts,
            });
          }
        }
      } catch (dbError) {
        logger.error({ err: dbError }, "Failed to record login attempt");
      }

      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const user = result.user;

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const retryAfter = Math.ceil((user.lockUntil - new Date()) / 1000 / 60);
      return NextResponse.json(
        { error: `Account is locked. Try again in ${retryAfter} minutes.` },
        { status: 423 },
      );
    }

    // Create tokens
    const { accessToken, refreshToken, refreshTokenExpiresAt } =
      await createTokens(user);

    // Update user with refresh token and reset failed attempts
    const { Subscriber } = await import("@headlines/models");
    await Subscriber.findByIdAndUpdate(user._id, {
      refreshToken: refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt,
      loginAttempts: 0,
      lockUntil: null,
      lastLoginAt: new Date(),
    });

    const response = NextResponse.json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled || false,
      },
      requires2FA: user.twoFactorEnabled || false,
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
    sendErrorAlert(error, { origin: "LOGIN_API_ROUTE" });
    logger.error({ err: error }, "[API Login Route Error]");
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 },
    );
  }
}
