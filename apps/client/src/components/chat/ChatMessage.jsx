// src/components/chat/ChatMessage.jsx (version 2.2)
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { cn } from '@headlines/utils'
import { User, Bot, ChevronsUpDown } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@headlines/ui'
import { ChatLoadingIndicator } from './ChatLoadingIndicator'

export function ChatMessage({ message, onAccordionToggle }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex items-start gap-4', isUser && 'justify-end')}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center">
          <Bot className="h-5 w-5" />
        </div>
      )}
      <div
        className={cn(
          'px-4 py-3 rounded-xl max-w-[85%]',
          isUser ? 'bg-slate-700' : 'bg-slate-800'
        )}
      >
        {!isUser && (message.isThinking || message.thoughts) && (
          <Accordion
            type="single"
            collapsible
            className="w-full mb-2"
            onValueChange={onAccordionToggle}
          >
            <AccordionItem value="item-1" className="border-b border-slate-700/50">
              <AccordionTrigger className="py-2 text-xs text-slate-400 hover:no-underline">
                <div className="flex items-center gap-2">
                  <ChevronsUpDown className="h-3 w-3" />
                  View Thoughts
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                {message.isThinking ? (
                  <ChatLoadingIndicator />
                ) : (
                  <div className="prose prose-xs prose-invert max-w-none text-slate-400 bg-black/20 p-3 rounded-md">
                    <ReactMarkdown>{`\`\`\`markdown\n${message.thoughts}\n\`\`\``}</ReactMarkdown>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {!message.isThinking && message.content && (
          <div className="overflow-x-auto custom-scrollbar">
            <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-2 prose-li:my-0 text-slate-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-500/20 text-slate-300 flex items-center justify-center">
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}
