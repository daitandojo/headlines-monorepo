// apps/server/src/middleware/auth.js (version 1.0.0)
import { env } from '@headlines/config/node'
import * as jose from 'jose'
import { logger } from '@headlines/utils-shared'

// This middleware verifies a simple JWT sent from the Next.js admin panel
// to ensure only authorized users can trigger resource-intensive scrapes.
export async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header is missing or invalid.' })
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Token is missing.' })
  }

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)

    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Administrator access required.' })
    }

    // Attach user payload to the request for potential use in routes
    req.user = payload
    next()
  } catch (e) {
    logger.warn({ err: e }, 'Admin verification failed for scrape-test API.')
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}
