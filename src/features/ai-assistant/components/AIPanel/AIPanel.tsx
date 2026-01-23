'use client';

/**
 * AI Panel Component
 *
 * Slide-out panel (from right) that provides contextual AI assistance.
 * Features:
 * - Context-aware header showing current page
 * - Quick action buttons
 * - Mini chat interface using the SAME chat infrastructure as the main AI assistant
 * - Smooth slide animation
 *
 * IMPORTANT: This panel uses the same useChat hook and /api/chat endpoint
 * as the main AI assistant, ensuring identical tooling, memory, and behavior.
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
  onClick: () => void;
}

function QuickActionButton({ action, onClick }: QuickActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading || action.available === false) return;

    setIsLoading(true);
    try {
      await action.handler();
    } finally {
      setIsLoading(false);
    }
  };

  // Map icon names to simple representations
  const iconMap: Record<string, string> = {
    'tasks': '\u{1F4CB}',      // Clipboard
    'users': '\u{1F465}',      // People
    'location': '\u{1F4CD}',   // Pin
    'document': '\u{1F4C4}',   // Document
    'chart': '\u{1F4CA}',      // Chart
    'check': '\u{2705}',       // Check mark
    'alert': '\u{26A0}',       // Warning
    'target': '\u{1F3AF}',     // Target
    'search': '\u{1F50D}',     // Search
    'help': '\u{2753}',        // Question mark
  };

  const icon = iconMap[action.icon] || '\u{2728}'; // Default sparkle

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading || action.available === false}
      className={cn(
        'w-full px-4 py-3 rounded-lg text-left',
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
      <span className="text-xl" role="img" aria-hidden="true">
        {isLoading ? '\u{23F3}' : icon}
      </span>
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
            <span className="text-lg" role="img" aria-hidden="true">\u{2728}</span>
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
  const panelRef = useRef<HTMLDivElement>(null);

  // Use the SAME useChat hook as the main AI assistant
  // This ensures identical tooling, memory, and behavior
  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
  } = useChat();

  const isProcessing = status === 'streaming' || status === 'submitted';

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

  // Clear messages when panel closes
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
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
                        onClick={() => action.handler()}
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

          {/* Streaming indicator */}
          {isProcessing && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>AI is thinking...</span>
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
