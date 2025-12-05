'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to manage Projects Sidebar state
 * Persists collapsed state in localStorage
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

  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('projectsSidebar:collapsed', String(isCollapsed));
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
