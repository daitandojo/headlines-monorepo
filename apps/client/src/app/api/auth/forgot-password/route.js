// apps/client/src/app/api/auth/forgot-password/route.js
import { NextResponse } from "next/server";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { logger } from "@headlines/utils-shared";
import { randomBytes } from "crypto";
import { sendGenericEmail } from "@headlines/utils-server/next";
import { env } from "@headlines/config/next";

const RESET_TOKEN_EXPIRY_HOURS = 1;

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user by email (case insensitive)
    const { Subscriber } = await import("@headlines/models");
    const user = await Subscriber.findOne({
      email: email.toLowerCase(),
    }).lean();

    // Always return success to prevent email enumeration
    // But actually send email if user exists

    if (user) {
      // Generate reset token
      const resetToken = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

      // Store token in database
      await Subscriber.findByIdAndUpdate(user._id, {
        passwordReset: {
          token: resetToken,
          expiresAt: expiresAt,
        },
      });

      // Send reset email
      const resetUrl = `https://headlines-client.vercel.app/reset-password?token=${resetToken}`;

      await sendGenericEmail({
        to: user.email,
        subject: "Reset your Headlines password",
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a;">Reset Your Password</h2>
            <p style="color: #4a4a4a; line-height: 1.6;">
              We received a request to reset your Headlines password. Click the button below to create a new password:
            </p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #888; font-size: 14px;">
              This link will expire in ${RESET_TOKEN_EXPIRY_HOURS} hour${RESET_TOKEN_EXPIRY_HOURS > 1 ? "s" : ""}.<br/>
              If you didn't request this, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;"/>
            <p style="color: #aaa; font-size: 12px;">
              Headlines Intelligence<br/>
              AI-Powered Wealth Event Discovery
            </p>
          </body>
          </html>
        `,
        emailType: "PasswordReset",
      });

      logger.info(`Password reset email sent to: ${user.email}`);
    } else {
      logger.info(`Password reset requested for non-existent email: ${email}`);
    }

    // Always return success
    return NextResponse.json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    logger.error({ err: error }, "[API Forgot Password Error]");
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
