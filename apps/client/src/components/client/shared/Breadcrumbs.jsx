// apps/client/src/components/client/shared/Breadcrumbs.jsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const LABEL_MAP = {
  events: 'Events',
  articles: 'Articles',
  opportunities: 'Opportunities',
  chat: 'AI Chat',
  'my-watchlist': 'Watchlist',
  upload: 'Upload',
}

export function Breadcrumbs() {
  const pathname = usePathname()

  const segments = pathname.split('/').filter(Boolean).filter(s => s !== '(client)')
  if (segments.length <= 1) return null

  const crumbs = segments.map((segment, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    return { href, label, isLast: i === segments.length - 1 }
  })

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-slate-600" />}
          {crumb.isLast ? (
            <span className="text-slate-300">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-blue-400 transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}