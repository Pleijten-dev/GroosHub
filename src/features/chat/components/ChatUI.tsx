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
import { MessageSources, type RAGSource } from './MessageSources';

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
  projectId?: string; // Optional: for project-specific chats
}

export function ChatUI({ locale, chatId, projectId }: ChatUIProps) {
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

  // RAG mode state - auto-enable if projectId is provided
  const [isRagEnabled, setIsRagEnabled] = useState(!!projectId);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [userProjects, setUserProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [isRagLoading, setIsRagLoading] = useState(false);
  const [ragStatus, setRagStatus] = useState<string>('');

  // Fetch user projects for RAG mode
  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        if (response.ok && data.projects) {
          setUserProjects(data.projects);
          // Only auto-select first project if no projectId was provided
          if (!projectId && data.projects.length > 0 && !selectedProjectId) {
            setSelectedProjectId(data.projects[0].id);
          }
        }
      } catch (error) {
        console.error('[ChatUI] Failed to fetch projects:', error);
      }
    }
    fetchProjects();
  }, [projectId]);

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
  const isLoading = status === 'submitted' || status === 'streaming' || isRagLoading;

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

  // Handle RAG-augmented query
  // First searches project docs, then proceeds with normal chat (preserving all features)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isRagLoading) return;

    const queryText = input;
    setInput(''); // Clear input immediately
    const currentFiles = [...uploadedFiles];
    setUploadedFiles([]); // Clear uploaded files

    if (!currentChatIdRef.current) {
      console.error('[ChatUI] No chatId available');
      return;
    }

    // Build base metadata
    const baseMetadata: any = {
      chatId: currentChatIdRef.current,
      modelId: selectedModel,
      locale: locale,
      fileIds: currentFiles.map(f => f.id),
      ...(projectId && { projectId }), // Include projectId if provided (for project-specific chats)
    };

    // If RAG is enabled and project is selected, check if query warrants document search
    if (isRagEnabled && selectedProjectId) {
      setIsRagLoading(true);
      setRagStatus(locale === 'nl' ? '🔍 Analyseren van vraag...' : '🔍 Analyzing query...');
      await new Promise(resolve => setTimeout(resolve, 300)); // Ensure status is visible

      try {
        // Step 1: Classify if query is about documents (cheap, fast LLM call)
        console.log('[ChatUI] RAG Mode: Classifying query relevance...');
        const classifyResponse = await fetch('/api/rag/classify-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: queryText,
            projectId: selectedProjectId,
          }),
        });

        if (!classifyResponse.ok) {
          throw new Error('Classification failed');
        }

        const classification = await classifyResponse.json();
        console.log(`[ChatUI] Classification: ${classification.isDocumentRelated ? 'Document-related' : 'Not document-related'} (confidence: ${classification.confidence})`);

        // Step 2: Only call expensive agent if query is document-related
        if (classification.isDocumentRelated) {
          console.log('[ChatUI] 🔍 Query is document-related - invoking agent...');
          setRagStatus(locale === 'nl' ? '📚 Zoeken in documenten...' : '📚 Searching documents...');
          await new Promise(resolve => setTimeout(resolve, 300)); // Ensure status is visible

          const ragResponse = await fetch(`/api/projects/${selectedProjectId}/rag/agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: queryText,
              maxSteps: 10,
              model: 'gpt-4o',
            }),
          });

          if (ragResponse.ok) {
            const ragData = await ragResponse.json();

            // Check if agent found useful information
            const hasGoodAnswer = ragData.confidence !== 'low' &&
                                 ragData.sources &&
                                 ragData.sources.length > 0;

            if (hasGoodAnswer) {
              // Inject RAG context into chat metadata
              console.log(`[ChatUI] ✅ RAG found ${ragData.sources.length} sources (${ragData.confidence} confidence) - injecting into chat`);
              setRagStatus(locale === 'nl'
                ? `✅ ${ragData.sources.length} bronnen gevonden`
                : `✅ Found ${ragData.sources.length} sources`
              );
              await new Promise(resolve => setTimeout(resolve, 500)); // Show success message longer

              baseMetadata.ragContext = {
                answer: ragData.answer,
                sources: ragData.sources.slice(0, 5).map((s: any) => ({
                  file: s.sourceFile,
                  text: s.chunkText?.substring(0, 500)
                })),
                confidence: ragData.confidence,
              };

              baseMetadata.ragSources = ragData.sources; // For display in UI
            } else {
              console.log('[ChatUI] ⚠️ RAG found no good answer - proceeding with normal chat');
              setRagStatus('');
            }
          }
        } else {
          console.log('[ChatUI] ⏭️  Query not document-related - skipping agent, using normal chat');
          setRagStatus('');
        }
      } catch (error) {
        console.error('[ChatUI] ⚠️ RAG pipeline failed, proceeding with normal chat:', error);
        setRagStatus('');
        // Continue to normal chat even if RAG fails
      } finally {
        setIsRagLoading(false);
        // Clear status after chat starts streaming
        setTimeout(() => setRagStatus(''), 1000);
      }
    }

    // Always proceed with normal chat (with or without RAG context)
    // This preserves streaming, memory, tool calling, and all existing features
    sendMessage({
      text: queryText,
      metadata: baseMetadata,
    });
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
      ragLabel: 'RAG Modus',
      projectLabel: 'Project',
      ragOn: 'AAN',
      ragOff: 'UIT',
      noProjects: 'Geen projecten',
      ragActiveForProject: 'RAG ingeschakeld voor dit project',
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
      ragLabel: 'RAG Mode',
      projectLabel: 'Project',
      ragOn: 'ON',
      ragOff: 'OFF',
      noProjects: 'No projects',
      ragActiveForProject: 'RAG enabled for this project',
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

  // Render message content from parts array (AI SDK v5)
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

      // Handle image parts (use type guard since 'image' is not in UIMessage part types)
      if ('image' in part && part.image) {
        return (
          <div key={`${message.id}-image-${index}`} className="mt-2">
            <ImageAttachment
              imageUrl={part.image as string | URL}
              onClick={() => setLightboxImage({ url: part.image as string | URL })}
              alt="Attached image"
            />
          </div>
        );
      }

      // Handle other part types if needed in future (files, etc.)
      return null;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-base py-sm shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{t.title}</h1>

          {/* Controls */}
          <div className="flex items-center gap-base">
            {/* Model Selector - Always visible */}
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

                      {/* Inline RAG Citations - Show within message body */}
                      {message.role === 'assistant' &&
                       message.metadata &&
                       (message.metadata as any).ragSources &&
                       Array.isArray((message.metadata as any).ragSources) &&
                       (message.metadata as any).ragSources.length > 0 && (
                        <div className="mt-base space-y-sm">
                          {((message.metadata as any).ragSources as RAGSource[]).map((source, index) => (
                            <div key={source.id} className="border-t-2 border-gray-300 pt-sm mt-sm">
                              {/* Source Header */}
                              <div className="flex items-center gap-xs mb-xs">
                                <span className="font-mono text-xs bg-amber-600 text-white px-xs py-0.5 rounded font-semibold">
                                  {index + 1}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {locale === 'nl' ? 'Directe citaat uit document:' : 'Direct quote from document:'}
                                </span>
                              </div>

                              {/* Quote Section - Distinct Styling */}
                              <div className="bg-amber-50 border-l-4 border-amber-500 p-sm rounded-r-md mb-sm">
                                <div className="flex items-start gap-xs mb-xs">
                                  <svg className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
                                  </svg>
                                  <p className="text-sm text-gray-800 italic leading-relaxed flex-1">
                                    {source.chunkText}
                                  </p>
                                </div>

                                {/* Source Info */}
                                <div className="text-xs text-amber-700 flex items-center gap-sm flex-wrap mt-xs">
                                  <span className="font-medium">📄 {source.sourceFile}</span>
                                  {source.pageNumber && (
                                    <span>
                                      {locale === 'nl' ? 'Pagina' : 'Page'} {source.pageNumber}
                                    </span>
                                  )}
                                  <span className="ml-auto">
                                    {locale === 'nl' ? 'Relevantie' : 'Relevance'}: {(source.similarity * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>

                              {/* Open Document Button */}
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/files/${source.fileId}`);
                                    if (response.ok) {
                                      const data = await response.json();
                                      if (data.url) {
                                        window.open(data.url, '_blank');
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Error opening document:', error);
                                  }
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-base rounded-md transition-colors flex items-center justify-center gap-xs"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <span>
                                  {locale === 'nl' ? 'Open volledig document' : 'Open complete document'}
                                </span>
                              </button>
                            </div>
                          ))}

                          {/* Footer Info */}
                          <div className="border-t-2 border-gray-300 pt-sm mt-sm">
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-sm">
                              <div className="flex items-start gap-xs">
                                <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                <div className="flex-1">
                                  <p className="text-xs text-blue-700 font-semibold">
                                    {locale === 'nl' ? 'Geverifieerd antwoord' : 'Verified answer'}
                                  </p>
                                  <p className="text-xs text-blue-600 mt-1">
                                    {locale === 'nl'
                                      ? 'Bovenstaande antwoord combineert informatie uit de getoonde bronnen. Klik op "Open volledig document" om de informatie te verifiëren.'
                                      : 'The answer above combines information from the sources shown. Click "Open complete document" to verify the information.'
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* RAG Status Indicator */}
              {ragStatus && (
                <div className="flex justify-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-base py-sm shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-sm text-blue-700 font-medium">{ragStatus}</span>
                    </div>
                  </div>
                </div>
              )}

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

          <form id="chat-form" onSubmit={handleSubmit}>
            <div className="flex gap-sm items-center">
              {/* RAG Toggle Button - Always visible on the left */}
              {userProjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsRagEnabled(!isRagEnabled)}
                  disabled={isLoading || isRagLoading || (!!projectId && isRagEnabled)}
                  title={isRagEnabled ? t.ragOn : t.ragOff}
                  className={cn(
                    'px-3 py-sm rounded-lg text-xs font-bold transition-colors flex items-center gap-xs flex-shrink-0',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    isRagEnabled
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  )}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>RAG</span>
                </button>
              )}

              {/* Input Field */}
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

              {/* Project Selector - Only shown when RAG is enabled and NOT in project-specific mode */}
              {isRagEnabled && !projectId && (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={isLoading || isRagLoading}
                  className={cn(
                    'px-3 py-sm bg-white border border-gray-300 rounded-lg text-sm flex-shrink-0',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    'disabled:bg-gray-100 disabled:cursor-not-allowed'
                  )}
                >
                  {userProjects.length === 0 ? (
                    <option value="">{t.noProjects}</option>
                  ) : (
                    userProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))
                  )}
                </select>
              )}

              {/* Send/Stop Button */}
              {isLoading ? (
                <button
                  type="button"
                  onClick={stop}
                  className={cn(
                    'px-base py-sm bg-red-600 text-white rounded-lg flex-shrink-0',
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
                    'px-base py-sm bg-blue-600 text-white rounded-lg flex-shrink-0',
                    'text-sm font-medium hover:bg-blue-700',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500',
                    'disabled:bg-gray-300 disabled:cursor-not-allowed',
                    'transition-colors'
                  )}
                >
                  {t.sendButton}
                </button>
              )}
            </div>
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
