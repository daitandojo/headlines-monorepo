// apps/admin/src/app/(protected)/sources/page.jsx (version 7.0.0)
'use client'

import { redirect } from 'next/navigation'

// This page is now a simple redirect to the new, canonical Scraper IDE page.
// This simplifies the navigation and makes the IDE the central hub for all source management.
export default function SourcesRedirectPage() {
  redirect('/scraper-ide')
}
