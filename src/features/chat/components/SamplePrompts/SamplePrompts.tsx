/**
 * SamplePrompts Component
 *
 * Displays a grid of sample prompt cards that users can click
 * to start a new chat conversation.
 *
 * Features:
 * - 2x2 grid of prompt cards
 * - Random selection from larger set
 * - Category icons
 * - Hover effects
 * - Click to start new chat
 */

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/shared/utils/cn';
import { getRandomPrompts, CATEGORY_META } from '../../config/samplePrompts';

// ============================================================================
// Types
// ============================================================================

export interface SamplePromptsProps {
  /** Called when a prompt is selected */
  onSelectPrompt: (prompt: string) => void;
  /** Current locale */
  locale: 'nl' | 'en';
  /** Number of prompts to display */
  count?: number;
  /** Additional class names */
  className?: string;
  /** Refresh prompts when this key changes */
  refreshKey?: number;
}

interface PromptItem {
  id: string;
  category: string;
  icon: string;
  text: string;
}

// ============================================================================
// Icons
// ============================================================================

const Icons: Record<string, React.FC<{ className?: string }>> = {
  MapPin: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  CheckSquare: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  FileText: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Sparkles: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  BarChart: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Building: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Users: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Calendar: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
};

// ============================================================================
// Helpers
// ============================================================================

function getCategoryColor(category: string): { bg: string; text: string; border: string } {
  switch (category) {
    case 'location':
      return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
    case 'tasks':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case 'documents':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'general':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  }
}

// ============================================================================
// Component
// ============================================================================

export function SamplePrompts({
  onSelectPrompt,
  locale,
  count = 4,
  className,
  refreshKey,
}: SamplePromptsProps) {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate random prompts on mount and when refreshKey changes
  useEffect(() => {
    setIsLoading(true);
    // Small delay to show loading state for smoother transitions
    const timer = setTimeout(() => {
      setPrompts(getRandomPrompts(locale, count));
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [locale, count, refreshKey]);

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 gap-base', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-100 rounded-lg p-base animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 gap-base', className)}>
      {prompts.map((prompt) => {
        const Icon = Icons[prompt.icon] || Icons.Sparkles;
        const colors = getCategoryColor(prompt.category);
        const categoryMeta = CATEGORY_META[prompt.category as keyof typeof CATEGORY_META]?.[locale];

        return (
          <button
            key={prompt.id}
            type="button"
            onClick={() => onSelectPrompt(prompt.text)}
            className={cn(
              'group relative text-left p-base rounded-lg border transition-all duration-200',
              'hover:shadow-md hover:-translate-y-0.5',
              'bg-white border-gray-200 hover:border-gray-300',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
          >
            {/* Category badge */}
            <div className="flex items-center gap-2 mb-sm">
              <div className={cn('p-1.5 rounded-md', colors.bg)}>
                <Icon className={cn('w-4 h-4', colors.text)} />
              </div>
              {categoryMeta && (
                <span className={cn('text-xs font-medium', colors.text)}>
                  {categoryMeta.label}
                </span>
              )}
            </div>

            {/* Prompt text */}
            <p className="text-sm text-gray-700 line-clamp-2 group-hover:text-gray-900 transition-colors">
              {prompt.text}
            </p>

            {/* Arrow indicator on hover */}
            <div className="absolute bottom-base right-base opacity-0 group-hover:opacity-100 transition-opacity">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}

SamplePrompts.displayName = 'SamplePrompts';

export default SamplePrompts;
