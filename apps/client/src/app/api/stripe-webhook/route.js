// apps/client/src/app/api/stripe-webhook/route.js
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { env } from '@headlines/config/next'
import { updateSubscriber } from '@headlines/data-access/next'
import dbConnect from '@headlines/data-access/dbConnect/next'

const stripe = new Stripe(env.STRIPE_SECRET_KEY)
const webhookSecret = env.STRIPE_WEBHOOK_SECRET

export async function POST(req) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error(`❌ Error verifying Stripe webhook signature: ${err.message}`)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.userId

    if (!userId) {
      console.error('❌ CRITICAL: Stripe session completed without a userId in metadata.')
      return NextResponse.json(
        { error: 'Missing userId in session metadata' },
        { status: 400 }
      )
    }

    try {
      await dbConnect()

      const newExpiryDate = new Date()
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1)

      const updateData = {
        subscriptionTier: 'premium',
        stripeCustomerId: session.customer,
        subscriptionExpiresAt: newExpiryDate,
      }

      const result = await updateSubscriber(userId, updateData)

      if (!result.success) {
        throw new Error(`Failed to update subscriber ${userId}: ${result.error}`)
      }

      console.log(`✅ Successfully upgraded user ${userId} to premium.`)
    } catch (error) {
      console.error(`❌ Database update failed for user ${userId}:`, error)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
