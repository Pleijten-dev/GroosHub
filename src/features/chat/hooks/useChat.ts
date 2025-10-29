// Custom chat hook that wraps AI SDK's useChat
'use client';

import { useChat as useAIChat } from '@ai-sdk/react';
import { useCallback } from 'react';
import type { ChatMessage } from '../types/message';

export interface UseChatOptions {
  chatId?: string;
  model?: string;
  locale?: string;
  initialMessages?: ChatMessage[];
  onFinish?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export function useChat({
  chatId,
  model,
  locale = 'en',
  initialMessages = [],
  onFinish,
  onError,
}: UseChatOptions = {}) {
  const chat = useAIChat({
    api: '/api/chat',
    id: chatId,
    initialMessages,
    body: {
      chatId,
      model,
      locale,
    },
    onFinish(message) {
      onFinish?.(message);
    },
    onError(error) {
      console.error('Chat error:', error);
      onError?.(error);
    },
  });

  // Get chat ID from response headers
  const getChatIdFromResponse = useCallback((headers: Headers) => {
    return headers.get('X-Chat-Id');
  }, []);

  return {
    ...chat,
    getChatIdFromResponse,
  };
}
