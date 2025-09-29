// File: apps/copyboard/src/components/client/ChatManager.jsx (Corrected and Unabridged)
'use client'

import { useEffect } from 'react'
import { ChatSidebar } from './chat/ChatSidebar'
import { ChatView } from './ChatView'
import useAppStore, { useHasHydrated } from '@/lib/store/use-app-store'
import { Loader2 } from 'lucide-react'

export function ChatManager() {
  const hasHydrated = useHasHydrated()

  const { chats, activeChatId, createChat, selectChat, init } = useAppStore()

  useEffect(() => {
    if (hasHydrated) {
      init()
    }
  }, [hasHydrated, init])

  if (!hasHydrated || !activeChatId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mr-3" />
        <p>Initializing Chat Interface...</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-full gap-4">
      <div className="hidden md:flex md:flex-col">
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          createChat={createChat}
          selectChat={selectChat}
        />
      </div>
      {/*
        THE FIX: ChatView is now keyed to the activeChatId and receives only that ID.
        It will be responsible for fetching its own messages from the store.
      */}
      {activeChatId && <ChatView key={activeChatId} chatId={activeChatId} />}
    </div>
  )
}
