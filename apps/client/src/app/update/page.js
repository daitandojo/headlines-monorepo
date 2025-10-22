// apps/client/src/app/upgrade/page.js
'use client'

import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared'
import { useAuth } from '@/lib/auth/client'
import { Loader2, Crown } from 'lucide-react'
import { toast } from 'sonner'

export default function UpgradePage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleUpgrade = async () => {
    setIsLoading(true)
    toast.info('Redirecting to secure payment portal...')

    try {
      // This API route will create the Stripe Checkout Session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create payment session.')
      }

      const { url } = await response.json()
      // Redirect the user to Stripe's hosted checkout page
      window.location.href = url
    } catch (error) {
      toast.error('Could not initiate upgrade.', { description: error.message })
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md bg-slate-900/50 border-slate-700">
        <CardHeader className="text-center">
          <Crown className="w-12 h-12 mx-auto text-amber-400" />
          <CardTitle className="text-2xl mt-4">Upgrade Your Plan</CardTitle>
          <CardDescription>
            {user?.subscriptionTier === 'trial'
              ? 'Your 30-day trial has expired. Upgrade to continue receiving actionable intelligence.'
              : 'Unlock the full power of Headlines AI with our Premium plan.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 border rounded-lg bg-slate-800/50 border-slate-700">
            <h3 className="font-bold text-lg">Premium Annual</h3>
            <p className="text-3xl font-bold mt-2">
              $2,000 <span className="text-base font-normal text-slate-400">/ year</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300 list-disc list-inside">
              <li>Unlimited Event & Opportunity Access</li>
              <li>Daily & Weekly Email Briefings</li>
              <li>Full Access to AI Chat Assistant</li>
              <li>CRM Integration (vCard Export)</li>
            </ul>
          </div>
          <Button
            size="lg"
            className="w-full h-12 text-base"
            onClick={handleUpgrade}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Crown className="mr-2 h-4 w-4" />
            )}
            Upgrade to Premium
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
