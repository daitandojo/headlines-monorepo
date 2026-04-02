// apps/client/src/app/api/auth/2fa/setup/route.js
import { NextResponse } from "next/server";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { verifySession, verifyAdmin } from "@/lib/auth/server";
import { logger } from "@headlines/utils-shared";
import { authenticator } from "otplib";
import * as jose from "jose";

const JWT_COOKIE_NAME = "headlines-jwt";
const JWT_COOKIE_NAME_2FA = "headlines-2fa";

export async function POST(request) {
  try {
    await dbConnect();

    const { isAdmin, error: adminError } = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: adminError || "Admin access required" },
        { status: 403 },
      );
    }

    const { user } = await verifySession();
    const userId = user.userId;

    // Generate secret for TOTP
    const secret = authenticator.generateSecret();

    // Generate otpauth URL for QR code
    const otpauthUrl = authenticator.keyuri(user.email, "Headlines", secret);

    // Store temporarily pending verification
    const { Subscriber } = await import("@headlines/models");
    await Subscriber.findByIdAndUpdate(userId, {
      twoFactorSecret: secret,
    });

    logger.info(`2FA setup initiated for user: ${userId}`);

    return NextResponse.json({
      success: true,
      secret,
      otpauthUrl,
      message:
        "Scan the QR code with your authenticator app, then verify with a code",
    });
  } catch (error) {
    logger.error({ err: error }, "[API 2FA Setup Error]");
    return NextResponse.json(
      { error: "Failed to set up 2FA" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    await dbConnect();

    const { isAdmin, error: adminError } = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: adminError || "Admin access required" },
        { status: 403 },
      );
    }

    const { user } = await verifySession();
    const userId = user.userId;

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Verification code required" },
        { status: 400 },
      );
    }

    const { Subscriber } = await import("@headlines/models");
    const userDoc = await Subscriber.findById(userId).lean();

    if (!userDoc || !userDoc.twoFactorSecret) {
      return NextResponse.json(
        { error: "No 2FA setup in progress" },
        { status: 400 },
      );
    }

    // Verify the code using otplib
    const isValid = authenticator.verify({
      token: code,
      secret: userDoc.twoFactorSecret,
    });

    if (isValid) {
      // Enable 2FA for user (secret already stored)
      await Subscriber.findByIdAndUpdate(userId, {
        twoFactorEnabled: true,
      });

      logger.info(`2FA enabled for user: ${userId}`);

      return NextResponse.json({
        success: true,
        message: "Two-factor authentication has been enabled.",
      });
    }

    return NextResponse.json(
      { error: "Invalid verification code. Please try again." },
      { status: 400 },
    );
  } catch (error) {
    logger.error({ err: error }, "[API 2FA Verify Error]");
    return NextResponse.json(
      { error: "Failed to verify 2FA code" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    await dbConnect();

    const { isAdmin, error: adminError } = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: adminError || "Admin access required" },
        { status: 403 },
      );
    }

    const { user } = await verifySession();
    const userId = user.userId;

    const { Subscriber } = await import("@headlines/models");
    await Subscriber.findByIdAndUpdate(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });

    logger.info(`2FA disabled for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication has been disabled.",
    });
  } catch (error) {
    logger.error({ err: error }, "[API 2FA Disable Error]");
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 },
    );
  }
}
