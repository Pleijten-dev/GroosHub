// Main chat interface component
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
  onChatCreated?: (chatId: string) => void;
}

export function ChatInterface({
  locale,
  chatId,
  initialMessages = [],
  onChatCreated,
}: ChatInterfaceProps) {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_CHAT_MODEL);
  const [loadedMessages, setLoadedMessages] = useState<UIMessage[]>(initialMessages);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const hasLoadedRef = useRef(false);
  const chatIdRef = useRef(chatId);

  // Load messages when chatId changes
  useEffect(() => {
    async function loadMessages() {
      if (!chatId || hasLoadedRef.current) return;

      hasLoadedRef.current = true;
      setIsLoadingMessages(true);

      try {
        const response = await fetch(`/api/chat/${chatId}`);
        if (response.ok) {
          const data = await response.json();
          // Convert ChatMessage format to UIMessage format
          const uiMessages: UIMessage[] = data.messages.map((msg: ChatMessage) => ({
            id: msg.id,
            role: msg.role,
            parts: [{ type: 'text' as const, text: msg.content }],
            metadata: msg.metadata,
          }));
          setLoadedMessages(uiMessages);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    }

    // Reset loaded ref if chatId changes
    if (chatIdRef.current !== chatId) {
      hasLoadedRef.current = false;
      chatIdRef.current = chatId;
    }

    loadMessages();
  }, [chatId]);

  const { messages, sendMessage, status, error } = useChat({
    chatId,
    model: selectedModel,
    locale,
    initialMessages: loadedMessages,
    onFinish: (result) => {
      // Extract chat ID from response if this is a new chat
      if (!chatId && result && onChatCreated) {
        // The chat ID should be in the URL or we need to extract it
        // For now, we'll rely on the API creating it and returning it
        // We could enhance this by reading from response headers
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
        <h1 className="text-lg font-semibold text-text-primary">
          {locale === 'nl' ? 'AI Assistent' : 'AI Assistant'}
        </h1>

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

      {/* Loading messages state */}
      {isLoadingMessages && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">
              {locale === 'nl' ? 'Berichten laden...' : 'Loading messages...'}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      {!isLoadingMessages && (
        <ChatMessages
          messages={chatMessages}
          locale={locale}
          isLoading={isLoading}
        />
      )}

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
