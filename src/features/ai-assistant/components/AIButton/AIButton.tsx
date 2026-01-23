'use client';

/**
 * AI Button Component
 *
 * Floating button (bottom-right) that opens the AI assistant panel.
 * Features:
 * - Line drawing sparkle icon
 * - Animated glowing border when AI has suggestions
 * - Smooth hover and click interactions
 */

import React from 'react';
import { cn } from '@/shared/utils/cn';
import type { AIButtonAnimationState, AIButtonProps } from '../../types/components';

// ============================================
// Sparkle Icon Component
// ============================================

interface SparkleIconProps {
  className?: string;
  size?: number;
}

function SparkleIcon({ className, size = 24 }: SparkleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      {/* Main 4-point star sparkle */}
      <path d="M12 1C12 1 12 8.5 12 8.5C12 8.5 15.5 12 22 12C15.5 12 12 15.5 12 22C12 15.5 8.5 12 2 12C8.5 12 12 8.5 12 1Z" />
      {/* Small accent sparkle top-right */}
      <circle cx="18" cy="4" r="1.5" />
      {/* Tiny sparkle bottom-left */}
      <circle cx="6" cy="18" r="1" />
    </svg>
  );
}

// ============================================
// AI Button Component
// ============================================

export function AIButton({
  animationState = 'idle',
  isOpen = false,
  onClick,
  className,
  visible = true,
}: AIButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open AI Assistant"
      aria-expanded={isOpen}
      style={{
        // Use inline styles for precise positioning to avoid any CSS conflicts
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
      }}
      className={cn(
        // Size and shape
        'w-14 h-14 rounded-full',
        'flex items-center justify-center',
        'transition-all duration-300 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',

        // Background and shadow
        'bg-white shadow-lg hover:shadow-xl',
        'border border-gray-200',

        // Hover state
        'hover:scale-105 hover:border-primary/30',

        // Open state
        isOpen && 'scale-95 bg-gray-50',

        // Animation container
        'relative overflow-visible',

        className
      )}
    >
      {/* Animated border ring */}
      <AnimatedBorder animationState={animationState} />

      {/* Icon */}
      <SparkleIcon
        size={26}
        className={cn(
          'text-gray-600 transition-colors duration-200',
          'group-hover:text-primary',
          isOpen && 'text-primary',
          animationState === 'glow' && 'text-primary',
          animationState === 'processing' && 'animate-pulse text-primary'
        )}
      />

      {/* Tooltip */}
      <span
        className={cn(
          'absolute bottom-full right-0 mb-2',
          'px-2 py-1 rounded text-xs font-medium',
          'bg-gray-900 text-white',
          'opacity-0 pointer-events-none transition-opacity duration-200',
          'group-hover:opacity-100',
          'whitespace-nowrap'
        )}
      >
        AI Assistant
      </span>
    </button>
  );
}

// ============================================
// Animated Border Component
// ============================================

interface AnimatedBorderProps {
  animationState: AIButtonAnimationState;
}

function AnimatedBorder({ animationState }: AnimatedBorderProps) {
  if (animationState === 'idle') return null;

  return (
    <>
      {/* Glow animation - rotating circular gradient */}
      {animationState === 'glow' && (
        <div
          className="absolute inset-[-2px] rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, var(--color-primary) 60deg, transparent 120deg)',
            animation: 'spin 2s linear infinite',
          }}
        >
          {/* Inner mask to create ring effect */}
          <div className="absolute inset-[2px] rounded-full bg-white" />
        </div>
      )}

      {/* Pulse animation - rotating ring */}
      {animationState === 'pulse' && (
        <div
          className="absolute inset-[-1px] rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, var(--color-primary) 90deg, transparent 180deg)',
            animation: 'spin 3s linear infinite',
            opacity: 0.5,
          }}
        >
          <div className="absolute inset-[2px] rounded-full bg-white" />
        </div>
      )}

      {/* Processing animation - fast spinning segment */}
      {animationState === 'processing' && (
        <div
          className="absolute inset-[-2px] rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, var(--color-primary) 30deg, transparent 60deg)',
            animation: 'spin 0.8s linear infinite',
          }}
        >
          <div className="absolute inset-[2px] rounded-full bg-white" />
        </div>
      )}
    </>
  );
}

// ============================================
// CSS Keyframes (add to globals.css or inline)
// ============================================

// Note: These animations should be in globals.css, but we define them inline for portability
const globalStyles = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined') {
  const styleId = 'ai-button-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = globalStyles;
    document.head.appendChild(style);
  }
}

// ============================================
// Exports
// ============================================

export default AIButton;
