// File: client/src/lib/store/use-app-store.js
'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useState, useEffect } from 'react'

const useAppStore = create(
  persist(
    (set, get) => ({
      // --- Totals State ---
      eventTotal: 0,
      articleTotal: 0,
      opportunityTotal: 0,
      setTotals: (totals) => set((state) => ({ ...state, ...totals })),

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
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('An error occurred during Zustand storage rehydration:', error)
        }
      },
    }
  )
)

const useHasHydrated = () => {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated)

  useEffect(() => {
    const unsubFinishHydration = useAppStore.persist.onFinishHydration(() =>
      setHydrated(true)
    )
    return () => {
      unsubFinishHydration()
    }
  }, [])

  return hydrated
}

export { useHasHydrated }
export default useAppStore
