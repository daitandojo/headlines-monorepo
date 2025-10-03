// File: apps/client/src/app/(client)/chat/page.js
import { ChatManager } from '@/components/client/chat/ChatManager'

export const dynamic = 'force-dynamic' // Add this line

export default function ChatPage() {
  return <ChatManager />
}
