// apps/client/src/app/api-admin/scrape/route.js (version 2.0.0)
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { cookies } from 'next/headers'
import { env } from '@headlines/config/next'

const SERVER_API_URL = env.INTERNAL_SERVER_URL || 'http://localhost:3002'

// This Next.js API route now acts as a secure proxy.
// It authenticates the admin user, grabs their JWT, and forwards the
// request to the dedicated Node.js server that can run Playwright.
const handlePost = async (request) => {
  const { sourceId, articleUrl } = await request.json()
  const token = cookies().get('headlines-jwt')?.value

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication token not found.' },
      { status: 401 }
    )
  }

  try {
    const response = await fetch(`${SERVER_API_URL}/api/scrape-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sourceId, articleUrl }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || `Scraper server returned status ${response.status}`)
    }

    // The original logic in `performScrape` from `scraper-ide/page.jsx` expects
    // a specific structure, so we re-map the response to match it.
    if (result.content) {
      return NextResponse.json({ success: true, content: result.content.preview })
    } else if (result.headlines) {
      return NextResponse.json({
        success: true,
        articles: result.headlines.samples,
        resultCount: result.headlines.count,
      })
    }

    throw new Error('Unexpected response format from scraper server.')
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export const POST = createApiHandler(handlePost)
export const dynamic = 'force-dynamic'
