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
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Main 4-point star */}
      <path d="M12 3v18M3 12h18" />
      <path d="M12 3c0 4.97 4.03 9 9 9-4.97 0-9 4.03-9 9 0-4.97-4.03-9-9-9 4.97 0 9-4.03 9-9z" />
      {/* Small accent sparkles */}
      <circle cx="19" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="19" r="0.5" fill="currentColor" stroke="none" />
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

        // Animation container - use overflow-hidden to prevent layout issues
        'relative overflow-hidden',

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
      {/* Glow animation - subtle border glow */}
      {animationState === 'glow' && (
        <div
          className="absolute inset-0 rounded-full border-2 border-primary"
          style={{
            animation: 'pulse 2s ease-in-out infinite',
            boxShadow: '0 0 12px var(--color-primary)',
          }}
        />
      )}

      {/* Pulse animation - contained within bounds */}
      {animationState === 'pulse' && (
        <div
          className="absolute inset-1 rounded-full border-2 border-primary/50"
          style={{
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Processing animation - spinning border */}
      {animationState === 'processing' && (
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
          style={{ animation: 'spin 1s linear infinite' }}
        />
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
