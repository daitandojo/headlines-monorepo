// packages/utils-shared/src/hooks/use-push-manager.js (version 2.0.1 - Complete)
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@headlines/auth'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * A hook for managing Push Notification subscriptions.
 * @param {object} options
 * @param {function} options.saveSubscription - An async function that takes the subscription object and saves it to the backend.
 */
export function usePushManager({ saveSubscription }) {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()

  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
      return !!subscription
    } catch (error) {
      console.error('[PushManager] Error checking subscription:', error)
      setIsSubscribed(false)
      return false
    }
  }, [])

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    ) {
      setIsSupported(true)
      navigator.serviceWorker.ready
        .then(() => {
          checkSubscription().finally(() => setIsLoading(false))
        })
        .catch((error) => {
          console.error('[PushManager] Service worker failed to become ready:', error)
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [checkSubscription])

  const subscribe = useCallback(async () => {
    if (!user) {
      toast.error('You must be logged in to subscribe to notifications.')
      return
    }
    if (typeof saveSubscription !== 'function') {
      toast.error('Push notification handler is not configured.')
      return
    }
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      if (Notification.permission === 'denied') {
        throw new Error('Notification permission has been denied by the user.')
      }
      const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key not configured.')
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      await saveSubscription(subscription)
      setIsSubscribed(true)
      toast.success('Notifications enabled!')
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        toast.error('Permission for notifications was denied.')
      } else {
        toast.error('Failed to enable notifications.', { description: error.message })
      }
    } finally {
      setIsLoading(false)
    }
  }, [isSubscribed, user, saveSubscription])

  return { isSupported, isSubscribed, isLoading, subscribe }
}
