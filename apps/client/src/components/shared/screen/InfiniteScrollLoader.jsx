// File: apps/client/src/components/client/InfiniteScrollLoader.jsx
'use client'

import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { Loader2 } from 'lucide-react'

export function InfiniteScrollLoader({ onLoadMore, hasMore }) {
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  })

  useEffect(() => {
    if (inView && hasMore) {
      onLoadMore()
    }
  }, [inView, hasMore, onLoadMore])

  return (
    <div ref={ref} className="flex justify-center items-center p-4 h-16">
      {hasMore && <Loader2 className="h-6 w-6 animate-spin text-slate-500" />}
    </div>
  )
}
