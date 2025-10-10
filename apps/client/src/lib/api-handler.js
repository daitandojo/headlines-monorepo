// apps/client/src/lib/api-handler.js
import { NextResponse } from 'next/server'
import { verifySession, verifyAdmin } from '@/lib/auth/server'
import dbConnect from '@headlines/data-access/dbConnect/next'
import { sendErrorAlert } from '@headlines/utils-server/next'

/**
 * Creates a robust API handler for Next.js API routes.
 * It manages database connection, authentication/authorization, and centralized error handling.
 * @param {Function} handler The core API logic function.
 * @param {object} [options={ requireAdmin: false }] Configuration options.
 * @param {boolean} [options.requireAdmin=false] If true, requires the user to have an 'admin' role.
 * @returns {Function} An async function compatible with Next.js API routes.
 */
export function createApiHandler(handler, options = { requireAdmin: false }) {
  return async (request, context) => {
    let userPayload = null
    try {
      await dbConnect()

      const { user, error: authError } = options.requireAdmin
        ? await verifyAdmin()
        : await verifySession()

      if (!user) {
        return NextResponse.json(
          { error: authError || 'Authentication required' },
          { status: 401 }
        )
      }
      userPayload = user

      return await handler(request, { ...context, user })
    } catch (error) {
      const errorContext = {
        origin: options.requireAdmin ? 'ADMIN_API_HANDLER' : 'CLIENT_API_HANDLER',
        request: {
          url: request.nextUrl.pathname,
          method: request.method,
        },
        user: userPayload
          ? { userId: userPayload.userId, email: userPayload.email }
          : null,
      }
      sendErrorAlert(error, errorContext)

      return NextResponse.json(
        {
          error: 'An unexpected internal server error occurred.',
          details: error.message,
        },
        { status: 500 }
      )
    }
  }
}
