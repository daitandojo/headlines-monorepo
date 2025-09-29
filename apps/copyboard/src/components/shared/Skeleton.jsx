'use client'
import { cn } from '@headlines/utils-shared'
function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}
export { Skeleton }
