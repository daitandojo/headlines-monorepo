'use client'
import { Briefcase, LogOut, Settings, User } from 'lucide-react'
import { InstallPwaButton } from './InstallPwaButton'
import { GlobalCountrySelector } from './GlobalCountrySelector'
import { useAuth } from '@/lib/auth/client.js'
import { NotificationToggles } from './NotificationToggles'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../shared'
import Link from 'next/link'

export const Header = ({
  articleCount,
  eventCount,
  opportunityCount,
  globalCountries,
}) => {
  const { user, logout } = useAuth()

  return (
    <header className="mb-4 sm:mb-6 relative">
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {user && (
          <>
            <GlobalCountrySelector countries={globalCountries || []} />
            <NotificationToggles />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex items-center gap-2 rounded-full"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-secondary">
                <DropdownMenuLabel>Hi, {user.firstName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/settings" passHref>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <InstallPwaButton />
      </div>
      <div className="flex flex-row items-center justify-center gap-x-3 sm:gap-x-4 mb-3 pt-8 sm:pt-0">
        <Briefcase size={28} className="text-blue-400 sm:size-10" />
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100 text-center sm:text-left">
          Headlines<span className="hidden sm:inline"> Intelligence</span>
        </h1>
      </div>
      <p className="text-center text-sm sm:text-base text-slate-400 max-w-3xl mx-auto">
        Analyze
        <span className="font-bold text-slate-300"> {eventCount?.toLocaleString()} </span>
        events,
        <span className="font-bold text-slate-300">
          {' '}
          {opportunityCount?.toLocaleString()}{' '}
        </span>
        opportunities, from
        <span className="font-bold text-slate-300">
          {' '}
          {articleCount?.toLocaleString()}{' '}
        </span>
        articles.
      </p>
    </header>
  )
}
