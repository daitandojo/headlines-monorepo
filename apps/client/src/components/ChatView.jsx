// src/components/ChatView.jsx (version 8.4)
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChatScrollAnchor } from '@/components/chat/ChatScrollAnchor'
import useAppStore from '@/store/use-app-store'
import { generateChatTitle } from '@/actions/chat'

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

export function ChatView({ chatId, updateChatTitle, getMessages, setMessages }) {
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const inputRef = useRef(null)
  const scrollAnchorRef = useRef(null) // Ref for the scroll anchor
  const { chatContextPrompt, setChatContextPrompt } = useAppStore((state) => ({
    chatContextPrompt: state.chatContextPrompt,
    setChatContextPrompt: state.setChatContextPrompt,
  }))

  const messages = getMessages(chatId)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100) // Small delay to allow accordion to render
  }, [])

  const { mutate: sendMessage } = useMutation({
    mutationFn: postChatMessage,
    onSuccess: (assistantResponse, { newMessages, assistantMessageId }) => {
      const finalMessages = newMessages.map((msg) =>
        msg.id === assistantMessageId
          ? {
              ...msg,
              content: assistantResponse.answer,
              thoughts: assistantResponse.thoughts,
              isThinking: false,
            }
          : msg
      )
      setMessages(chatId, finalMessages)

      if (finalMessages.length === 2) {
        generateChatTitle(finalMessages).then((result) => {
          if (result.success) updateChatTitle(chatId, result.title)
        })
      }
    },
    onError: (error, { newMessages, assistantMessageId }) => {
      toast.error(`An error occurred: ${error.message}`)
      const errorMessages = newMessages.map((msg) =>
        msg.id === assistantMessageId
          ? {
              ...msg,
              content: `Error: ${error.message}`,
              isError: true,
              isThinking: false,
            }
          : msg
      )
      setMessages(chatId, errorMessages)
    },
    onSettled: () => {
      setIsThinking(false)
    },
  })

  const startMessageFlow = useCallback(
    (content) => {
      if (isThinking) return

      setIsThinking(true)
      const currentMessages = getMessages(chatId)
      const userMessage = { role: 'user', content: content, id: `user_${Date.now()}` }

      const messagesForApi = [...currentMessages, userMessage]

      const assistantMessageId = `asst_${Date.now()}`
      const assistantPlaceholder = {
        role: 'assistant',
        content: '',
        id: assistantMessageId,
        isThinking: true,
      }
      const newMessages = [...currentMessages, userMessage, assistantPlaceholder]

      setMessages(chatId, newMessages)
      sendMessage({ messagesForApi, newMessages, assistantMessageId })
    },
    [chatId, getMessages, isThinking, sendMessage, setMessages]
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
            <ChatMessage
              key={m.id || `msg-${i}`}
              message={m}
              onAccordionToggle={scrollToBottom}
            />
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
