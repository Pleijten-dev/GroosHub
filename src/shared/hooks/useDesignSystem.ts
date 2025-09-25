// src/shared/hooks/useDesignSystem.ts
import { useCallback } from 'react';
import { cn } from '../utils/cn';

// Types for design system values
export type SpacingSize = 'xs' | 'sm' | 'md' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
export type ButtonSize = 'sm' | 'base' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ShadowLevel = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl';
export type RadiusSize = 'none' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | 'full';

// Design system constants for type safety and autocomplete
export const DESIGN_TOKENS = {
  spacing: {
    xs: 'var(--space-xs)',
    sm: 'var(--space-sm)', 
    md: 'var(--space-md)',
    base: 'var(--space-base)',
    lg: 'var(--space-lg)',
    xl: 'var(--space-xl)',
    '2xl': 'var(--space-2xl)',
    '3xl': 'var(--space-3xl)',
    '4xl': 'var(--space-4xl)',
  },
  colors: {
    primary: 'var(--color-primary)',
    'primary-hover': 'var(--color-primary-hover)',
    'primary-light': 'var(--color-primary-light)',
    secondary: 'var(--color-secondary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    info: 'var(--color-info)',
    // Text colors
    'text-primary': 'var(--text-primary)',
    'text-secondary': 'var(--text-secondary)',
    'text-muted': 'var(--text-muted)',
    'text-placeholder': 'var(--text-placeholder)',
    // Background colors  
    'bg-primary': 'var(--bg-primary)',
    'bg-secondary': 'var(--bg-secondary)',
    'bg-muted': 'var(--bg-muted)',
    // Support colors
    'support-blue': 'var(--support-blue)',
    'support-red': 'var(--support-red)',
    'support-brown': 'var(--support-brown)',
    'support-green': 'var(--support-green)',
    'support-yellow': 'var(--support-yellow)',
  },
  shadows: {
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    base: 'var(--shadow-base)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
    '2xl': 'var(--shadow-2xl)',
  },
  radius: {
    none: 'var(--radius-none)',
    sm: 'var(--radius-sm)',
    base: 'var(--radius-base)',
    md: 'var(--radius-md)', 
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    full: 'var(--radius-full)',
  },
  transitions: {
    fast: 'var(--duration-fast)',
    normal: 'var(--duration-normal)',
    slow: 'var(--duration-slow)',
  },
} as const;

// Component class name builders
export interface ComponentClassBuilders {
  // Button class builder
  button: (variant?: ButtonVariant, size?: ButtonSize, className?: string) => string;
  
  // Input class builder  
  input: (className?: string) => string;
  
  // Card class builder
  card: (hoverable?: boolean, className?: string) => string;
  
  // Navigation item class builder
  navItem: (active?: boolean, className?: string) => string;
  
  // Status indicator class builder
  status: (variant: ColorVariant, className?: string) => string;
  
  // Glass effect class builder
  glass: (strong?: boolean, className?: string) => string;
}

/**
 * Design System Hook
 * Provides consistent access to design tokens and component class builders
 */
export function useDesignSystem() {
  // Get CSS custom property value
  const getToken = useCallback((tokenPath: string): string => {
    if (typeof window !== 'undefined') {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(tokenPath)
        .trim();
    }
    return tokenPath; // Fallback for SSR
  }, []);

  // Get spacing value
  const spacing = useCallback((size: SpacingSize): string => {
    return DESIGN_TOKENS.spacing[size];
  }, []);

  // Get color value
  const color = useCallback((colorKey: keyof typeof DESIGN_TOKENS.colors): string => {
    return DESIGN_TOKENS.colors[colorKey];
  }, []);

  // Get shadow value
  const shadow = useCallback((level: ShadowLevel): string => {
    return DESIGN_TOKENS.shadows[level];
  }, []);

  // Get radius value
  const radius = useCallback((size: RadiusSize): string => {
    return DESIGN_TOKENS.radius[size];
  }, []);

  // Component class builders
  const classBuilders: ComponentClassBuilders = {
    // Button class builder
    button: (variant = 'primary', size = 'base', className = '') => {
      const baseClass = 'btn';
      const variantClass = `btn-${variant}`;
      const sizeClass = `btn-${size}`;
      return `${baseClass} ${variantClass} ${sizeClass} ${className}`.trim();
    },

    // Input class builder
    input: (className = '') => {
      return `input ${className}`.trim();
    },

    // Card class builder
    card: (hoverable = false, className = '') => {
      const baseClass = 'card';
      const hoverClass = hoverable ? 'card-hover' : '';
      return `${baseClass} ${hoverClass} ${className}`.trim();
    },

    // Navigation item class builder
    navItem: (active = false, className = '') => {
      const baseClass = 'nav-item';
      const activeClass = active ? 'nav-item-active' : '';
      return `${baseClass} ${activeClass} ${className}`.trim();
    },

    // Status indicator class builder
    status: (variant, className = '') => {
      const statusClass = `status-${variant}`;
      return `${statusClass} ${className}`.trim();
    },

    // Glass effect class builder
    glass: (strong = false, className = '') => {
      const baseClass = strong ? 'glass-strong' : 'glass';
      return `${baseClass} ${className}`.trim();
    },
  };

  // Utility functions
  const utils = {
    // Combine multiple class names safely using robust cn utility
    cn,

    // Get responsive spacing
    responsiveSpacing: (mobile: SpacingSize, desktop?: SpacingSize): string => {
      const mobileClass = `p-${mobile}`;
      const desktopClass = desktop ? `lg:p-${desktop}` : '';
      return `${mobileClass} ${desktopClass}`.trim();
    },

    // Get responsive text size
    responsiveText: (mobile: string, desktop?: string): string => {
      const mobileClass = `text-${mobile}`;
      const desktopClass = desktop ? `lg:text-${desktop}` : '';
      return `${mobileClass} ${desktopClass}`.trim();
    },

    // Focus ring utility
    focusRing: (color = 'primary'): string => {
      return `focus:outline-none focus:ring-2 focus:ring-${color} focus:ring-offset-2`;
    },

    // Transition utility
    transition: (property = 'all', duration: keyof typeof DESIGN_TOKENS.transitions = 'fast'): string => {
      return `transition-${property} duration-${duration} ease-out`;
    },
  };

  return {
    // Design tokens
    tokens: DESIGN_TOKENS,
    
    // Getter functions
    getToken,
    spacing,
    color,
    shadow,
    radius,
    
    // Component class builders
    classBuilders,
    
    // Utility functions
    utils,
  };
}

// Export individual token objects for convenience
export const { spacing, colors, shadows, radius } = DESIGN_TOKENS;

// Type exports
export type DesignSystemHook = ReturnType<typeof useDesignSystem>;

// Commonly used class combinations
export const COMMON_CLASSES = {
  // Layout
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  flexCol: 'flex flex-col',
  gridCenter: 'grid place-items-center',
  
  // Spacing
  section: 'py-2xl',
  container: 'container-custom mx-auto',
  
  // Interactions
  clickable: 'cursor-pointer select-none',
  disabled: 'opacity-60 cursor-not-allowed',
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  
  // Text
  textBalance: 'text-balance',
  textTruncate: 'truncate',
  
  // Scrolling
  customScrollbar: 'custom-scrollbar',
  
  // Glass effects (for your project's glass UI)
  glassPanel: 'glass shadow-lg',
  glassNav: 'glass-strong shadow-md',
} as const;