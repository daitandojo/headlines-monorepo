// apps/client/src/app/api/opportunities/export/route.js
import { NextResponse } from "next/server";
import { createApiHandler } from "@/lib/api-handler";
import dbConnect from "@headlines/data-access/dbConnect/next";
import { getOpportunities } from "@headlines/data-access/next";
import { logger } from "@headlines/utils-shared";

const handleGet = async (request, { user }) => {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv";
  const q = searchParams.get("q") || "";
  const country = searchParams.get("country") || "";
  const favoritesOnly = searchParams.get("favorites") === "true";

  const filters = { q, country, favoritesOnly };

  const result = await getOpportunities({
    page: 1,
    filters,
    sort: "date_desc",
    userId: user.userId,
    limit: 1000, // Max export size
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const opportunities = result.data;

  // Convert to CSV
  const headers = [
    "id",
    "name",
    "role",
    "company",
    "estimated_net_worth",
    "country",
    "why_contact",
    "created_at",
  ];

  const csvRows = [headers.join(",")];

  for (const opp of opportunities) {
    const whyContact = Array.isArray(opp.whyContact)
      ? opp.whyContact.join("; ")
      : opp.whyContact || "";

    const row = [
      opp._id,
      `"${(opp.reachOutTo || "").replace(/"/g, '""')}"`,
      `"${(opp.contactDetails?.role || "").replace(/"/g, '""')}"`,
      `"${(opp.contactDetails?.company || "").replace(/"/g, '""')}"`,
      opp.profile?.estimatedNetWorthMM || opp.likelyMMDollarWealth || "",
      `"${(opp.basedIn || []).join("; ")}"`,
      `"${whyContact.replace(/"/g, '""')}"`,
      opp.createdAt ? new Date(opp.createdAt).toISOString() : "",
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
        itemType: "opportunity",
        itemId: null,
        metadata: { count: opportunities.length, format },
        timestamp: new Date(),
      },
    },
  });

  logger.info(
    `Exported ${opportunities.length} opportunities for user ${user.userId}`,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="headlines-opportunities-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
};

export const GET = createApiHandler(handleGet);
