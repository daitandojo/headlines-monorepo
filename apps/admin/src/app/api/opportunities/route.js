import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// apps/admin/src/app/api/opportunities/route.js (version 1.0.0)
import { NextResponse } from 'next/server';
import { getAdminOpportunities, updateAdminOpportunity, deleteAdminOpportunity } from '@headlines/data-access';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  await initializeSharedLogic();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const sort = searchParams.get('sort') || 'date_desc';
    const q = searchParams.get('q') || '';
    const country = searchParams.get('country') || '';
    // DEFINITIVE FIX: Read the 'withEmail' filter from the search parameters.
    const withEmail = searchParams.get('withEmail') === 'true';

    const result = await getAdminOpportunities({ page, sort, filters: { q, country, withEmail } });
    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result);
}

export async function PATCH(request) {
  await initializeSharedLogic();
    const { oppId, updateData } = await request.json();
    const result = await updateAdminOpportunity(oppId, updateData);
     if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.error.includes('not found') ? 404 : 500 });
    }
    return NextResponse.json(result.data);
}

export async function DELETE(request) {
  await initializeSharedLogic();
    const { oppId } = await request.json();
    const result = await deleteAdminOpportunity(oppId);
    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.error.includes('not found') ? 404 : 500 });
    }
    return NextResponse.json({ success: true });
}
