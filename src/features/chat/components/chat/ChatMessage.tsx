// Individual chat message component
'use client';

import type { ChatMessage as Message } from '../../types';
import { cn } from '../../lib/utils';

interface ChatMessageProps {
  message: Message;
  locale: string;
}

export function ChatMessage({ message, locale }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full gap-4 p-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-bg-primary shadow">
          <span className="text-sm">🤖</span>
        </div>
      )}

      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-2 rounded-lg px-4 py-2',
          isUser
            ? 'bg-color-primary text-white'
            : 'bg-bg-secondary text-text-primary'
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {typeof message.content === 'string' ? message.content : 'Loading...'}
        </div>

        {message.metadata?.createdAt && (
          <div className={cn('text-xs', isUser ? 'text-white/70' : 'text-text-muted')}>
            {new Date(message.metadata.createdAt).toLocaleTimeString(locale, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-bg-primary shadow">
          <span className="text-sm">👤</span>
        </div>
      )}
    </div>
  );
}
