// File: apps/copyboard/src/components/client/ChatManager.jsx (Corrected Hydration)
'use client'

import { useEffect } from 'react'
import { ChatSidebar } from './chat/ChatSidebar'
import { ChatView } from './ChatView'
import useAppStore, { useHasHydrated } from '@/lib/store/use-app-store' // <-- Import the new hook
import { Loader2 } from 'lucide-react'

export function ChatManager() {
  // This hook now simply tells us if we are on the client and mounted.
  const hasHydrated = useHasHydrated()

  // We can safely call the store hooks at the top level.
  const {
    chats,
    activeChatId,
    createChat,
    selectChat,
    init,
    getMessagesForChat,
    setMessagesForChat,
  } = useAppStore()

  const messages = getMessagesForChat(activeChatId)

  useEffect(() => {
    // We still wait for hydration before running the init logic.
    if (hasHydrated) {
      init()
    }
  }, [hasHydrated, init])

  // The guard condition: if not hydrated, show the spinner.
  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mr-3" />
        <p>Initializing Chat Interface...</p>
      </div>
    )
  }

  // If hydrated, we can safely render the rest of the component tree,
  // which will now be guaranteed to be inside the QueryClientProvider.
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
      {/* Ensure activeChatId exists before rendering ChatView to prevent errors */}
      {activeChatId && (
        <ChatView
          key={activeChatId}
          chatId={activeChatId}
          initialMessages={messages}
          setMessages={setMessagesForChat}
        />
      )}
    </div>
  )
}
