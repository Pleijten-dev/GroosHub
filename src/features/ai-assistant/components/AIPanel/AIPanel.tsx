'use client';

/**
 * AI Panel Component
 *
 * Slide-out panel (from right) that provides contextual AI assistance.
 * Features:
 * - Context-aware header showing current page
 * - Quick action buttons
 * - Mini chat interface
 * - Smooth slide animation
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/shared/utils/cn';
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

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
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
// Mini Chat Input
// ============================================

interface MiniChatInputProps {
  placeholder?: string;
  onSend: (message: string) => Promise<void>;
  isProcessing?: boolean;
}

function MiniChatInput({ placeholder, onSend, isProcessing }: MiniChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const message = input.trim();
    setInput('');
    await onSend(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-200">
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Ask about this page...'}
          disabled={isProcessing}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-lg px-3 py-2',
            'border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary',
            'text-sm placeholder:text-gray-400',
            'outline-none transition-all',
            isProcessing && 'opacity-50'
          )}
        />
        <button
          type="submit"
          disabled={!input.trim() || isProcessing}
          className={cn(
            'p-2 rounded-lg transition-all',
            'bg-primary text-white',
            'hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isProcessing ? (
            <span className="animate-spin inline-block w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full" />
          ) : (
            <SendIcon />
          )}
        </button>
      </div>
    </form>
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
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSendMessage = async (message: string) => {
    setIsProcessing(true);

    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: message,
      timestamp: new Date(),
    }]);

    try {
      // TODO: Integrate with actual AI chat API
      // For now, simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000));

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I understand you want to know about this. Let me help you with that.',
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

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
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="AI Assistant Panel"
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50',
          'w-full max-w-md',
          'bg-white shadow-2xl',
          'flex flex-col',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
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
                    {messages.slice(-4).map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          'text-sm rounded-lg p-3',
                          msg.role === 'user'
                            ? 'bg-primary/10 ml-8'
                            : 'bg-gray-100 mr-8'
                        )}
                      >
                        {msg.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {panelState === 'chat' && (
            <div className="p-4">
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'text-sm rounded-lg p-3',
                      msg.role === 'user'
                        ? 'bg-primary/10 ml-8'
                        : 'bg-gray-100 mr-8'
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat input */}
        <MiniChatInput
          placeholder={`Ask about this ${feature}...`}
          onSend={handleSendMessage}
          isProcessing={isProcessing}
        />
      </div>
    </>
  );
}

export default AIPanel;
