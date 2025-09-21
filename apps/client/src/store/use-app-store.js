// apps/client/src/store/use-app-store.js (version 8.0.1)
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useHasHydrated as useZustandHasHydrated } from '@headlines/utils-shared' // Alias for clarity

const useAppStore = create(
  persist(
    (set, get) => ({
      // --- Chat State ---
      chats: [],
      activeChatId: null,
      allMessages: {},
      chatContextPrompt: '',

      // --- Deletion Preferences ---
      deletePreferences: {
        skipArticleConfirmation: false,
        skipOpportunityConfirmation: false,
      },

      // --- Actions ---
      setChatContextPrompt: (prompt) => set({ chatContextPrompt: prompt }),
      createChat: () => {
        const newChatId = `chat_${Date.now()}`
        const newChat = {
          id: newChatId,
          title: 'New Chat',
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChatId: newChatId,
          allMessages: { ...state.allMessages, [newChatId]: [] },
        }))
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
      getMessagesForChat: (id) => get().allMessages[id] || [],
      setMessagesForChat: (id, messages) =>
        set((state) => ({ allMessages: { ...state.allMessages, [id]: messages } })),
      init: () => {
        const { chats, activeChatId, createChat, selectChat } = get()
        if (useAppStore.persist.hasHydrated()) {
          if (chats.length === 0) {
            createChat()
          } else if (!activeChatId || !chats.find((c) => c.id === activeChatId)) {
            selectChat(chats[0].id)
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
        allMessages: state.allMessages,
        deletePreferences: state.deletePreferences,
      }),
    }
  )
)

// Custom hook to ensure Zustand is hydrated before use
export const useHydratedAppStore = (selector, equals) => {
  const store = useAppStore(selector, equals)
  const hasHydrated = useZustandHasHydrated()
  return hasHydrated ? store : selector(useAppStore.getState())
}

export default useAppStore
