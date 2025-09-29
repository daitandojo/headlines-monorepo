// src/components/chat/ChatScrollAnchor.jsx (version 1.1)
'use client'

import { useRef, useEffect, forwardRef } from 'react'

export const ChatScrollAnchor = forwardRef(function ChatScrollAnchor({ messages }, ref) {
  const internalRef = useRef(null)
  const anchorRef = ref || internalRef

  useEffect(() => {
    if (anchorRef.current) {
      anchorRef.current.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      })
    }
  }, [messages, anchorRef])

  return <div ref={anchorRef} className="h-px w-full" />
})
