// src/components/NotificationToggles.jsx (version 1.1)
'use client'

import { Mail, Bell, BellOff, Loader2, MailMinus } from 'lucide-react' // <-- Replaced MailOff with MailMinus
import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/useAuth'
import { usePushManager } from '@/hooks/use-push-manager'

export function NotificationToggles() {
  const { user, updateUserPreferences } = useAuth()
  const {
    isSupported: isPushSupported,
    isSubscribed: isBrowserSubscribed,
    isLoading: isPushLoading,
    subscribe: subscribeToPush,
  } = usePushManager()

  if (!user) return null

  const handleEmailToggle = () => {
    updateUserPreferences({ emailNotificationsEnabled: !user.emailNotificationsEnabled })
  }

  const handlePushToggle = async () => {
    const newPreference = !user.pushNotificationsEnabled
    await updateUserPreferences({ pushNotificationsEnabled: newPreference })
    if (newPreference && isPushSupported && !isBrowserSubscribed) {
      await subscribeToPush()
    }
  }

  const isPushEnabled = user.pushNotificationsEnabled && isBrowserSubscribed

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={handleEmailToggle}>
            {user.emailNotificationsEnabled ? (
              <Mail className="h-4 w-4 text-green-400" />
            ) : (
              <MailMinus className="h-4 w-4" /> // <-- Use MailMinus icon
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {user.emailNotificationsEnabled ? 'Disable' : 'Enable'} Email Notifications
          </p>
        </TooltipContent>
      </Tooltip>

      {isPushSupported && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePushToggle}
              disabled={isPushLoading}
            >
              {isPushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!isPushLoading &&
                (isPushEnabled ? (
                  <Bell className="h-4 w-4 text-green-400" />
                ) : (
                  <BellOff className="h-4 w-4" />
                ))}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isPushEnabled ? 'Disable' : 'Enable'} Push Notifications</p>
          </TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  )
}
