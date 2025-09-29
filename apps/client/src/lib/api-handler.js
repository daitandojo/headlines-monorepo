import { NextResponse } from 'next/server'
import { verifySession, verifyAdmin } from '@/lib/auth/server'
import dbConnect from '@headlines/data-access/dbConnect/next'

/**
 * A higher-order function for ADMIN API routes.
 * It handles DB connection, admin verification, and error handling in the correct order.
 */
export function createApiHandler(handler) {
  return async (request, context) => {
    try {
      // 1. Establish database connection FIRST. This resolves the race condition.
      await dbConnect()

      // 2. Verify user is an admin.
      const { isAdmin, user, error: authError } = await verifyAdmin()
      if (!isAdmin) {
        return NextResponse.json({ error: authError }, { status: 401 })
      }

      // 3. Execute the specific route logic, passing the verified user.
      return await handler(request, { ...context, user })
    } catch (error) {
      console.error(`[Admin API Handler Error] in ${request.nextUrl.pathname}:`, error)
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

/**
 * A simpler handler for CLIENT-FACING API routes.
 * It handles DB connection and standard user session verification.
 */
export function createClientApiHandler(handler) {
  return async (request, context) => {
    try {
      await dbConnect()

      const { user, error: authError } = await verifySession()
      if (!user) {
        return NextResponse.json(
          { error: authError || 'Authentication required' },
          { status: 401 }
        )
      }

      return await handler(request, { ...context, user })
    } catch (error) {
      console.error(`[Client API Handler Error] in ${request.nextUrl.pathname}:`, error)
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
