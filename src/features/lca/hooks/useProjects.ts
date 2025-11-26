/**
 * useProjects Hook
 *
 * Fetches and manages LCA projects for the current user
 *
 * @module features/lca/hooks
 */

'use client';

import { useState, useEffect } from 'react';
import type { LCAProject } from '@/features/lca/types';

// ============================================
// TYPES
// ============================================

export interface UseProjectsResult {
  /** List of projects */
  projects: LCAProject[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error if fetch failed */
  error: string | null;
  /** Refetch projects */
  refetch: () => void;
}

interface ApiResponse {
  success: boolean;
  data?: LCAProject[];
  error?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
}

// ============================================
// HOOK
// ============================================

/**
 * Fetches LCA projects for the authenticated user
 *
 * @example
 * ```tsx
 * const { projects, isLoading, error, refetch } = useProjects();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * return <ProjectList projects={projects} />;
 * ```
 */
export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<LCAProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/lca/projects');

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Not authenticated');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to fetch projects');
      }

      setProjects(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    isLoading,
    error,
    refetch: fetchProjects,
  };
}

export default useProjects;
