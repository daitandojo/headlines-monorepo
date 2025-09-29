// packages/utils-shared/src/hooks/use-realtime-updates.js (version 1.0.1 - Complete)
'use client'

import { useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import { useQueryClient } from '@tanstack/react-query'

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
        // Invalidate queries to trigger a refetch of the list
        queryClient.invalidateQueries({ queryKey: [queryKey] })
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
