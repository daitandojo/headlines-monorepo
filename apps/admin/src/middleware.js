import { NextResponse } from 'next/server'
export function middleware(request) {
  const requestHeaders = new Headers(request.headers)
  if (process.env.NODE_ENV === 'development') {
    requestHeaders.set('x-dev-mode', 'true')
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
