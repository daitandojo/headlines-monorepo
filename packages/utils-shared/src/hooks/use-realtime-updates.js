// packages/utils-shared/src/hooks/use-realtime-updates.js (version 1.0.1 - Complete)
'use client'

import { useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner' // Import toast for user feedback

export function useRealtimeUpdates({ channel, event, queryKey }) {
  const queryClient = useQueryClient()
  const pusherRef = useRef(null)

  useEffect(() => {
    if (!channel || !event || !queryKey) {
      return
    }
    const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY
    const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    if (!pusherRef.current) {
      if (!PUSHER_KEY || !PUSHER_CLUSTER) {
        console.warn('Pusher keys not found, real-time updates are disabled.')
        return
      }
      try {
        pusherRef.current = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER })
      } catch (error) {
        console.error('Failed to initialize Pusher:', error)
        return
      }
    }
    try {
      const pusherChannel = pusherRef.current.subscribe(channel)
      pusherChannel.bind(event, (data) => {
        // --- START OF FIX ---
        // Instead of just invalidating, we reset the query. This is more robust
        // for infinite queries as it forces a complete refetch from page 1,
        // ensuring new items appear at the top.
        queryClient.resetQueries({ queryKey: [queryKey], exact: true })
        toast.info('New intelligence has arrived.', {
          description: 'Your feed has been updated automatically.',
        })
        // --- END OF FIX ---
      })
      return () => {
        if (pusherRef.current) {
          pusherRef.current.unsubscribe(channel)
        }
      }
    } catch (error) {
      console.error(`Failed to subscribe to Pusher channel '${channel}':`, error)
    }
  }, [channel, event, queryKey, queryClient])
}
