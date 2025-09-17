import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// apps/admin/src/app/api/events/[eventId]/route.js (version 1.0.0)
import { NextResponse } from 'next/server';
import { getAdminEventDetails } from '@headlines/data-access/src/index.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  await initializeSharedLogic();
    const { eventId } = params;
    const result = await getAdminEventDetails(eventId);
    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.error.includes('not found') ? 404 : 500 });
    }
    return NextResponse.json(result.data);
}
