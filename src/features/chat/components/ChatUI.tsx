/**
 * Chat UI Component
 * Main chat interface with streaming support
 *
 * Week 1 Implementation:
 * - Vercel AI SDK v5 with useChat hook
 * - DefaultChatTransport for streaming
 * - UIMessage parts structure
 * - Model selector
 * - Keyboard shortcuts
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { cn } from '@/shared/utils/cn';
import {
  getAllModelIds,
  DEFAULT_MODEL,
  type ModelId
} from '@/lib/ai/models';

export interface ChatUIProps {
  locale: 'nl' | 'en';
}

export function ChatUI({ locale }: ChatUIProps) {
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use the Vercel AI SDK v5 useChat hook
  const {
    messages,
    sendMessage,
    status,
    stop,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    // TODO: Add model selection support in Week 2
    // For now, the API uses the default model
  });

  // Compute loading state from status
  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter: Send message
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          handleSubmit(e as unknown as React.FormEvent);
        }
      }

      // Escape: Stop streaming
      if (e.key === 'Escape' && isLoading) {
        stop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, isLoading, stop]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Send message with text (AI SDK will convert to proper format)
    sendMessage({ text: input });
    setInput('');
  };

  const availableModels = getAllModelIds();

  const translations = {
    nl: {
      title: 'AI Assistent',
      modelLabel: 'Model',
      inputPlaceholder: 'Typ je bericht...',
      sendButton: 'Versturen',
      stopButton: 'Stop',
      emptyState: 'Start een gesprek door een bericht te typen',
      errorPrefix: 'Fout:',
      you: 'Jij',
      assistant: 'Assistent',
      shortcuts: 'Ctrl+Enter om te versturen, Esc om te stoppen',
    },
    en: {
      title: 'AI Assistant',
      modelLabel: 'Model',
      inputPlaceholder: 'Type your message...',
      sendButton: 'Send',
      stopButton: 'Stop',
      emptyState: 'Start a conversation by typing a message',
      errorPrefix: 'Error:',
      you: 'You',
      assistant: 'Assistant',
      shortcuts: 'Ctrl+Enter to send, Esc to stop',
    },
  };

  const t = translations[locale];

  // Render message content from parts array (AI SDK v5)
  const renderMessageContent = (message: typeof messages[0]) => {
    return message.parts.map((part, index) => {
      if (part.type === 'text') {
        return (
          <span key={`${message.id}-text-${index}`} className="whitespace-pre-wrap break-words">
            {part.text}
          </span>
        );
      }
      // Handle other part types if needed in future (images, files, etc.)
      return null;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-base py-sm shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{t.title}</h1>

          {/* Model Selector */}
          <div className="flex items-center gap-sm">
            <label htmlFor="model-select" className="text-sm font-medium text-gray-700">
              {t.modelLabel}:
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ModelId)}
              disabled={isLoading}
              className={cn(
                'px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:bg-gray-100 disabled:cursor-not-allowed'
              )}
            >
              {availableModels.map((modelId) => (
                <option key={modelId} value={modelId}>
                  {modelId}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-base py-lg">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-center">
              <p>{t.emptyState}</p>
            </div>
          ) : (
            <div className="space-y-base">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-base py-sm shadow-sm',
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    )}
                  >
                    <div className="text-xs font-medium mb-1 opacity-70">
                      {message.role === 'user' ? t.you : t.assistant}
                    </div>
                    <div className="text-sm">
                      {renderMessageContent(message)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] bg-white border border-gray-200 rounded-lg px-base py-sm shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs text-gray-500">{t.assistant}</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {status === 'error' && (
        <div className="bg-red-50 border-t border-red-200 px-base py-sm">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-red-800">
              <strong>{t.errorPrefix}</strong> An error occurred. Please try again.
            </p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-base py-sm shadow-lg">
        <div className="max-w-4xl mx-auto">
          <form id="chat-form" onSubmit={handleSubmit} className="flex gap-sm">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.inputPlaceholder}
              disabled={isLoading}
              className={cn(
                'flex-1 px-base py-sm bg-white border border-gray-300 rounded-lg',
                'text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                'disabled:bg-gray-100 disabled:cursor-not-allowed'
              )}
            />

            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className={cn(
                  'px-base py-sm bg-red-600 text-white rounded-lg',
                  'text-sm font-medium hover:bg-red-700',
                  'focus:outline-none focus:ring-2 focus:ring-red-500',
                  'transition-colors'
                )}
              >
                {t.stopButton}
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className={cn(
                  'px-base py-sm bg-blue-600 text-white rounded-lg',
                  'text-sm font-medium hover:bg-blue-700',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  'disabled:bg-gray-300 disabled:cursor-not-allowed',
                  'transition-colors'
                )}
              >
                {t.sendButton}
              </button>
            )}
          </form>

          <p className="text-xs text-gray-500 mt-sm text-center">
            {t.shortcuts}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatUI;
