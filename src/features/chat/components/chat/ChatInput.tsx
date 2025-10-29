// Chat input component
'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder: string;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  isLoading,
  placeholder,
  disabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;

    onSend(input);
    setInput('');
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
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="flex w-full gap-2 p-4">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        rows={1}
        className={cn(
          'flex-1 resize-none rounded-lg border bg-bg-primary px-4 py-3',
          'focus:outline-none focus:ring-2 focus:ring-color-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'max-h-32 overflow-y-auto'
        )}
      />

      <button
        type="submit"
        disabled={!input.trim() || isLoading || disabled}
        className={cn(
          'flex h-auto items-center justify-center rounded-lg bg-color-primary px-6 py-3',
          'text-white transition-colors',
          'hover:bg-color-primary-hover',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {isLoading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <span>Send</span>
        )}
      </button>
    </form>
  );
}
