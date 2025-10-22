// apps/client/src/app/api-admin/scrape/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { cookies } from 'next/headers'
import { env } from '@headlines/config/next'
import { z } from 'zod' // IMPORT ZOD

const SERVER_API_URL = env.INTERNAL_SERVER_URL || 'http://localhost:3002'

// DEFINE A SCHEMA for input validation
const scrapeTestSchema = z.object({
  sourceId: z.string().min(1, { message: 'sourceId is required.' }),
  articleUrl: z.string().url({ message: 'A valid articleUrl is required.' }).optional(),
});

const handlePost = async (request) => {
  const token = cookies().get('headlines-jwt')?.value
  if (!token) {
    return NextResponse.json({ error: 'Authentication token not found.' }, { status: 401 })
  }

  // --- START OF MODIFICATION ---
  const body = await request.json();
  const validation = scrapeTestSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid input.', details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { sourceId, articleUrl } = validation.data;
  // --- END OF MODIFICATION ---

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

export const POST = createApiHandler(handlePost, { requireAdmin: true }) // Ensure admin protection
export const dynamic = 'force-dynamic'