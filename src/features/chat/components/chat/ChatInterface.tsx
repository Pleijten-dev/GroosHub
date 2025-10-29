// Main chat interface component
'use client';

import { useState, useMemo } from 'react';
import { useChat } from '../../hooks/useChat';
import { DEFAULT_CHAT_MODEL } from '../../lib/ai/models';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import type { ChatMessage } from '../../types/message';
import type { UIMessage } from 'ai';

interface ChatInterfaceProps {
  locale: string;
  chatId?: string;
  initialMessages?: UIMessage[];
}

export function ChatInterface({
  locale,
  chatId: initialChatId,
  initialMessages = [],
}: ChatInterfaceProps) {
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(initialChatId);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_CHAT_MODEL);

  const { messages, sendMessage, status, error } = useChat({
    chatId: currentChatId,
    model: selectedModel,
    locale,
    initialMessages,
    onFinish: (message) => {
      // Extract chat ID from response if this is a new chat
      if (!currentChatId && message) {
        // Chat ID will be set via response headers
        const chatIdFromStorage = localStorage.getItem('lastChatId');
        if (chatIdFromStorage) {
          setCurrentChatId(chatIdFromStorage);
        }
      }
    },
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSendMessage = async (message: string) => {
    await sendMessage({
      text: message,
    });
  };

  // Convert UIMessage to ChatMessage for display
  const chatMessages = useMemo((): ChatMessage[] => {
    return messages.map((msg) => {
      // Extract text content from parts
      const textContent = msg.parts
        .filter((part) => part.type === 'text')
        .map((part) => (part as { type: 'text'; text: string }).text)
        .join('');

      return {
        id: msg.id,
        role: msg.role,
        content: textContent || '',
        metadata: {
          createdAt: (msg.metadata as { createdAt?: string })?.createdAt || new Date().toISOString(),
        },
      };
    });
  }, [messages]);

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-bg-secondary px-6 py-4">
        <h1 className="text-lg font-semibold text-text-primary">AI Assistant</h1>

        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="rounded-md border bg-bg-primary px-3 py-1 text-sm"
          >
            <option value="grok-2-vision-1212">Grok 2 Vision</option>
            <option value="grok-2-1212">Grok 2</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <ChatMessages
        messages={chatMessages}
        locale={locale}
        isLoading={isLoading}
      />

      {/* Error message */}
      {error && (
        <div className="mx-auto w-full max-w-4xl px-4 pb-2">
          <div className="rounded-lg bg-color-error/10 px-4 py-2 text-sm text-color-error">
            {error.message || 'An error occurred. Please try again.'}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-bg-secondary">
        <div className="mx-auto w-full max-w-4xl">
          <ChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            placeholder={
              locale === 'nl'
                ? 'Stel een vraag...'
                : 'Ask a question...'
            }
          />
        </div>
      </div>
    </div>
  );
}
