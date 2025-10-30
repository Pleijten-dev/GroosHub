// Chat messages list component
'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage as Message } from '../../types';
import { ChatMessage } from './ChatMessage';

interface ChatMessagesProps {
  messages: Message[];
  locale: string;
  isLoading?: boolean;
}

export function ChatMessages({ messages, locale, isLoading }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Debug log
  useEffect(() => {
    console.log('[ChatMessages] Received messages:', {
      count: messages.length,
      messages: messages.map(m => ({ id: m.id, role: m.role, content: m.content?.substring(0, 50) })),
    });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-2 text-4xl">💬</div>
          <h3 className="mb-1 text-lg font-semibold text-text-primary">
            Start a conversation
          </h3>
          <p className="text-sm text-text-secondary">
            Ask me anything about location data, real estate, or demographics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      style={{ scrollBehavior: 'smooth' }}
    >
      <div className="mx-auto max-w-4xl">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} locale={locale} />
        ))}

        {isLoading && (
          <div className="flex w-full gap-4 p-4">
            <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-bg-primary shadow">
              <span className="text-sm">🤖</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-color-primary" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-color-primary delay-100" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-color-primary delay-200" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
