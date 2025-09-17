// apps/admin/src/app/api/events/route.js (version 2.0.0 - Correct Param Handling)
import { NextResponse } from 'next/server';
import { getAdminEvents, updateAdminEvent, deleteAdminEvent } from '@headlines/data-access/src/index.js';
import { initializeSharedLogic } from '@/lib/init-shared-logic.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  await initializeSharedLogic();
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const sort = searchParams.get('sort') || 'createdAt_desc';
    
    // Convert columnFilters from JSON string back to an object for the data layer
    const columnFilters = JSON.parse(searchParams.get('columnFilters') || '[]');
    const filters = columnFilters.reduce((acc, filter) => {
        if (filter.value) {
           const key = filter.id === 'synthesized_headline' ? 'q' : filter.id;
           acc[key] = filter.value;
        }
        return acc;
    }, {});
    
    const result = await getAdminEvents({ page, sort, filters });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  await initializeSharedLogic();
  const { eventId, updateData } = await request.json();
  const result = await updateAdminEvent(eventId, updateData);
   if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error.includes('not found') ? 404 : 500 });
  }
  return NextResponse.json(result.data);
}

export async function DELETE(request) {
  await initializeSharedLogic();
  const { eventId } = await request.json();
  const result = await deleteAdminEvent(eventId);
  if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.error.includes('not found') ? 404 : 500 });
  }
  return NextResponse.json({ success: true });
}
