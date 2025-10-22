// apps/client/src/lib/api-handler.js
import { NextResponse } from 'next/server'
import { verifySession, verifyAdmin } from '@/lib/auth/server'
import dbConnect from '@headlines/data-access/dbConnect/next'
import { sendErrorAlert } from '@headlines/utils-server/next'

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

      // --- START OF MODIFICATION ---
      // Enforce trial expiration for non-admin users.
      if (
        user.role !== 'admin' &&
        user.subscriptionTier === 'trial' &&
        user.subscriptionExpiresAt &&
        new Date(user.subscriptionExpiresAt) < new Date()
      ) {
        return NextResponse.json(
          { error: 'Your 30-day trial has expired. Please upgrade to continue access.' },
          { status: 403 } // 403 Forbidden is the correct status code for this.
        )
      }
      // --- END OF MODIFICATION ---

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
