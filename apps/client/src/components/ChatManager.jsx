// apps/client/src/components/ChatManager.jsx (version 2.0.0)
'use client'

import { useEffect } from 'react'
import { ChatSidebar } from './chat/ChatSidebar'
import { ChatView } from './ChatView'
import useAppStore, { useHydratedAppStore } from '@/store/use-app-store'
import { Loader2 } from 'lucide-react'

export function ChatManager() {
  const { chats, activeChatId, createChat, selectChat, init } = useAppStore()
  const hasHydrated = useHydratedAppStore((state) => state.hydrated)

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
      <ChatView key={activeChatId} chatId={activeChatId} />
    </div>
  )
}
