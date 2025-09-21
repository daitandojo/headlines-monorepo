// apps/client/src/app/(protected)/page.js (NEW FILE)
import { redirect } from 'next/navigation'

export default function ProtectedRootPage() {
  redirect('/events')
}
