// Main chat interface component
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { DEFAULT_CHAT_MODEL } from '../../lib/ai/models';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import type { ChatMessage } from '../../types/message';
import type { UIMessage } from 'ai';

// Extended UIMessage type that accounts for both message formats from AI SDK
type ExtendedUIMessage = UIMessage & {
  content?: string; // Simple text messages can have content as string
};

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
    onChatCreated: onChatCreated,
    onFinish: (result) => {
      // Chat message finished generating
      console.log('[Client] Message finished:', {
        message: result.message,
        content: (result.message as ExtendedUIMessage).content,
        parts: result.message.parts,
        partsCount: result.message.parts?.length,
        allMessagesCount: result.messages.length,
      });
    },
  });

  // Log when messages change
  useEffect(() => {
    console.log('[Client] Messages updated:', {
      count: messages.length,
      lastMessage: messages[messages.length - 1],
    });
  }, [messages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSendMessage = async (message: string) => {
    await sendMessage({
      text: message,
    });
  };

  // Convert UIMessage to ChatMessage for display
  const chatMessages = useMemo((): ChatMessage[] => {
    console.log('[Client] Converting messages:', {
      messagesCount: messages.length,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role,
        hasContent: !!(m as ExtendedUIMessage).content,
        hasParts: !!m.parts,
        parts: m.parts,
        content: (m as ExtendedUIMessage).content,
      })),
    });

    const converted = messages.map((msg) => {
      // Extract text content from either content string or parts array
      // UIMessage from AI SDK can have different structures:
      // 1. content as string (simple text messages)
      // 2. parts as array (multi-part messages with text, images, etc.)
      let textContent = '';
      const extendedMsg = msg as ExtendedUIMessage;

      // Check if message has content property (string format)
      if (typeof extendedMsg.content === 'string') {
        textContent = extendedMsg.content;
        console.log('[Client] Message has content string:', { id: msg.id, content: textContent });
      }
      // Check if message has parts array
      else if (msg.parts && Array.isArray(msg.parts)) {
        textContent = msg.parts
          .filter((part) => part.type === 'text')
          .map((part) => (part as { type: 'text'; text: string }).text)
          .join('');
        console.log('[Client] Message has parts array:', { id: msg.id, partsCount: msg.parts.length, content: textContent });
      } else {
        console.warn('[Client] Message has no content or parts:', msg);
      }

      return {
        id: msg.id,
        role: msg.role,
        content: textContent || '',
        metadata: {
          createdAt: (msg.metadata as { createdAt?: string })?.createdAt || new Date().toISOString(),
        },
      };
    });

    console.log('[Client] Converted chat messages:', {
      count: converted.length,
      messages: converted,
    });

    return converted;
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
            <optgroup label="xAI">
              <option value="grok-2-vision-1212">Grok 2 Vision</option>
              <option value="grok-2-1212">Grok 2</option>
            </optgroup>
            <optgroup label="Anthropic">
              <option value="claude-opus-4-1">Claude Opus 4.1</option>
              <option value="claude-opus-4-0">Claude Opus 4.0</option>
              <option value="claude-sonnet-4-0">Claude Sonnet 4.0</option>
            </optgroup>
            <optgroup label="OpenAI">
              <option value="gpt-5">GPT-5</option>
              <option value="gpt-5-mini">GPT-5 Mini</option>
            </optgroup>
            <optgroup label="Mistral">
              <option value="mistral-large-latest">Mistral Large</option>
              <option value="mistral-medium-latest">Mistral Medium</option>
            </optgroup>
            <optgroup label="Google">
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </optgroup>
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
