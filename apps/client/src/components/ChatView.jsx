'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '@headlines/ui'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChatScrollAnchor } from '@/components/chat/ChatScrollAnchor'
import useAppStore from '@/store/use-app-store'
import { generateChatTitle } from '@lib/api-client'

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
  const queryClient = useQueryClient()
  const chatQueryKey = ['chat', chatId]
  const { updateChatTitle } = useAppStore()

  const { chatContextPrompt, setChatContextPrompt } = useAppStore((state) => ({
    chatContextPrompt: state.chatContextPrompt,
    setChatContextPrompt: state.setChatContextPrompt,
  }))

  const { data: messages = [] } = useQuery({
    queryKey: chatQueryKey,
    queryFn: () => [], // Handled by Zustand, so no fetch needed here.
    staleTime: Infinity,
    gcTime: 1000 * 60 * 5,
  })

  const { mutate: sendMessage, isPending: isThinking } = useMutation({
    mutationFn: postChatMessage,
    onMutate: async ({ userMessage }) => {
      await queryClient.cancelQueries({ queryKey: chatQueryKey })
      const previousMessages = queryClient.getQueryData(chatQueryKey)
      const assistantMessageId = `asst_${Date.now()}`
      const newMessages = [
        ...previousMessages,
        userMessage,
        { role: 'assistant', content: '', id: assistantMessageId, isThinking: true },
      ]
      queryClient.setQueryData(chatQueryKey, newMessages)
      return { previousMessages, assistantMessageId }
    },
    onSuccess: (assistantResponse, variables, context) => {
      queryClient.setQueryData(chatQueryKey, (old) =>
        old.map((msg) =>
          msg.id === context.assistantMessageId
            ? {
                ...msg,
                content: assistantResponse.answer,
                thoughts: assistantResponse.thoughts,
                isThinking: false,
              }
            : msg
        )
      )
      // Generate title after the first successful response
      if (queryClient.getQueryData(chatQueryKey).length === 2) {
        generateChatTitle(queryClient.getQueryData(chatQueryKey)).then((result) => {
          if (result.success) {
            updateChatTitle(chatId, result.title)
          }
        })
      }
    },
    onError: (error, variables, context) => {
      toast.error(`An error occurred: ${error.message}`)
      queryClient.setQueryData(chatQueryKey, (old) =>
        old.map((msg) =>
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
