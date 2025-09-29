// apps/client/src/components/admin/AdminNavTabs.jsx (version 2.0 - Restored & Pathed)
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@components/shared'
import { Users, Database } from 'lucide-react'

const ADMIN_TABS = [
  { value: 'users', label: 'User Management', icon: Users, href: '/admin/users' },
  {
    value: 'sources',
    label: 'Source Management',
    icon: Database,
    href: '/admin/sources',
    disabled: false,
  },
]

export function AdminNavTabs() {
  const pathname = usePathname()
  const currentView = pathname.split('/')[2] || 'users'

  return (
    <Tabs value={currentView}>
      <TabsList>
        {ADMIN_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} asChild disabled={tab.disabled}>
            <Link href={tab.href}>
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
