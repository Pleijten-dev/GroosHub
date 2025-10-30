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

    // Log ALL headers to see everything the server sent
    const allHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });

    console.log('[Client] 📡 API response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      bodyUsed: response.bodyUsed,
      url: response.url,
      allHeaders,
    });

    // Extract and log diagnostic headers
    const debugInfo = {
      streamInit: response.headers.get('X-Debug-Stream-Init'),
      apiKeyExists: response.headers.get('X-Debug-API-Key-Exists'),
      modelID: response.headers.get('X-Debug-Model-ID'),
      provider: response.headers.get('X-Debug-Provider'),
    };
    console.log('[Client] 🔍 Server diagnostics:', debugInfo);

    // Check for error responses
    if (!response.ok) {
      const contentType = response.headers.get('Content-Type');
      if (contentType?.includes('application/json')) {
        const errorData = await response.clone().json();
        console.error('[Client] ❌ API Error:', errorData);
      } else {
        console.error('[Client] ❌ Non-JSON error response:', {
          status: response.status,
          statusText: response.statusText,
        });
      }
    } else {
      // For successful responses, inspect the stream
      console.log('[Client] ✅ Response OK, inspecting stream...');
      console.log('[Client] Stream details:', {
        hasBody: !!response.body,
        bodyType: response.body ? typeof response.body : 'null',
        locked: response.body?.locked,
      });

      const clonedResponse = response.clone();
      const reader = clonedResponse.body?.getReader();

      if (!reader) {
        console.error('[Client] ❌ No readable stream available!');
      } else {
        console.log('[Client] 📖 Reading first chunk...');
        try {
          const { done, value } = await reader.read();
          console.log('[Client] First read result:', {
            done,
            hasValue: !!value,
            valueLength: value?.length || 0,
          });

          if (value) {
            const text = new TextDecoder().decode(value);
            console.log('[Client] 📨 First chunk content:', text.substring(0, 200));
          } else {
            console.warn('[Client] ⚠️ First chunk is empty!');
          }

          reader.releaseLock();
        } catch (readError) {
          console.error('[Client] ❌ Error reading stream:', readError);
          reader.releaseLock();
        }
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
