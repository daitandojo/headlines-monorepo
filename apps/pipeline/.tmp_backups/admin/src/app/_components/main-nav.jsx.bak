// apps/admin/src/app/_components/main-nav.jsx (version 1.8.1)
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { BotMessageSquare, Newspaper, Users, Rss, Gauge, Settings, Globe, Zap, Target, FileText, Code } from 'lucide-react'
import { cn } from '@headlines/utils'
import { Separator } from '@headlines/ui'
import { ThemeToggle } from './theme-toggle'

const navSections = [
    {
        items: [
          { name: 'Dashboard', href: '/dashboard', icon: Gauge },
          { name: 'Sources', href: '/', icon: Newspaper },
          { name: 'Users', href: '/users', icon: Users },
          { name: 'Watchlist', href: '/watchlist', icon: Rss },
        ]
    },
    {
        items: [
          { name: 'Events', href: '/events', icon: Zap },
          { name: 'Articles', href: '/articles', icon: FileText },
          { name: 'Opportunities', href: '/opportunities', icon: Target },
        ]
    },
    {
        items: [
          { name: 'Countries', href: '/countries', icon: Globe },
          { name: 'Scraper IDE', href: '/scraper-ide', icon: Code },
          { name: 'Settings', href: '/settings', icon: Settings },
        ]
    }
];

export default function MainNav() {
  const pathname = usePathname()

  const isCurrent = (href) => {
    if (href === '/') return pathname === '/' || pathname.startsWith('/sources');
    return pathname.startsWith(href)
  }

  return (
    <nav className="w-[280px] bg-card border-r flex flex-col flex-shrink-0">
      {/* Header (fixed) */}
      <div className="p-4 border-b h-[100px] flex items-center gap-3">
        <BotMessageSquare className="w-8 h-8 gemini-text flex-shrink-0" />
        <div>
          <h1 className="text-xl font-bold tracking-tighter">Headlines Admin</h1>
          <p className="text-sm text-muted-foreground">Management Console</p>
        </div>
      </div>
      
      {/* Scrollable Nav Links (takes up all available space) */}
      <div className="flex-1 overflow-y-auto p-4">
        {navSections.map((section, index) => (
            <React.Fragment key={index}>
                <ul className="space-y-2">
                    {section.items.map((item) => (
                        <li key={item.name}>
                        <Link
                            href={item.href}
                            className={cn(
                            'flex items-center gap-3 px-4 py-2.5 text-base font-medium rounded-lg transition-colors',
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

      {/* Footer (fixed at the bottom) */}
      <div className="p-4 border-t">
          <ThemeToggle />
      </div>
    </nav>
  )
}
