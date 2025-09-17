// src/hooks/use-realtime-updates.js (version 4.1)
'use client'

import { useEffect, useRef } from 'react'
import Pusher from 'pusher-js'
import { useQueryClient } from '@tanstack/react-query'
// NOTE: Toast and icon imports are no longer needed.

export function useRealtimeUpdates({ channel, event, queryKey }) {
  const queryClient = useQueryClient()
  const pusherRef = useRef(null)

  useEffect(() => {
    if (!channel || !event || !queryKey) {
      console.warn(
        '[Realtime] Missing required props: channel, event, or queryKey. Updates disabled.'
      )
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
        console.log(`Real-time event '${event}' received on channel '${channel}':`, data)

        // The hook's only job is now to invalidate the query,
        // which triggers a seamless, silent background refresh of the data.
        queryClient.invalidateQueries({ queryKey: queryKey })

        // REMOVED: The toast notification logic has been completely removed.
      })

      console.log(`Successfully subscribed to real-time channel: '${channel}'`)

      return () => {
        if (pusherRef.current) {
          pusherRef.current.unsubscribe(channel)
          console.log(`Unsubscribed from real-time channel: '${channel}'`)
        }
      }
    } catch (error) {
      console.error(`Failed to subscribe to Pusher channel '${channel}':`, error)
    }
  }, [channel, event, queryKey, queryClient])
}
