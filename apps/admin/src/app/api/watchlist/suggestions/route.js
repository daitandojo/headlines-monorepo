import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// apps/admin/src/app/api/watchlist/suggestions/route.js (version 3.0.1)
import { NextResponse } from 'next/server'
import { getSuggestions } from '@headlines/data-access/src/index.js'
import { verifyAdmin } from '@headlines/auth/src/index.js'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  await initializeSharedLogic();

  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }
  
  const result = await getSuggestions()
  if (!result.success) {
    return NextResponse.json({ error: 'Failed to fetch suggestions.', details: result.error }, { status: 500 });
  }
  return NextResponse.json({ suggestions: result.data.watchlistSuggestions });
}
