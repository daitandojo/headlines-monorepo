// src/components/admin/AdminHeader.jsx (version 1.0)
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Shield, LogOut, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function AdminHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="bg-slate-900/50 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Shield className="h-6 w-6 text-blue-400" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-slate-100">
                Admin Command Center
              </h1>
              <p className="text-xs text-slate-400">
                Logged in as {user?.email || '...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/events">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to App
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
