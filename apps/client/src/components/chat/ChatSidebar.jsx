// src/components/chat/ChatSidebar.jsx (version 1.0)
"use client";

import { Button } from '@/components/ui/button';
import { PlusCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatSidebar({ chats, activeChatId, createChat, selectChat }) {
    return (
        <div className="flex flex-col h-full bg-slate-900/50 border-r border-slate-700/50 p-2">
            <Button onClick={createChat} className="mb-4">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Chat
            </Button>
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
                <div className="flex flex-col gap-1">
                    {chats.map(chat => (
                        <Button
                            key={chat.id}
                            variant="ghost"
                            onClick={() => selectChat(chat.id)}
                            className={cn(
                                "w-full justify-start text-left truncate",
                                activeChatId === chat.id && "bg-blue-500/20 text-blue-200"
                            )}
                        >
                            <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{chat.title}</span>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}