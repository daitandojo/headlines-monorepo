// apps/admin/src/lib/api-handler.js (NEW FILE)
import { NextResponse } from 'next/server'
import { initializeSharedLogic } from './init-shared-logic'
import { verifyAdmin } from '@headlines/auth'
import mongoose from 'mongoose'

/**
 * A higher-order function to wrap API route handlers.
 * It provides a consistent structure for initialization, authentication, and error handling.
 * @param {function} handler - The core API logic function. It receives the request and any params.
 * @returns {function} An API route handler function.
 */
export function createApiHandler(handler) {
  return async (request, context) => {
    try {
      await initializeSharedLogic()

      const { isAdmin, user, error: authError } = await verifyAdmin()
      if (!isAdmin) {
        return NextResponse.json({ error: authError }, { status: 401 })
      }

      // The handler receives the request, context (for params), and the verified user payload.
      return await handler(request, { ...context, user })
    } catch (error) {
      console.error(`[API Handler Error] Caught in ${request.nextUrl.pathname}:`, error)

      if (
        error instanceof mongoose.Error.ValidationError ||
        error instanceof mongoose.Error.CastError
      ) {
        return NextResponse.json(
          { error: 'Invalid input data.', details: error.message },
          { status: 400 }
        )
      }

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
