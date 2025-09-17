import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
// apps/admin/src/app/api/scrape/test-recipe/route.js (version 2.2.0 - Dual Mode)
import { NextResponse } from 'next/server'
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

  try {
    initializeSharedLogic()
    const { sourceConfig, articleUrl } = await request.json()

    // Mode 1: Test a single article's content
    if (articleUrl && sourceConfig.articleSelector) {
      const content = await scrapeArticleContentForTest(articleUrl, sourceConfig.articleSelector);
      return NextResponse.json({
        success: true,
        content: { preview: content, sourceUrl: articleUrl }
      });
    }

    // Mode 2: Test the full source recipe
    if (sourceConfig && sourceConfig.sectionUrl) {
      const headlines = await testHeadlineExtraction(sourceConfig);
      let firstArticleContent = '';
      if (headlines.length > 0 && sourceConfig.articleSelector) {
          firstArticleContent = await scrapeArticleContentForTest(headlines[0].link, sourceConfig.articleSelector);
      }
      return NextResponse.json({
          success: true,
          headlines: {
              count: headlines.length,
              samples: headlines.slice(0, 10),
          },
          content: {
              preview: firstArticleContent,
              sourceUrl: headlines.length > 0 ? headlines[0].link : null,
          }
      });
    }

    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });

  } catch (error) {
    console.error('[API Test Recipe Error]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to perform test scrape.', details: error.message },
      { status: 500 }
    )
  }
}
