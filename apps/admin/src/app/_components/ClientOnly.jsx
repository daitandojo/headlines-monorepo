// **File: apps/admin/src/app/_components/ClientOnly.jsx (NEW FILE)**
'use client'

import { useState, useEffect } from 'react'

export function ClientOnly({ children }) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return null
  }

  return <>{children}</>
}
