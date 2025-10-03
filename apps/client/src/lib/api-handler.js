// apps/client/src/lib/api-handler.js
import { NextResponse } from 'next/server'
import { verifySession, verifyAdmin } from '@/lib/auth/server'
import dbConnect from '@headlines/data-access/dbConnect/next'
import { sendErrorAlert } from '@headlines/utils-server/next'

export function createApiHandler(handler) {
  return async (request, context) => {
    try {
      await dbConnect()
      const { isAdmin, user, error: authError } = await verifyAdmin()
      if (!isAdmin) {
        return NextResponse.json({ error: authError }, { status: 401 })
      }
      return await handler(request, { ...context, user })
    } catch (error) {
      const errorContext = {
        origin: 'ADMIN_API_HANDLER',
        request: {
          url: request.nextUrl.pathname,
          method: request.method,
        },
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

export function createClientApiHandler(handler) {
  return async (request, context) => {
    let userPayload = null
    try {
      await dbConnect()
      const { user, error: authError } = await verifySession()
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
        origin: 'CLIENT_API_HANDLER',
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
