// Hook for managing selected doelgroepen with localStorage caching
// Automatically selects top 4 by R-rank when no selection exists

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PersonaScore } from '../utils/targetGroupScoring';

const STORAGE_KEY = 'grooshub_selected_doelgroepen';

/**
 * Get top N personas sorted by R-rank position
 */
function getTopNByRank(personas: PersonaScore[], n: number): string[] {
  return personas
    .sort((a, b) => a.rRankPosition - b.rRankPosition)
    .slice(0, n)
    .map(p => p.personaId);
}

/**
 * Load selected doelgroepen from localStorage
 */
function loadFromCache(): string[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.error('Failed to load selected doelgroepen from cache:', error);
    return null;
  }
}

/**
 * Save selected doelgroepen to localStorage
 */
function saveToCache(selectedIds: string[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
  } catch (error) {
    console.error('Failed to save selected doelgroepen to cache:', error);
  }
}

/**
 * Custom hook for managing selected doelgroepen with caching
 *
 * Features:
 * - Automatically selects top 4 by R-rank on initial load
 * - Persists selection to localStorage
 * - Reverts to top 4 when all selections are cleared
 * - Provides toggle and clear functions
 */
export function useSelectedDoelgroepen(personaScores: PersonaScore[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get top 4 by R-rank (memoized)
  const top4ByRank = useMemo(() => {
    if (personaScores.length === 0) return [];
    return getTopNByRank(personaScores, 4);
  }, [personaScores]);

  // Initialize from cache or default to top 4
  useEffect(() => {
    if (personaScores.length === 0) return;
    if (isInitialized) return;

    const cached = loadFromCache();

    if (cached && cached.length > 0) {
      // Validate that cached IDs still exist in current persona scores
      const validCached = cached.filter(id =>
        personaScores.some(p => p.personaId === id)
      );

      if (validCached.length > 0) {
        setSelectedIds(validCached);
      } else {
        // If cached IDs are invalid, use top 4
        setSelectedIds(top4ByRank);
        saveToCache(top4ByRank);
      }
    } else {
      // No cache, use top 4
      setSelectedIds(top4ByRank);
      saveToCache(top4ByRank);
    }

    setIsInitialized(true);
  }, [personaScores, top4ByRank, isInitialized]);

  // Toggle selection of a doelgroep
  const toggleSelection = useCallback((personaId: string) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(personaId);
      let newSelection: string[];

      if (isSelected) {
        // Remove from selection
        newSelection = prev.filter(id => id !== personaId);

        // If all removed, revert to top 4
        if (newSelection.length === 0) {
          newSelection = top4ByRank;
        }
      } else {
        // Add to selection (limit to max 27 since we have 3x3x3 cubes)
        if (prev.length < 27) {
          newSelection = [...prev, personaId];
        } else {
          newSelection = prev; // Don't add if at max
        }
      }

      saveToCache(newSelection);
      return newSelection;
    });
  }, [top4ByRank]);

  // Clear all selections (reverts to top 4)
  const clearSelection = useCallback(() => {
    setSelectedIds(top4ByRank);
    saveToCache(top4ByRank);
  }, [top4ByRank]);

  // Check if a persona is selected
  const isSelected = useCallback((personaId: string) => {
    return selectedIds.includes(personaId);
  }, [selectedIds]);

  // Check if current selection is the default (top 4)
  const isDefaultSelection = useMemo(() => {
    if (selectedIds.length !== top4ByRank.length) return false;
    return top4ByRank.every(id => selectedIds.includes(id));
  }, [selectedIds, top4ByRank]);

  return {
    selectedIds,
    toggleSelection,
    clearSelection,
    isSelected,
    isDefaultSelection,
    top4ByRank,
    isInitialized,
  };
}
