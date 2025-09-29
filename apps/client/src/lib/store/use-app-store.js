// File: apps/client/src/lib/store/use-app-store.js (Corrected Export)
'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useState, useEffect } from 'react'

const useAppStore = create(
  persist(
    (set, get) => ({
      // --- Chat State ---
      chats: [],
      activeChatId: null,
      chatContextPrompt: '',
      deletePreferences: {
        skipArticleConfirmation: false,
        skipOpportunityConfirmation: false,
      },
      setChatContextPrompt: (prompt) => set({ chatContextPrompt: prompt }),
      createChat: () => {
        const newChatId = `chat_${Date.now()}`
        const newChat = {
          id: newChatId,
          title: 'New Chat',
          createdAt: new Date().toISOString(),
          messages: [],
        }
        set((state) => ({ chats: [newChat, ...state.chats], activeChatId: newChatId }))
        return newChatId
      },
      selectChat: (id) => {
        const { chats } = get()
        if (chats.find((c) => c.id === id)) {
          set({ activeChatId: id })
        } else if (chats.length > 0) {
          set({ activeChatId: chats[0].id })
        } else {
          get().createChat()
        }
      },
      updateChatTitle: (id, newTitle) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id ? { ...chat, title: newTitle } : chat
          ),
        })),
      getMessagesForChat: (id) => {
        const chat = get().chats.find((c) => c.id === id)
        return chat ? chat.messages : []
      },
      setMessagesForChat: (id, messages) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id ? { ...chat, messages } : chat
          ),
        })),
      init: () => {
        if (useAppStore.getState().chats.length === 0) {
          get().createChat()
        } else {
          const { chats, activeChatId } = get()
          if (!activeChatId || !chats.find((c) => c.id === activeChatId)) {
            get().selectChat(chats[0].id)
          }
        }
      },
      setDeletePreference: (key, value) => {
        set((state) => ({
          deletePreferences: { ...state.deletePreferences, [key]: value },
        }))
      },
    }),
    {
      name: 'headlines-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        chats: state.chats,
        activeChatId: state.activeChatId,
        deletePreferences: state.deletePreferences,
      }),
    }
  )
)

// A simple hook to prevent rendering until the client has mounted and the store is hydrated.
const useHasHydrated = () => {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated
}

// --- THE FIX IS HERE ---
// We need to export the hook alongside the default export.
export { useHasHydrated }
export default useAppStore
