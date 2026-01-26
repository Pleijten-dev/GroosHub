'use client';

/**
 * AI Panel Component
 *
 * Slide-out panel (from right) that provides contextual AI assistance.
 * Features:
 * - Context-aware header showing current page
 * - Quick action buttons that execute AI tools
 * - Mini chat interface for follow-up questions
 * - Smooth slide animation
 *
 * Uses the /api/ai-assistant/execute-tool endpoint for tool execution.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { cn } from '@/shared/utils/cn';
import { MessageInput } from '@/shared/components/UI/MessageInput';
import type {
  AIPanelProps,
  AIPanelState,
  QuickAction,
  AIContextData,
} from '../../types/components';
import type { CompactLocationExport } from '@/features/location/utils/jsonExportCompact';

// ============================================
// Icons
// ============================================

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}


// ============================================
// Helper: Extract text from UIMessage
// ============================================

/**
 * Extract text content from a Vercel AI SDK UIMessage
 * The message can have parts array or legacy content string
 */
function getMessageText(message: { parts?: Array<{ type: string; text?: string }>; content?: string }): string {
  // Check for parts array (Vercel AI SDK v5 format)
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter(part => part.type === 'text' && part.text)
      .map(part => part.text)
      .join('');
  }

  // Fallback to legacy content string
  if (typeof message.content === 'string') {
    return message.content;
  }

  return '';
}

// ============================================
// Quick Action Button
// ============================================

interface QuickActionButtonProps {
  action: QuickAction;
  onExecute: (action: QuickAction) => Promise<void>;
}

// Simple icon component using SVG
function ActionIcon({ name, className }: { name: string; className?: string }) {
  const iconClass = cn('w-4 h-4', className);

  // Simple line-drawing style icons
  const icons: Record<string, React.ReactNode> = {
    'tasks': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    'users': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="7" r="3" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <circle cx="17" cy="7" r="2" />
        <path d="M21 21v-1.5a2.5 2.5 0 0 0-2.5-2.5" />
      </svg>
    ),
    'document': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    'chart': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    'target': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    'search': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    'cube': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    'compare': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="4" x2="6" y2="20" />
        <circle cx="6" cy="4" r="2" />
        <circle cx="18" cy="20" r="2" />
      </svg>
    ),
    'summary': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="17" y1="10" x2="3" y2="10" />
        <line x1="21" y1="6" x2="3" y2="6" />
        <line x1="21" y1="14" x2="3" y2="14" />
        <line x1="17" y1="18" x2="3" y2="18" />
      </svg>
    ),
    'building': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="2" width="16" height="20" rx="1" />
        <line x1="9" y1="6" x2="9" y2="6.01" />
        <line x1="15" y1="6" x2="15" y2="6.01" />
        <line x1="9" y1="10" x2="9" y2="10.01" />
        <line x1="15" y1="10" x2="15" y2="10.01" />
        <line x1="9" y1="14" x2="9" y2="14.01" />
        <line x1="15" y1="14" x2="15" y2="14.01" />
        <path d="M9 22v-4h6v4" />
      </svg>
    ),
    'map': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
    'home': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    'money': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    'heart': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    'shield': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    'leaf': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 3v18" />
        <path d="M6 9a6 6 0 0 1 12 0c0 6-6 12-6 12" />
      </svg>
    ),
    'risk': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    'check': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    'location': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    'alert': (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  };

  return icons[name] || icons['document'];
}

