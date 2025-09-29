// File: apps/client/src/components/client/ChatView.jsx (Corrected and Unabridged)
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '@/components/shared'
import { ChatMessage } from '@/components/client/chat/ChatMessage'
import { ChatInput } from '@/components/client/chat/ChatInput'
import { ChatScrollAnchor } from '@/components/client/chat/ChatScrollAnchor'
import useAppStore from '@/lib/store/use-app-store'
import { generateChatTitle } from '@/lib/api-client'

async function postChatMessage({ messagesForApi }) {
  const sanitizedMessages = messagesForApi.map(({ role, content }) => ({ role, content }))
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: sanitizedMessages }),
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to get a response from the server.')
  }
  return response.json()
}

export function ChatView({ chatId }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)
  const scrollAnchorRef = useRef(null)

  // --- THE FIX: ChatView gets its own data and actions from the store ---
  const {
    updateChatTitle,
    chatContextPrompt,
    setChatContextPrompt,
    getMessagesForChat,
    setMessagesForChat,
  } = useAppStore()

  const messages = getMessagesForChat(chatId) || []
  const setMessages = (newMessages) => setMessagesForChat(chatId, newMessages)
  // -----------------------------------------------------------------------

  const { mutate: sendMessage, isPending: isThinking } = useMutation({
    mutationFn: postChatMessage,
    onMutate: async ({ userMessage }) => {
      const assistantMessageId = `asst_${Date.now()}`
      const newMessages = [
        ...messages,
        userMessage,
        { role: 'assistant', content: '', id: assistantMessageId, isThinking: true },
      ]
      setMessages(newMessages) // Update the global store directly
      return { assistantMessageId }
    },
    onSuccess: (assistantResponse, variables, context) => {
      const currentMessages = useAppStore.getState().getMessagesForChat(chatId)
      const updatedMessages = currentMessages.map((msg) =>
        msg.id === context.assistantMessageId
          ? {
              ...msg,
              content: assistantResponse.answer,
              thoughts: assistantResponse.thoughts,
              isThinking: false,
            }
          : msg
      )
      setMessages(updatedMessages)

      if (currentMessages.length === 1) {
        // Check before adding the assistant's reply
        generateChatTitle(updatedMessages).then((result) => {
          if (result.success) {
            updateChatTitle(chatId, result.title)
          }
        })
      }
    },
    onError: (error, variables, context) => {
      const currentMessages = useAppStore.getState().getMessagesForChat(chatId)
      setMessages(
        currentMessages.map((msg) =>
          msg.id === context.assistantMessageId
            ? {
                ...msg,
                content: `Error: ${error.message}`,
                isError: true,
                isThinking: false,
              }
            : msg
        )
      )
      toast.error(`An error occurred: ${error.message}`)
    },
  })

  const startMessageFlow = useCallback(
    (content) => {
      if (isThinking) return
      const userMessage = { role: 'user', content: content, id: `user_${Date.now()}` }
      const messagesForApi = [...messages, userMessage]
      sendMessage({ messagesForApi, userMessage })
    },
    [isThinking, messages, sendMessage]
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    startMessageFlow(input)
    setInput('')
  }

  useEffect(() => {
    if (chatContextPrompt) {
      startMessageFlow(chatContextPrompt)
      setChatContextPrompt('')
    }
  }, [chatContextPrompt, startMessageFlow, setChatContextPrompt])

  useEffect(() => {
    if (!isThinking && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100)
    }
  }, [isThinking])

  return (
    <div className="flex-grow flex flex-col justify-between h-full min-h-0">
      <Card className="bg-black/20 backdrop-blur-sm border border-white/10 shadow-2xl shadow-black/30 h-full flex flex-col">
        <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {messages.length === 0 && !isThinking && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <p className="text-lg">Ask anything about the knowledge base.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <ChatMessage key={m.id || `msg-${i}`} message={m} />
          ))}
          <ChatScrollAnchor ref={scrollAnchorRef} messages={messages} />
        </div>
        <div className="px-4 pb-4">
          <ChatInput
            inputRef={inputRef}
            input={input}
            setInput={setInput}
            handleInputChange={(e) => setInput(e.target.value)}
            handleSubmit={handleSubmit}
            isLoading={isThinking}
          />
        </div>
      </Card>
    </div>
  )
}
