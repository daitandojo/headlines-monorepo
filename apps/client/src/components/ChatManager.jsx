// src/components/ChatManager.jsx (version 2.0)
'use client'

import { useEffect } from 'react'
import { ChatSidebar } from './chat/ChatSidebar'
import { ChatView } from './ChatView'
import useAppStore from '@/store/use-app-store'
import { useHasHydrated } from '@/hooks/use-has-hydrated'
import { Loader2 } from 'lucide-react'

export function ChatManager() {
  const {
    chats,
    activeChatId,
    createChat,
    selectChat,
    updateChatTitle,
    getMessagesForChat,
    setMessagesForChat,
    init,
  } = useAppStore()

  // Use the new hook to gate rendering until hydration is complete.
  const hasHydrated = useHasHydrated()

  useEffect(() => {
    // The init logic now safely runs only after hydration is confirmed.
    if (hasHydrated) {
      init()
    }
  }, [hasHydrated, init])

  // The condition is now based on the reliable hydration status.
  // This ensures server and initial client renders are identical (showing the loader).
  // The component will re-render and show the chat UI only after the
  // `useHasHydrated` hook returns true.
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
      <ChatView
        key={activeChatId}
        chatId={activeChatId}
        updateChatTitle={updateChatTitle}
        getMessages={getMessagesForChat}
        setMessages={setMessagesForChat}
      />
    </div>
  )
}
