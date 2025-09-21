// apps/client/src/app/api/upload/process-article/route.js (NEW FILE)
import { NextResponse } from 'next/server'
import { processUploadedArticle } from '@headlines/data-access'
import { verifySession } from '@headlines/auth'

export async function POST(request) {
  const { user, error } = await verifySession()
  if (!user) {
    return NextResponse.json(
      { error: error || 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const { item } = await request.json()
    if (!item || !item.headline || !item.article) {
      return NextResponse.json({ error: 'Invalid item structure.' }, { status: 400 })
    }

    const result = await processUploadedArticle(item, user.userId)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to process article', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
