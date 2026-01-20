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
import { useChat, type UIMessage } from '@ai-sdk/react';
import { cn } from '@/shared/utils/cn';
import {
  getAllModelIds,
  DEFAULT_MODEL,
  MODEL_CAPABILITIES,
  type ModelId
} from '@/lib/ai/models';
import { type FileType } from '@/lib/storage/file-validation';
import { FileUploadZone } from './FileUploadZone';
import { ImageAttachment } from './ImageAttachment';
import { ImageLightbox } from './ImageLightbox';
import { MarkdownMessage } from './MarkdownMessage';
import { ChartVisualization, type ChartVisualizationProps } from './ChartVisualization';

interface UploadedFile {
  id: string;
  name: string;
  type: FileType;
  mimeType: string;
  size: number;
  previewUrl?: string;
}

export interface ChatUIProps {
  locale: 'nl' | 'en';
  chatId?: string; // Optional: for loading existing chats
}

export function ChatUI({ locale, chatId }: ChatUIProps) {
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [input, setInput] = useState('');
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(!!chatId);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId);
  const currentChatIdRef = useRef<string | undefined>(chatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousStatusRef = useRef<string>('idle');

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState<{ url: string | URL; fileName?: string } | null>(null);

  // Sync currentChatId with chatId prop, or create new one
  useEffect(() => {
    if (chatId) {
      setCurrentChatId(chatId);
      currentChatIdRef.current = chatId;
    } else if (!currentChatIdRef.current) {
      // Create a chatId upfront for file uploads (will be used when first message is sent)
      const newChatId = crypto.randomUUID();
      setCurrentChatId(newChatId);
      currentChatIdRef.current = newChatId;
      console.log(`[ChatUI] Generated chatId upfront for file uploads: ${newChatId}`);
    }
  }, [chatId]);

  // Load existing messages when chatId is provided
  useEffect(() => {
    async function loadExistingChat() {
      if (!chatId) {
        setInitialMessages([]);
        setIsLoadingChat(false);
        return;
      }

      try {
        console.log(`[ChatUI] Loading chat ${chatId}...`);
        const response = await fetch(`/api/chats/${chatId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load chat');
        }

        console.log(`[ChatUI] Loaded ${data.messages?.length || 0} messages`);
        setInitialMessages(data.messages || []);
      } catch (error) {
        console.error('[ChatUI] Error loading chat:', error);
        setInitialMessages([]);
      } finally {
        setIsLoadingChat(false);
      }
    }

    loadExistingChat();
  }, [chatId]);

  // Use the Vercel AI SDK v5 useChat hook
  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
  } = useChat();

  // Set initial messages after loading from API
  useEffect(() => {
    if (initialMessages.length > 0 && messages.length === 0) {
      console.log(`[ChatUI] Setting ${initialMessages.length} initial messages`);
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  // Refetch messages after streaming completes (to get visualization JSON injected by backend)
  useEffect(() => {
    const refetchMessages = async () => {
      // Only refetch if:
      // 1. We just finished streaming (status changed from 'streaming' to something else)
      // 2. We have a chatId to refetch from
      // 3. We have messages (meaning a conversation exists)
      if (
        previousStatusRef.current === 'streaming' &&
        status !== 'streaming' &&
        currentChatIdRef.current &&
        messages.length > 0
      ) {
        console.log('[ChatUI] 🔄 Streaming completed, refetching messages for visualization updates...');

        // Wait briefly for backend to finish injecting JSON (500ms should be enough)
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
          const response = await fetch(`/api/chats/${currentChatIdRef.current}`);
          const data = await response.json();

          if (response.ok && data.messages) {
            console.log(`[ChatUI] ✅ Refetched ${data.messages.length} messages with visualization data`);
            setMessages(data.messages);
          }
        } catch (error) {
          console.error('[ChatUI] ❌ Failed to refetch messages:', error);
          // Non-critical error, don't show to user
        }
      }

      // Update previous status for next comparison
      previousStatusRef.current = status;
    };

    refetchMessages();
  }, [status, messages.length, setMessages]);

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

    // chatId is already generated in useEffect above
    if (!currentChatIdRef.current) {
      console.error('[ChatUI] No chatId available, this should not happen');
      return;
    }

    // Send message with chatId, modelId, locale, and fileIds in metadata
    sendMessage({
      text: input,
      metadata: {
        chatId: currentChatIdRef.current,
        modelId: selectedModel,
        locale: locale,
        fileIds: uploadedFiles.map(f => f.id), // Add file IDs
      },
    });
    setInput('');
    setUploadedFiles([]); // Clear uploaded files after sending
  };

  // File upload handlers
  const handleFilesUploaded = (newFiles: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
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

  // Check if selected model supports vision (for file uploads)
  const selectedModelCapabilities = MODEL_CAPABILITIES[selectedModel];
  const modelSupportsVision = selectedModelCapabilities?.supportsVision ?? false;

  // Helper function to detect and parse chart visualization data
  const tryParseChartData = (text: string): ChartVisualizationProps | null => {
    try {
      // Look for JSON blocks in the text (tool call results)
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      const parsed = JSON.parse(jsonText);

      // Check if this is chart visualization data
      if (parsed.success && parsed.visualizationType && parsed.charts) {
        return {
          address: parsed.address,
          charts: parsed.charts,
          visualizationType: parsed.visualizationType,
        };
      }
    } catch (e) {
      // Not valid JSON or not chart data, that's okay
    }
    return null;
  };

  // Extract images from message parts
  const extractImages = (message: typeof messages[0]) => {
    const images: Array<{ url: string; fileName: string; index: number }> = [];

    message.parts.forEach((part, index) => {
      // Handle FileUIPart with type 'file' and mediaType 'image/*'
      if ('type' in part && part.type === 'file' && 'mediaType' in part && 'url' in part) {
        const filePart = part as { type: 'file'; mediaType: string; url: string };
        if (filePart.mediaType.startsWith('image/')) {
          images.push({
            url: filePart.url,
            fileName: `image-${index}.${filePart.mediaType.split('/')[1]}`,
            index
          });
        }
      }

      // Handle legacy image parts (for backward compatibility)
      if ('image' in part && (part as any).image) {
        images.push({
          url: (part as any).image as string,
          fileName: `image-${index}.jpg`,
          index
        });
      }
    });

    return images;
  };

  // Render message content from parts array (AI SDK v5) - text only
  const renderMessageContent = (message: typeof messages[0]) => {
    return message.parts.map((part, index) => {
      if (part.type === 'text') {
        // Try to parse as chart visualization data
        const chartData = tryParseChartData(part.text);

        if (chartData) {
          return (
            <ChartVisualization
              key={`${message.id}-chart-${index}`}
              {...chartData}
            />
          );
        }

        // Regular markdown rendering
        return (
          <MarkdownMessage
            key={`${message.id}-text-${index}`}
            content={part.text}
            variant={message.role === 'user' ? 'user' : 'assistant'}
          />
        );
      }

      // Images are handled separately now, not rendered here
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
          {isLoadingChat ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>{locale === 'nl' ? 'Gesprek laden...' : 'Loading chat...'}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-center">
              <p>{t.emptyState}</p>
            </div>
          ) : (
            <div className="space-y-base">
              {messages.map((message) => {
                const images = extractImages(message);
                const hasText = message.parts.some(p => p.type === 'text');

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex flex-col gap-2',
                      message.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    {/* Images - displayed above text, separate from bubble */}
                    {images.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {images.map((img) => (
                          <ImageAttachment
                            key={`${message.id}-image-${img.index}`}
                            imageUrl={img.url}
                            onClick={() => setLightboxImage({
                              url: img.url,
                              fileName: img.fileName
                            })}
                            alt="Attached image"
                          />
                        ))}
                      </div>
                    )}

                    {/* Text bubble - only if there's text content */}
                    {hasText && (
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
                    )}
                  </div>
                );
              })}

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
        <div className="max-w-4xl mx-auto space-y-sm">
          {/* File Upload Zone - Only shown if model supports vision */}
          {currentChatId && (
            <FileUploadZone
              onFilesUploaded={handleFilesUploaded}
              onFileRemove={handleFileRemove}
              uploadedFiles={uploadedFiles}
              chatId={currentChatId}
              disabled={isLoading}
              modelSupportsVision={modelSupportsVision}
              locale={locale}
            />
          )}

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

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          isOpen={true}
          onClose={() => setLightboxImage(null)}
          fileName={lightboxImage.fileName}
          locale={locale}
        />
      )}
    </div>
  );
}

export default ChatUI;
