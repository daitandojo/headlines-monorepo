import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// apps/admin/src/app/api/scrape/test-config/route.js (version 2.0.1)
import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { Source } from '@headlines/models'
import { initializeSharedLogic } from '@/lib/init-shared-logic'
import {
  testHeadlineExtraction,
  scrapeArticleContentForTest,
} from '@headlines/scraper-logic/src/scraper/index.js'
import { verifyAdmin } from '@headlines/auth'

export async function POST(request) {
  await initializeSharedLogic();
  const { isAdmin, error: authError } = await verifyAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: authError }, { status: 401 })
  }

  let sourceId
  try {
    initializeSharedLogic()
    const sourceConfig = await request.json()
    sourceId = sourceConfig._id

    if (!sourceConfig || !sourceConfig.sectionUrl || !sourceId) {
      return NextResponse.json(
        { error: 'Full source configuration with _id is required.' },
        { status: 400 }
      )
    }

    const headlines = await testHeadlineExtraction(sourceConfig)
    const success = headlines.length > 0
    let firstArticleContent = ''

    if (success) {
      firstArticleContent = await scrapeArticleContentForTest(
        headlines[0].link,
        sourceConfig.articleSelector
      )
    }

    const updatedSource = await Source.findByIdAndUpdate(
      sourceId,
      {
        $set: {
          lastScrapedAt: new Date(),
          lastSuccessAt: success ? new Date() : undefined,
          'analytics.lastRunHeadlineCount': headlines.length,
          'analytics.lastRunRelevantCount': 0,
        },
        $inc: {
          'analytics.totalRuns': 1,
          'analytics.totalSuccesses': success ? 1 : 0,
          'analytics.totalFailures': success ? 0 : 1,
        },
      },
      { new: true }
    ).lean()

    const sanitizedSource = JSON.parse(JSON.stringify(updatedSource))

    return NextResponse.json({
      success: true,
      count: headlines.length,
      headlines: headlines.slice(0, 5),
      firstArticleContent,
      updatedSource: sanitizedSource,
    })
  } catch (error) {
    console.error(`[API Test Config Error for ${sourceId}]`, error)
    if (mongoose.Types.ObjectId.isValid(sourceId)) {
      await Source.findByIdAndUpdate(sourceId, {
        $set: { lastScrapedAt: new Date() },
        $inc: { 'analytics.totalRuns': 1, 'analytics.totalFailures': 1 },
      })
    }
    return NextResponse.json(
      { success: false, error: 'Failed to perform test scrape.', details: error.message },
      { status: 500 }
    )
  }
}
