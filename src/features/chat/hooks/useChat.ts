// Custom chat hook that wraps AI SDK's useChat
'use client';

import { useChat as useAIChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useMemo, useCallback, useRef, useEffect } from 'react';

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
  // Use refs to capture current values (not stale closure values)
  // This follows Vercel AI Chatbot pattern
  const modelRef = useRef(model);
  const localeRef = useRef(locale);
  const chatIdRef = useRef(chatId);

  // Keep refs up to date
  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);
  // Custom fetch to intercept, modify body, and extract chat ID
  const customFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    // Modify the request body to include current model, locale, chatId
    if (init?.body) {
      const originalBody = JSON.parse(init.body as string);
      const modifiedBody = {
        ...originalBody,
        model: modelRef.current,
        locale: localeRef.current,
        chatId: chatIdRef.current,
      };

      init = {
        ...init,
        body: JSON.stringify(modifiedBody),
      };

      console.log('[Client] Sending request to API:', {
        url: input.toString(),
        body: modifiedBody,
      });
    }

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
    } else {
      // For successful responses, log a sample of the stream to debug
      const clonedResponse = response.clone();
      const reader = clonedResponse.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        if (value) {
          const text = new TextDecoder().decode(value);
          console.log('[Client] 📨 First chunk of stream:', text.substring(0, 200));
        }
        reader.releaseLock();
      }
    }

    // Extract chat ID from response headers
    const newChatId = response.headers.get('X-Chat-Id');
    if (newChatId && !chatIdRef.current && onChatCreated) {
      console.log('[Client] New chat created:', newChatId);
      // Call the callback with the new chat ID
      onChatCreated(newChatId);
    }

    return response;
  }, [onChatCreated]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      fetch: customFetch,
    }),
    [customFetch]
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
