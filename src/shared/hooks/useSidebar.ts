// src/shared/hooks/useSidebar.ts
'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseSidebarOptions {
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  
  /** Persist state in localStorage */
  persistState?: boolean;
  
  /** Key for localStorage persistence */
  storageKey?: string;
  
  /** Automatically collapse on mobile */
  autoCollapseMobile?: boolean;
  
  /** Mobile breakpoint in pixels */
  mobileBreakpoint?: number;
}

interface UseSidebarReturn {
  /** Whether the sidebar is collapsed */
  isCollapsed: boolean;
  
  /** Toggle the sidebar state */
  toggle: () => void;
  
  /** Explicitly set collapsed state */
  setCollapsed: (collapsed: boolean) => void;
  
  /** Whether we're on mobile */
  isMobile: boolean;
}

/**
 * Hook for managing sidebar state with persistence and responsive behavior
 */
export function useSidebar({
  defaultCollapsed = false,
  persistState = true,
  storageKey = 'sidebar-collapsed',
  autoCollapseMobile = true,
  mobileBreakpoint = 768,
}: UseSidebarOptions = {}): UseSidebarReturn {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    // Server-side rendering safe initial state
    if (typeof window === 'undefined') {
      return defaultCollapsed;
    }
    
    // Try to get from localStorage if persistence is enabled
    if (persistState) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored !== null) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.warn('Failed to parse sidebar state from localStorage:', error);
      }
    }
    
    return defaultCollapsed;
  });

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth < mobileBreakpoint;
  });

  // Handle window resize for mobile detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const mobile = window.innerWidth < mobileBreakpoint;
      setIsMobile(mobile);
      
      // Auto-collapse on mobile if enabled
      if (autoCollapseMobile && mobile && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileBreakpoint, autoCollapseMobile, isCollapsed]);

  // Persist state to localStorage
  useEffect(() => {
    if (persistState && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(isCollapsed));
      } catch (error) {
        console.warn('Failed to save sidebar state to localStorage:', error);
      }
    }
  }, [isCollapsed, persistState, storageKey]);

  const toggle = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed);
  }, []);

  return {
    isCollapsed,
    toggle,
    setCollapsed,
    isMobile,
  };
}