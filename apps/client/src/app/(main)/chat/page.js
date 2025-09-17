// src/app/(main)/chat/page.js (version 4.1)
import { ChatManager } from '@/components/ChatManager'

export default function ChatPage() {
  // This page is now a pure container for the ChatManager.
  // The full-screen layout, header, and tabs are all handled conditionally
  // by the parent `(main)/layout.js` via the `ConditionalLayout` component.
  // This ensures a clean separation of concerns.
  return <ChatManager />
}
