'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This component performs a client-side redirect, avoiding the server-side
// NEXT_REDIRECT error that can be intercepted by browser security features.
export function ClientRedirect({ destination }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(destination)
  }, [router, destination])

  // Render nothing while the redirect is happening.
  return null
}
