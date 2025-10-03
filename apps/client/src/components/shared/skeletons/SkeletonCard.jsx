// packages/ui/src/SkeletonCard.jsx
'use client'

import { Card, CardContent } from '..'
// DEFINITIVE FIX: Use the package name for imports between packages.
import { cn } from '@headlines/utils-shared'

export const SkeletonCard = ({ className }) => {
  return (
    <Card className={cn('bg-slate-900/50 border-slate-700/50 animate-pulse', className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Left Column Skeleton */}
          <div className="flex flex-col items-center shrink-0">
            <div className="h-10 w-14 bg-slate-700 rounded-md"></div>
            <div className="h-4 w-10 bg-slate-700 rounded mt-1"></div>
          </div>
          {/* Right Column Skeleton */}
          <div className="flex-grow min-w-0 space-y-3">
            <div className="h-6 w-3/4 bg-slate-700 rounded"></div>
            <div className="h-4 w-full bg-slate-700 rounded"></div>
            <div className="h-4 w-5/6 bg-slate-700 rounded"></div>
            <div className="h-4 w-1/3 bg-slate-700 rounded mt-2"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
