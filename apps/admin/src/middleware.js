// apps/admin/src/middleware.js (version 2.1.0)
import { NextResponse } from 'next/server'

// This minimal middleware's only job is to inject the 'x-dev-mode' header
// into API requests during development. This allows the API routes' `verifySession`
// check to be bypassed, enabling a seamless developer experience.
export function middleware(request) {
  const requestHeaders = new Headers(request.headers)
  if (process.env.NODE_ENV === 'development') {
    requestHeaders.set('x-dev-mode', 'true')
  }
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * This ensures the dev-mode header is applied to pages and Server Actions, not just API routes.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
