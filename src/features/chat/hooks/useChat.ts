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
    console.log('[Client] Sending request to API:', {
      url: input.toString(),
      body: init?.body ? JSON.parse(init.body as string) : null,
      chatId,
      model,
    });

    const response = await fetch(input, init);

    console.log('[Client] API response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: {
        contentType: response.headers.get('Content-Type'),
        chatId: response.headers.get('X-Chat-Id'),
        model: response.headers.get('X-Model'),
        provider: response.headers.get('X-Provider'),
      },
    });

    // Check for error responses
    if (!response.ok) {
      const contentType = response.headers.get('Content-Type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.clone().json();
        console.error('[Client] ❌ API Error:', errorData);
        console.error('[Client] Error details:', {
          status: response.status,
          error: errorData.error,
          message: errorData.message,
          provider: errorData.provider,
          model: errorData.model,
        });
      }
    }

    // Extract chat ID from response headers
    const newChatId = response.headers.get('X-Chat-Id');
    if (newChatId && !chatId && onChatCreated) {
      console.log('[Client] New chat created:', newChatId);
      // Call the callback with the new chat ID
      onChatCreated(newChatId);
    }

    return response;
  }, [chatId, onChatCreated, model]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      body: {
        chatId,
        locale,
      },
      fetch: customFetch,
      prepareSendMessagesRequest(request) {
        // Inject the current model into each request
        // Keep all existing request properties (especially messages!)
        console.log('[Client] Preparing request with model:', model);
        console.log('[Client] Original request:', request);
        const updatedRequest = {
          ...request,
          body: {
            ...request.body,
            model: model,
          },
        };
        console.log('[Client] Updated request:', updatedRequest);
        return updatedRequest;
      },
    }),
    [chatId, locale, customFetch, model]
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
