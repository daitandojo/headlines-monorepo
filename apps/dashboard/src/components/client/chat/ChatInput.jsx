// src/components/chat/ChatInput.jsx (version 2.0)
import { Button } from '@shared/ui'
import { Send, Loader2 } from 'lucide-react'
import Textarea from 'react-textarea-autosize'

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  inputRef,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 p-4 border-t border-white/10"
    >
      <Textarea
        ref={inputRef}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Ask a follow-up question..."
        disabled={isLoading}
        className="flex-grow resize-none bg-slate-900/80 border border-slate-700 rounded-lg shadow-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        minRows={1}
        maxRows={5}
      />
      <Button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="h-12 w-12 flex-shrink-0"
        size="icon"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
    </form>
  )
}
