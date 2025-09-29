// File: apps/copyboard/src/app/admin/page.js

import { redirect } from 'next/navigation'

export default function AdminRootPage() {
  // This ensures that anyone navigating to /admin is immediately
  // sent to the main dashboard page.
  redirect('/admin/dashboard')
}