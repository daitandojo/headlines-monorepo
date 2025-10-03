// File: apps/client/src/app/(client)/upload/page.js
'use client'

import { UploadView } from '@/components/client/upload/UploadView'

export const dynamic = 'force-dynamic'


// This page is a client component and doesn't need the dynamic export
// as it renders entirely on the client. The error was likely a cascade
// from other server components. No change needed here, but including for completeness.

export default function UploadPage() {
  return <UploadView />
}
