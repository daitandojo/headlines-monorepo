// File: apps/client/src/app/_components/AppWrapper.jsx
import { cookies } from 'next/headers'
import { verifySession } from '@/lib/auth/server'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { AppShell } from './AppShell'

async function getUser() {
  try {
    const cookieStore = await cookies()
    // Your verifySession logic here
    const { user } = await verifySession()
    return user
  } catch (error) {
    // During static generation, cookies() will fail
    // Return null user for static pages
    return null
  }
}

export async function AppWrapper({ children }) {
  const user = await getUser()

  return (
    <AuthProvider initialUser={user}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
