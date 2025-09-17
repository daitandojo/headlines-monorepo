// packages/auth/src/verifySession.js (version 9.0.0 - Pure & Portable)
'use server'

import { getCookies } from './getCookies.js'
import * as jose from 'jose'
import { env } from '@headlines/config/server'
// REMOVED: import { headers } from 'next/headers'
// REMOVED: import { seedDevUser } from '@headlines/data-access/src/seed/dev-user.js'

const JWT_COOKIE_NAME = 'headlines-jwt'

// This function is now PURE. It ONLY verifies a token passed to it.
// It has no knowledge of Next.js headers or dev mode.
async function verifyToken(token) {
  if (!token) return { user: null, error: 'No token provided.' }
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    return { user: payload, error: null }
  } catch (e) {
    return { user: null, error: 'Invalid or expired session token.' }
  }
}

// This is the primary session verifier for the CLIENT APP.
export async function verifySession() {
  const cookieStore = await getCookies();
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value;
  return await verifyToken(token);
}

export async function getUserIdFromSession() {
  const { user } = await verifySession();
  return user ? user.userId : null;
}

// This is the primary session verifier for the ADMIN APP.
// It contains the Next.js-specific dev mode logic.
export async function verifyAdmin() {
    const { headers } = await import('next/headers');
    const headersList = headers();
    
    // DEVELOPMENT ONLY BYPASS FOR ADMIN APP
    if (process.env.NODE_ENV === 'development' && headersList.get('x-dev-mode') === 'true') {
      const { seedDevUser } = await import('@headlines/data-access/src/seed/dev-user.js');
      const devUser = {
        userId: '662f831abb28052123530a43',
        email: 'dev@headlines.dev',
        role: 'admin',
      };
      seedDevUser().catch(console.error); 
      return { isAdmin: true, user: devUser };
    }

    // Standard verification for production
    const { user, error } = await verifySession();
    if (error || user?.role !== 'admin') {
        return { isAdmin: false, error: error || 'Administrator access required.' };
    }
    return { isAdmin: true, user };
}
