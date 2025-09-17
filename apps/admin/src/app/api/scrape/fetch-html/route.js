// apps/admin/src/app/api/scrape/fetch-html/route.js (version 1.0)
import { NextResponse } from 'next/server';
import { verifyAdmin } from '@headlines/auth/src/index.js';
import { fetchPageWithPlaywright } from '@headlines/scraper-logic/src/browser.js';
import { initializeSharedLogic } from '@/lib/init-shared-logic.js';

export async function POST(request) {
  await initializeSharedLogic();
  const { isAdmin, error: authError } = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: authError }, { status: 401 });
  }

  await initializeSharedLogic();

  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required.' }, { status: 400 });
    }

    const html = await fetchPageWithPlaywright(url, 'FetchHtmlEndpoint');
    if (!html) {
      throw new Error('Failed to fetch page content.');
    }

    return NextResponse.json({ success: true, url, htmlContent: html });

  } catch (e) {
    console.error('[API fetch-html Error]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
