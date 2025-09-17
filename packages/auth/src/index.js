// packages/auth/src/index.js (version 2.2.0)
'use server'

// This entrypoint now ONLY exports server-side utilities that are environment-agnostic.
// Client components and Next.js-specific middleware must be imported directly from their source files.

import { verifySession, verifyAdmin, getUserIdFromSession } from './verifySession.js'

export { verifySession, verifyAdmin, getUserIdFromSession }
