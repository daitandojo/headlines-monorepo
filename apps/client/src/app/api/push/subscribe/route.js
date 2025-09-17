// src/app/api/push/subscribe/route.js (version 1.1)
import { cookies } from 'next/headers'
import * as jose from 'jose'
import { env } from '@/lib/env.mjs'
import dbConnect from '@/lib/mongodb'
import PushSubscription from '@/models/PushSubscription'

const JWT_COOKIE_NAME = 'headlines-jwt'

async function getUserIdFromToken() {
  const token = cookies().get(JWT_COOKIE_NAME)?.value
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    return payload.userId
  } catch (e) {
    return null
  }
}

export async function POST(req) {
  try {
    const userId = await getUserIdFromToken()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Authentication required.' }), {
        status: 401,
      })
    }

    await dbConnect()
    const subscription = await req.json()

    if (!subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ error: 'Invalid subscription object.' }), {
        status: 400,
      })
    }

    await PushSubscription.updateOne(
      { endpoint: subscription.endpoint },
      { $set: { ...subscription, subscriberId: userId } },
      { upsert: true }
    )

    return new Response(
      JSON.stringify({ success: true, message: 'Subscription saved.' }),
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error('Error saving push subscription:', error)
    return new Response(JSON.stringify({ error: 'Failed to save subscription.' }), {
      status: 500,
    })
  }
}
