'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to manage Projects Sidebar state
 * Persists collapsed state in localStorage
 * Also updates CSS custom property for modal positioning
 */
export function useProjectsSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('projectsSidebar:collapsed');
    if (stored !== null) {
      setIsCollapsed(stored === 'true');
    }
    setIsLoaded(true);
  }, []);

  // Save collapsed state to localStorage and update CSS custom property
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('projectsSidebar:collapsed', String(isCollapsed));
      // Update CSS custom property for modal positioning
      const sidebarWidth = isCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';
      document.documentElement.style.setProperty('--current-sidebar-width', sidebarWidth);
    }
  }, [isCollapsed, isLoaded]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => !prev);
  };

  return {
    isCollapsed,
    toggleSidebar,
    isLoaded
  };
}
