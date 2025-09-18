// packages/ui/src/Skeleton.jsx
'use client'

import { cn } from '../../utils/src/index.js'

function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

export { Skeleton }
