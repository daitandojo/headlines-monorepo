// apps/client/src/app/_components/AppWrapper.jsx
import 'server-only'
import { cookies } from 'next/headers'
import { verifySession } from '@/lib/auth/server'
import { AuthProvider } from '@/lib/auth/AuthProvider'

async function getUser() {
  try {
    const cookieStore = cookies()
    const { user } = await verifySession(cookieStore)
    return user
  } catch (error) {
    // This can happen during build time or if cookies are unavailable.
    // Gracefully return null.
    return null
  }
}

export async function AppWrapper({ children }) {
  const user = await getUser()

  // The AuthProvider client component receives the initial user state from the server.
  return <AuthProvider initialUser={user}>{children}</AuthProvider>
}
