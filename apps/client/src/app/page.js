// apps/client/src/app/page.js
'use server'

import { cookies } from 'next/headers'
import { verifySession } from '@/lib/auth/server'
import { ClientRedirect } from '@/components/client/shared/ClientRedirect'
import LandingPage from './(public)/page'

export default async function RootPage() {
  const cookieStore = cookies()
  const { user } = await verifySession(cookieStore)

  if (user) {
    // If user is logged in, immediately redirect them to the main app interface.
    return <ClientRedirect destination="/events" />
  }

  // If no user is logged in, show the new commercial landing page.
  return <LandingPage />
}
