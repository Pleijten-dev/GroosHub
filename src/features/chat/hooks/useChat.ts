// Custom chat hook that wraps AI SDK's useChat
'use client';

import { useChat as useAIChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useMemo, useCallback } from 'react';

export interface UseChatOptions {
  chatId?: string;
  model?: string;
  locale?: string;
  initialMessages?: UIMessage[];
  onFinish?: (result: { message: UIMessage; messages: UIMessage[] }) => void;
  onError?: (error: Error) => void;
  onChatCreated?: (chatId: string) => void;
}

export function useChat({
  chatId,
  model,
  locale = 'en',
  initialMessages = [],
  onFinish,
  onError,
  onChatCreated,
}: UseChatOptions = {}) {
  // Custom fetch to intercept and extract chat ID
  const customFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);

    // Extract chat ID from response headers
    const newChatId = response.headers.get('X-Chat-Id');
    if (newChatId && !chatId && onChatCreated) {
      // Call the callback with the new chat ID
      onChatCreated(newChatId);
    }

    return response;
  }, [chatId, onChatCreated]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      body: {
        chatId,
        model,
        locale,
      },
      fetch: customFetch,
    }),
    [chatId, model, locale, customFetch]
  );

  const chat = useAIChat({
    id: chatId,
    transport,
    messages: initialMessages,
    onFinish(result) {
      onFinish?.(result);
    },
    onError(error) {
      console.error('Chat error:', error);
      onError?.(error);
    },
  });

  return chat;
}
