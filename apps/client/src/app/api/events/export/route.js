// apps/client/src/app/api/events/export/route.js
import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { getEvents } from "@headlines/data-access/next";
import { logger } from "@headlines/utils-shared";

const handleGet = async (request, { user }) => {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv";
  const q = searchParams.get("q") || "";
  const country = searchParams.get("country") || "";
  const favoritesOnly = searchParams.get("favorites") === "true";

  const filters = { q, country, favoritesOnly };

  const result = await getEvents({
    page: 1,
    filters,
    sort: "date_desc",
    userId: user.userId,
    limit: 1000, // Max export size
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const events = result.data;

  // Convert to CSV
  const headers = [
    "id",
    "headline",
    "summary",
    "country",
    "relevance_score",
    "created_at",
    "source_articles",
  ];

  const csvRows = [headers.join(",")];

  for (const event of events) {
    const row = [
      event._id,
      `"${(event.synthesized_headline || "").replace(/"/g, '""')}"`,
      `"${(event.synthesized_summary || "").replace(/"/g, '""')}"`,
      `"${(event.country || []).join("; ")}"`,
      event.highest_relevance_score || 0,
      event.createdAt ? new Date(event.createdAt).toISOString() : "",
      `"${(event.source_articles || []).map((a) => a.headline).join("; ")}"`,
    ];
    csvRows.push(row.join(","));
  }

  const csv = csvRows.join("\n");

  // Log export activity
  const { Subscriber } = await import("@headlines/models");
  await Subscriber.findByIdAndUpdate(user.userId, {
    $push: {
      activityLog: {
        action: "export",
        itemType: "event",
        itemId: null,
        metadata: { count: events.length, format },
        timestamp: new Date(),
      },
    },
  });

  logger.info(`Exported ${events.length} events for user ${user.userId}`);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="headlines-events-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
};

export const GET = createApiHandler(handleGet);
