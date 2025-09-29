// Full Path: headlines/src/app/page.js
import { redirect } from 'next/navigation'

export default function RootPage() {
  // This page will be the main entry point.
  // The AuthProvider wrapping all pages will see the user is not authenticated
  // (or is authenticated) and handle the redirect to either /login or /events.
  // This redirect acts as a sensible default if the AuthProvider logic were ever bypassed.
  redirect('/events')
}