// Loading spinner icon
function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('w-4 h-4 animate-spin', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function QuickActionButton({ action, onExecute }: QuickActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading || action.available === false) return;

    setIsLoading(true);
    try {
      await onExecute(action);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading || action.available === false}
      className={cn(
        'w-full px-3 py-2.5 rounded-lg text-left',
        'flex items-center gap-3',
        'transition-all duration-200',
        'border border-gray-200',

        action.available === false
          ? 'opacity-50 cursor-not-allowed bg-gray-50'
          : 'hover:border-primary/30 hover:bg-primary/5 cursor-pointer',

        action.isPrimary && 'border-primary/30 bg-primary/5',

        isLoading && 'opacity-70'
      )}
    >
      <div className="w-5 h-5 flex items-center justify-center text-gray-500">
        {isLoading ? <LoadingIcon /> : <ActionIcon name={action.icon} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 text-sm">
          {action.label}
        </div>
        {action.description && (
          <div className="text-xs text-gray-500 truncate">
            {action.description}
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================
// Panel Header
// ============================================

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

function PanelHeader({ title, subtitle, onClose, onBack, showBack }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
      <div className="flex items-center gap-2">
        {showBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1 -ml-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <BackIcon className="text-gray-500" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1C12 1 12 8.5 12 8.5C12 8.5 15.5 12 22 12C15.5 12 12 15.5 12 22C12 15.5 8.5 12 2 12C8.5 12 12 8.5 12 1Z" />
            </svg>
            <h2 className="font-semibold text-gray-900">{title}</h2>
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded hover:bg-gray-100 transition-colors"
        aria-label="Close panel"
      >
        <CloseIcon className="text-gray-500" />
      </button>
    </div>
  );
}

// ============================================
// Context Display
// ============================================

function ContextDisplay({ context }: { context: AIContextData }) {
  const getContextDescription = (): string | null => {
    if (context.currentView.location?.address) {
      return `Currently viewing: ${context.currentView.location.address}`;
    }
    if (context.currentView.project?.projectName) {
      return `Project: ${context.currentView.project.projectName}`;
    }
    return null;
  };

  const description = getContextDescription();
  if (!description) return null;

  return (
    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  );
}

// ============================================
// Main AI Panel Component
// ============================================

export function AIPanel({
  isOpen,
  onClose,
  context,
  quickActions,
  state = 'expanded',
  onStateChange,
  feature,
  projectId,
}: AIPanelProps) {
  const [panelState, setPanelState] = useState<AIPanelState>(state);
  const [panelChatId, setPanelChatId] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null); // Database chat ID
  const [isToolExecuting, setIsToolExecuting] = useState(false);
  const [currentToolId, setCurrentToolId] = useState<string | null>(null);
  const [toolResponse, setToolResponse] = useState<string>('');
  const panelRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use useChat for regular chat messages (fallback/follow-up)
  const {
    messages,
    sendMessage,
    status,
    stop: stopChat,
    setMessages,
  } = useChat();

  const isProcessing = status === 'streaming' || status === 'submitted' || isToolExecuting;

  // Stop both tool execution and chat
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsToolExecuting(false);
    stopChat();
  }, [stopChat]);

  // Create a chat session for this panel when opened
  useEffect(() => {
    const createPanelChat = async () => {
      if (isOpen && !panelChatId) {
        try {
          const response = await fetch('/api/chat/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              title: `AI Panel - ${feature}`,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            setPanelChatId(data.chatId);
          }
        } catch (error) {
          console.error('[AIPanel] Failed to create chat session:', error);
        }
      }
    };

    createPanelChat();
  }, [isOpen, panelChatId, projectId, feature]);

  // Clear messages and tool state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setToolResponse('');
      setCurrentToolId(null);
      setActiveChatId(null); // Reset database chat ID for fresh session
      // Optionally reset chat ID for a fresh session next time
      // setPanelChatId(null);
    }
  }, [isOpen, setMessages]);

  // Sync external state
  useEffect(() => {
    setPanelState(state);
  }, [state]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Don't close if clicking on the AI button
        const target = e.target as HTMLElement;
        if (target.closest('[aria-label="Open AI Assistant"]')) return;
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isProcessing) {
          stop();
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isProcessing, stop]);

  // Build context metadata for the AI
  const buildContextMetadata = useCallback(() => {
    const metadata: Record<string, unknown> = {
      chatId: panelChatId,
      projectId,
      source: 'ai_panel',
      feature,
    };

    // Add feature-specific context
    if (context.currentView.location?.address) {
      metadata.locationContext = {
        address: context.currentView.location.address,
        coordinates: context.currentView.location.coordinates,
      };
    }

    if (context.currentView.project) {
      metadata.projectContext = context.currentView.project;
    }

    return metadata;
  }, [panelChatId, projectId, feature, context]);

  // Send message using the REAL chat infrastructure
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isProcessing) return;

    // Send via the same useChat hook that powers the main AI assistant
    // This means all tools, memory, and capabilities are available
    sendMessage({
      text: message,
      metadata: buildContextMetadata(),
    });
  }, [isProcessing, sendMessage, buildContextMetadata]);

  const handleStateChange = (newState: AIPanelState) => {
    setPanelState(newState);
    onStateChange?.(newState);
  };

  // Execute an AI tool using the execute-tool endpoint
  const executeAITool = useCallback(async (toolId: string, customMessage?: string) => {
    // Get location data from context (use locationExport for full data, fallback to location view)
    const locationData = (context.locationExport || context.currentView.location) as CompactLocationExport | undefined;

    // Determine locale from URL or default to 'nl'
    const locale = (typeof window !== 'undefined' && window.location.pathname.startsWith('/en')) ? 'en' : 'nl';

    setIsToolExecuting(true);
    setCurrentToolId(toolId);
    setToolResponse('');

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/ai-assistant/execute-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          locationData: locationData || null,
          locale,
          customMessage,
          // Pass existing chat ID to continue conversation
          chatId: activeChatId,
          // Pass project ID to link chat to project (if viewing a saved snapshot)
          projectId: projectId || null,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Extract chat ID from response headers for subsequent requests
      const responseChatId = response.headers.get('X-Chat-Id');
      if (responseChatId && !activeChatId) {
        setActiveChatId(responseChatId);
        console.log(`[AIPanel] Chat created/continued: ${responseChatId}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Parse the streaming protocol (Vercel AI SDK format)
        // Each line is prefixed with a type indicator
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('0:')) {
            // Text chunk - parse JSON string
            try {
              const text = JSON.parse(line.slice(2));
              accumulatedText += text;
              setToolResponse(accumulatedText);
            } catch {
              // Not valid JSON, might be partial
            }
          }
          // Other prefixes (e, d, etc.) are metadata, ignore for now
        }
      }

      // Add the completed response to messages
      if (accumulatedText) {
        const userMessage = {
          id: `user-${Date.now()}`,
          role: 'user' as const,
          content: customMessage || `[Executed: ${toolId}]`,
          parts: [{ type: 'text' as const, text: customMessage || `[Executed: ${toolId}]` }],
        };
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant' as const,
          content: accumulatedText,
          parts: [{ type: 'text' as const, text: accumulatedText }],
        };
        setMessages(prev => [...prev, userMessage, assistantMessage]);
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[AIPanel] Tool execution cancelled');
      } else {
        console.error('[AIPanel] Tool execution error:', error);
        setToolResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsToolExecuting(false);
      setCurrentToolId(null);
      abortControllerRef.current = null;
    }
  }, [context, setMessages, activeChatId, projectId]);

  // Handle quick action execution - uses toolId or falls back to prompt/handler
  const handleQuickAction = useCallback(async (action: QuickAction) => {
    // If action has a toolId, execute the AI tool
    if (action.toolId) {
      await executeAITool(action.toolId);
      return;
    }

    // Legacy: If action has a prompt, send it to the chat
    if (action.prompt) {
      await handleSendMessage(action.prompt);
      return;
    }

    // Otherwise, run the handler if it exists
    if (action.handler) {
      await action.handler();
    }
  }, [executeAITool, handleSendMessage]);

  // Get title based on feature
  const getTitle = () => {
    switch (feature) {
      case 'location':
        return 'AI Assistant';
      case 'project':
        return 'AI Assistant';
      case 'task':
        return 'AI Assistant';
      case 'lca':
        return 'AI Assistant';
      default:
        return 'AI Assistant';
    }
  };

  return (
    <>

      {/* Panel - Compact size, positioned bottom-right above the button */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="AI Assistant Panel"
        style={{
          position: 'fixed',
          bottom: '5rem', // Above the AI button
          right: '1rem',
          zIndex: 9998,
          maxHeight: 'calc(100vh - 8rem)',
        }}
        className={cn(
          'w-80', // 320px - compact width
          'bg-white shadow-2xl rounded-xl',
          'flex flex-col',
          'transition-all duration-300 ease-out',
          'border border-gray-200',
          isOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        {/* Header */}
        <PanelHeader
          title={getTitle()}
          subtitle={context.currentView.location?.address || context.currentView.project?.projectName}
          onClose={onClose}
          showBack={panelState !== 'expanded'}
          onBack={() => handleStateChange('expanded')}
        />

        {/* Context indicator */}
        <ContextDisplay context={context} />

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {panelState === 'expanded' && (
            <>
              {/* Quick Actions */}
              {quickActions.length > 0 && (
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    {quickActions.map(action => (
                      <QuickActionButton
                        key={action.id}
                        action={action}
                        onExecute={handleQuickAction}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent messages in this session */}
              {messages.length > 0 && (
                <div className="px-4 pb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Recent
                  </h3>
                  <div className="space-y-3">
                    {messages.slice(-4).map((msg) => {
                      const text = getMessageText(msg);
                      if (!text) return null;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            'text-sm rounded-lg p-3',
                            msg.role === 'user'
                              ? 'bg-primary/10 ml-8'
                              : 'bg-gray-100 mr-8'
                          )}
                        >
                          {text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {panelState === 'chat' && (
            <div className="p-4">
              <div className="space-y-3">
                {messages.map((msg) => {
                  const text = getMessageText(msg);
                  if (!text) return null;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'text-sm rounded-lg p-3',
                        msg.role === 'user'
                          ? 'bg-primary/10 ml-8'
                          : 'bg-gray-100 mr-8'
                      )}
                    >
                      {text}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tool response while streaming */}
          {isToolExecuting && toolResponse && (
            <div className="px-4 pb-4">
              <div className="text-sm rounded-lg p-3 bg-gray-100 mr-8 whitespace-pre-wrap">
                {toolResponse}
              </div>
            </div>
          )}

          {/* Streaming indicator */}
          {isProcessing && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>{isToolExecuting ? 'AI is analyzing...' : 'AI is thinking...'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat input - using shared MessageInput without file/RAG features */}
        <MessageInput
          onSubmit={(message) => handleSendMessage(message)}
          placeholder={`Ask about this ${feature}...`}
          isLoading={isProcessing}
          onStop={stop}
          showFileAttachment={false}
          showRagToggle={false}
          className="border-t-0 rounded-b-xl"
        />
      </div>
    </>
  );
}

export default AIPanel;
