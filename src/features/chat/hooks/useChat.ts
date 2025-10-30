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
      fetch: customFetch,
      prepareSendMessagesRequest(request) {
        // Build the complete request body with messages array
        // Use refs to get CURRENT values (not stale closure values)
        const currentModel = modelRef.current;
        const currentLocale = localeRef.current;
        const currentChatId = chatIdRef.current;

        console.log('[Client] Preparing request with model:', currentModel);
        console.log('[Client] Original request.messages:', request.messages);

        // Convert UIMessage (with parts array) to CoreMessage (with content string)
        const convertedMessages = request.messages.map((msg) => {
          // Extract text from parts array
          const textContent = msg.parts
            .filter((part) => part.type === 'text')
            .map((part) => 'text' in part ? part.text : '')
            .join('');

          return {
            role: msg.role,
            content: textContent,
          };
        });

        console.log('[Client] Converted messages:', convertedMessages);

        return {
          body: {
            id: request.id,
            messages: convertedMessages,  // Send converted messages
            model: currentModel,
            locale: currentLocale,
            chatId: currentChatId,
            ...request.body,
          },
        };
      },
    }),
    [customFetch]  // Remove model, locale, chatId from deps - we use refs instead
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
