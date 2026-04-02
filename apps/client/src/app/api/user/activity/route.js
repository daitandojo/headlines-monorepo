// apps/client/src/app/api/user/activity/route.js
import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { verifySession } from "@/lib/auth/server";
import { logger } from "@headlines/utils-shared";

const handleGet = async (request, { user }) => {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const actionFilter = searchParams.get("action");
  const skip = (page - 1) * limit;

  const { Subscriber } = await import("@headlines/models");

  const userDoc = await Subscriber.findById(user.userId).lean();

  if (!userDoc) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let activityLog = userDoc.activityLog || [];

  // Filter by action if specified
  if (actionFilter) {
    activityLog = activityLog.filter((entry) => entry.action === actionFilter);
  }

  // Sort by timestamp descending
  activityLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Paginate
  const total = activityLog.length;
  const paginatedActivity = activityLog.slice(skip, skip + limit);

  return NextResponse.json({
    data: paginatedActivity,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

// Log an activity
export async function POST(request) {
  try {
    const { user, error } = await verifySession();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { action, itemType, itemId, metadata = {} } = body;

    if (!action || !itemType || !itemId) {
      return NextResponse.json(
        { error: "action, itemType, and itemId are required" },
        { status: 400 },
      );
    }

    const { Subscriber } = await import("@headlines/models");

    await Subscriber.findByIdAndUpdate(user.userId, {
      $push: {
        activityLog: {
          action,
          itemType,
          itemId,
          metadata,
          timestamp: new Date(),
        },
      },
    });

    // Keep only last 100 entries
    await Subscriber.findByIdAndUpdate(user.userId, {
      $push: {
        activityLog: {
          $each: [],
          $slice: -100,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "[API Activity Log Error]");
    return NextResponse.json(
      { error: "Failed to log activity" },
      { status: 500 },
    );
  }
}

export const GET = createApiHandler(handleGet);
