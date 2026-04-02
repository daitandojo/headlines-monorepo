// apps/client/src/app/api/user/notifications/route.js
import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { logger } from "@headlines/utils-shared";

const handlePatch = async (request, { user }) => {
  await dbConnect();

  const body = await request.json();
  const {
    emailEnabled,
    pushEnabled,
    frequency,
    minRelevance,
    countries,
    sectors,
  } = body;

  const { Subscriber } = await import("@headlines/models");

  const updateData = {};

  if (typeof emailEnabled === "boolean") {
    updateData.emailNotificationsEnabled = emailEnabled;
  }

  if (typeof pushEnabled === "boolean") {
    updateData.pushNotificationsEnabled = pushEnabled;
  }

  if (frequency) {
    updateData["profile.notificationFrequency"] = frequency;
  }

  if (minRelevance !== undefined) {
    // Store in a place we can query later - could add minRelevanceThreshold field
  }

  if (Array.isArray(countries)) {
    updateData.countries = countries.map((c) => ({ name: c, active: true }));
  }

  if (Array.isArray(sectors)) {
    updateData.sectors = sectors;
  }

  const result = await Subscriber.findByIdAndUpdate(
    user.userId,
    { $set: updateData },
    { new: true },
  ).lean();

  if (!result) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  logger.info(`Notification preferences updated for user ${user.userId}`);

  return NextResponse.json({
    emailEnabled: result.emailNotificationsEnabled,
    pushEnabled: result.pushNotificationsEnabled,
    frequency: result.profile?.notificationFrequency || "daily",
    countries: result.countries?.map((c) => c.name) || [],
    sectors: result.sectors || [],
  });
};

const handleGet = async (request, { user }) => {
  await dbConnect();

  const { Subscriber } = await import("@headlines/models");

  const userDoc = await Subscriber.findById(user.userId).lean();

  if (!userDoc) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    emailEnabled: userDoc.emailNotificationsEnabled,
    pushEnabled: userDoc.pushNotificationsEnabled,
    frequency: userDoc.profile?.notificationFrequency || "daily",
    countries: userDoc.countries?.map((c) => c.name) || [],
    sectors: userDoc.sectors || [],
  });
};

export const PATCH = createApiHandler(handlePatch);
export const GET = createApiHandler(handleGet);
