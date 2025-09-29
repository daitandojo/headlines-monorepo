'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import {
  BotMessageSquare,
  Users,
  Rss,
  Gauge,
  Settings,
  Zap,
  Target,
  FileText,
  Code,
  ArrowLeftCircle,
} from 'lucide-react'
import { cn } from '@headlines/utils-shared'
import { Separator } from '@/components/shared'
import { ThemeToggle } from './theme-toggle'

const navSections = [
  {
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: Gauge },
      { name: 'Scraper IDE', href: '/admin/scraper-ide', icon: Code },
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Watchlist', href: '/admin/watchlist', icon: Rss },
    ],
  },
  {
    items: [
      { name: 'Events', href: '/admin/events', icon: Zap },
      { name: 'Articles', href: '/admin/articles', icon: FileText },
      { name: 'Opportunities', href: '/admin/opportunities', icon: Target },
    ],
  },
  {
    items: [
      // The "Countries" item has been removed from this section.
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
]

export default function MainNav() {
  const pathname = usePathname()

  const isCurrent = (href) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <nav className="hidden lg:flex w-[280px] bg-card border-r flex-col flex-shrink-0">
      <div className="p-4 border-b h-16 flex items-center gap-3">
        <BotMessageSquare className="w-8 h-8 text-primary flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold tracking-tighter">Headlines Admin</h1>
          <p className="text-sm text-muted-foreground">Command Center</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {navSections.map((section, index) => (
          <React.Fragment key={index}>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors',
                      isCurrent(item.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            {index < navSections.length - 1 && <Separator className="my-4" />}
          </React.Fragment>
        ))}
      </div>
      <div className="p-4 border-t mt-auto space-y-2">
        <Link
          href="/events"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <ArrowLeftCircle className="w-5 h-5" />
          Back to Client App
        </Link>
        <ThemeToggle />
      </div>
    </nav>
  )
}
