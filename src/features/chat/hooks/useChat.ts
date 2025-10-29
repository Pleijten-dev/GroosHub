// Custom chat hook that wraps AI SDK's useChat
'use client';

import { useChat as useAIChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useMemo } from 'react';

export interface UseChatOptions {
  chatId?: string;
  model?: string;
  locale?: string;
  initialMessages?: UIMessage[];
  onFinish?: (result: { message: UIMessage; messages: UIMessage[] }) => void;
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
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      body: {
        chatId,
        model,
        locale,
      },
    }),
    [chatId, model, locale]
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
