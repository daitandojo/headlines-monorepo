// apps/admin/src/app/(protected)/page.js (version 1.0.1)
import { redirect } from 'next/navigation'

export default function ProtectedRootPage() {
  redirect('/dashboard')
}
