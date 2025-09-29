// Full Path: headlines/src/app/login/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Input,
  Button,
  Label,
} from '@/components/shared' // CORRECTED IMPORT
import { LoadingOverlay } from '@/components/shared/LoadingOverlay'
import { cn } from '@headlines/utils-shared'

import { KeyRound, Shield, Sparkles, Mail } from 'lucide-react'
import { useAuth } from '@/lib/auth/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { user, login, isLoading } = useAuth()
  const [isError, setIsError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/events')
    }
  }, [user, router])

  const handleLogin = async (e) => {
    e.preventDefault()

    // --- ADD THIS LOG ---
    console.log(
      `[Login Page] Attempting login with Email: "${email}" | Password: "${password}"`
    )
    // --------------------

    setIsError(false)
    const loginSuccessful = await login(email, password)
    if (!loginSuccessful) {
      setIsError(true)
    }
  }

  if (user || isLoading) {
    return <LoadingOverlay isLoading={true} text="Authorizing..." />
  }

  return (
    <Card
      className={cn(
        'w-full max-w-sm',
        'bg-card/80 backdrop-blur-sm border-border',
        'shadow-2xl shadow-black/50',
        isError ? 'animate-shake' : ''
      )}
      onAnimationEnd={() => setIsError(false)}
    >
      <CardHeader className="items-center text-center space-y-2">
        <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-background to-secondary border border-border rounded-full">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Secure Access Portal</h1>
          <p className="text-muted-foreground text-sm">Authentication Required</p>
        </div>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
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
              className="h-12 text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
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
              className="h-12 text-base"
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            className="w-full h-12 text-base font-bold"
          >
            <Shield className="mr-2 h-5 w-5" />
            Authorize Access
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
