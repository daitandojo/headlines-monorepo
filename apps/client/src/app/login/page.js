// src/app/login/page.js (version 6.1)
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { KeyRound, Shield, Sparkles, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { LoadingOverlay } from '@/components/LoadingOverlay'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { user, login, isLoading } = useAuth()
  const [isError, setIsError] = useState(false) // This can be used for UI feedback if login hook provides error state
  const router = useRouter()

  useEffect(() => {
    if (user) {
      console.log('[Login Page] User is already authenticated. Redirecting to /events.')
      router.push('/events')
    }
  }, [user, router])

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsError(false)
    // The login function from useAuth now handles the API call, loading state, and error toasts.
    await login(email, password)
  }

  if (user) {
    return <LoadingOverlay isLoading={true} text="Redirecting..." />
  }

  return (
    <div>
      <LoadingOverlay isLoading={isLoading} text="Authorizing..." />
      <Card
        className={cn(
          'w-full max-w-lg relative z-10',
          'bg-gradient-to-br from-slate-900/40 via-slate-800/40 to-slate-900/40',
          'backdrop-blur-xl border border-white/20',
          'shadow-2xl shadow-black/50 rounded-3xl',
          'transform transition-all duration-700 ease-out',
          'opacity-0 animate-fade-in-up',
          isError ? 'animate-shake' : ''
        )}
        onAnimationEnd={() => setIsError(false)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-3xl pointer-events-none"></div>

        <CardHeader className="items-center text-center pt-12 pb-8 px-8 relative">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 via-purple-400/30 to-blue-400/30 rounded-full blur-lg opacity-75 animate-pulse"></div>
            <div className="relative flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-800/90 to-gray-900/90 border border-white/20 rounded-full backdrop-blur-sm">
              <Shield className="h-8 w-8 text-white drop-shadow-lg" />
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-cyan-300 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-100 drop-shadow-lg">
              Secure Access Portal
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide">
              Authentication Required
            </p>
          </div>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="px-8 pb-6 space-y-6">
            <div className="space-y-3">
              <Label
                htmlFor="email"
                className="text-slate-300 text-sm font-semibold tracking-wide flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="Enter your email..."
                className="h-14 text-lg px-6 rounded-2xl"
                required
              />
            </div>
            <div className="space-y-3">
              <Label
                htmlFor="password"
                className="text-slate-300 text-sm font-semibold tracking-wide flex items-center gap-2"
              >
                <KeyRound className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="Enter your password..."
                className="h-14 text-lg px-6 rounded-2xl"
                required
              />
            </div>
          </CardContent>

          <CardFooter className="px-8 pb-12">
            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full h-14 text-base font-bold rounded-2xl"
            >
              <span className="relative flex items-center justify-center gap-3">
                <Shield className="h-5 w-5" />
                Authorize Access
              </span>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
