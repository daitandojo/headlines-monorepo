// apps/admin/src/app/api/suggestions/route.jsx (version 1.0.1)
import { NextResponse } from 'next/server'
import {
  processWatchlistSuggestion,
  processSourceSuggestion,
} from '@headlines/data-access'
import mongoose from 'mongoose'
import { verifyAdmin } from '@headlines/auth'
import { initializeSharedLogic } from '@/lib/init-shared-logic.js'

export async function POST(request) {
  await initializeSharedLogic()
  const { isAdmin, error } = await verifyAdmin()
  if (!isAdmin) return NextResponse.json({ error }, { status: 401 })

  const { suggestionId, suggestionType, action } = await request.json()
  if (
    !suggestionId ||
    !suggestionType ||
    !action ||
    !mongoose.Types.ObjectId.isValid(suggestionId)
  ) {
    return NextResponse.json({ error: 'Invalid parameters.' }, { status: 400 })
  }

  let result
  if (suggestionType === 'watchlist') {
    result = await processWatchlistSuggestion({ suggestionId, action })
  } else if (suggestionType === 'source') {
    result = await processSourceSuggestion({ suggestionId, action })
  } else {
    return NextResponse.json({ error: 'Invalid suggestion type.' }, { status: 400 })
  }

  if (!result.success) {
    const status = result.error.includes('not found') ? 404 : 500
    return NextResponse.json(
      { error: 'Failed to process suggestion.', details: result.error },
      { status }
    )
  }
  return NextResponse.json({ success: true, message: result.message })
}
