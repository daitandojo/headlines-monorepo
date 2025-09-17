// packages/auth/src/authMiddleware.js (version 10.0.0 - Edge Safe & Dependency-Free)
'use server'

import { NextResponse } from 'next/server'
import * as jose from 'jose'

// This middleware is now self-contained. It does not import from @headlines/config.
// It reads environment variables directly, which is safe in the Edge runtime.

const JWT_COOKIE_NAME = 'headlines-jwt'

async function verifyTokenInMiddleware(token) {
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return { success: false };
  try {
    const secretKey = new TextEncoder().encode(secret);
    await jose.jwtVerify(token, secretKey);
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function authMiddleware(request, config) {
  const { pathname } = request.nextUrl;

  // Public paths are always allowed.
  if (config.publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  
  const token = request.cookies.get(JWT_COOKIE_NAME)?.value;
  const { success: isAuthenticated } = await verifyTokenInMiddleware(token);

  if (!isAuthenticated) {
    // For API routes, return a JSON error.
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // For pages, redirect to login.
    const loginUrl = new URL(config.loginPath, request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated, allow the request to proceed.
  return NextResponse.next();
}
