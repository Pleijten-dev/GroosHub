/**
 * useElements Hook
 *
 * Fetches and manages LCA elements and layers for a project
 *
 * @module features/lca/hooks
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ElementWithLayers, CreateElementInput, CreateLayerInput, LayerWithMaterial } from '@/features/lca/types';

// ============================================
// TYPES
// ============================================

export interface UseElementsResult {
  /** List of elements with layers */
  elements: ElementWithLayers[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Error if fetch failed */
  error: string | null;
  /** Refetch elements */
  refetch: () => Promise<void>;
  /** Create a new element */
  createElement: (data: CreateElementInput) => Promise<ElementWithLayers>;
  /** Update an element */
  updateElement: (elementId: string, data: Partial<ElementWithLayers>) => Promise<void>;
  /** Delete an element */
  deleteElement: (elementId: string) => Promise<void>;
  /** Add a layer to an element */
  addLayer: (data: CreateLayerInput) => Promise<void>;
  /** Update a layer */
  updateLayer: (layerId: string, data: Partial<LayerWithMaterial>) => Promise<void>;
  /** Delete a layer */
  deleteLayer: (layerId: string) => Promise<void>;
  /** Reorder layers in an element */
  reorderLayers: (elementId: string, layerIds: string[]) => Promise<void>;
  /** Trigger recalculation */
  recalculate: () => Promise<void>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// HOOK
// ============================================

/**
 * Fetches and manages LCA elements for a project
 *
 * @param projectId - The project ID to fetch elements for
 *
 * @example
 * ```tsx
 * const {
 *   elements,
 *   isLoading,
 *   error,
 *   createElement,
 *   deleteElement,
 *   addLayer
 * } = useElements(projectId);
 * ```
 */
export function useElements(projectId: string | undefined): UseElementsResult {
  const [elements, setElements] = useState<ElementWithLayers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // FETCH ELEMENTS
  // ============================================

  const fetchElements = useCallback(async () => {
    if (!projectId) {
      setElements([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/lca/elements?project_id=${projectId}`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Not authenticated');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse<ElementWithLayers[]> = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to fetch elements');
      }

      setElements(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching elements:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchElements();
  }, [fetchElements]);

  // ============================================
  // ELEMENT OPERATIONS
  // ============================================

  const createElement = useCallback(async (data: CreateElementInput): Promise<ElementWithLayers> => {
    const response = await fetch('/api/lca/elements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result: ApiResponse<ElementWithLayers> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create element');
    }

    // Add to local state
    setElements((prev) => [...prev, result.data!]);
    return result.data;
  }, []);

  const updateElement = useCallback(async (elementId: string, data: Partial<ElementWithLayers>) => {
    const response = await fetch(`/api/lca/elements/${elementId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result: ApiResponse<ElementWithLayers> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to update element');
    }

    // Update local state
    setElements((prev) =>
      prev.map((el) =>
        el.id === elementId ? { ...el, ...result.data } : el
      )
    );
  }, []);

  const deleteElement = useCallback(async (elementId: string) => {
    const response = await fetch(`/api/lca/elements/${elementId}`, {
      method: 'DELETE',
    });

    const result: ApiResponse<null> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete element');
    }

    // Remove from local state
    setElements((prev) => prev.filter((el) => el.id !== elementId));
  }, []);

  // ============================================
  // LAYER OPERATIONS
  // ============================================

  const addLayer = useCallback(async (data: CreateLayerInput) => {
    const response = await fetch('/api/lca/layers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result: ApiResponse<LayerWithMaterial> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to add layer');
    }

    // Add layer to the element in local state
    setElements((prev) =>
      prev.map((el) =>
        el.id === data.element_id
          ? { ...el, layers: [...el.layers, result.data!] }
          : el
      )
    );
  }, []);

  const updateLayer = useCallback(async (layerId: string, data: Partial<LayerWithMaterial>) => {
    const response = await fetch(`/api/lca/layers/${layerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result: ApiResponse<LayerWithMaterial> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to update layer');
    }

    // Update layer in local state
    setElements((prev) =>
      prev.map((el) => ({
        ...el,
        layers: el.layers.map((layer) =>
          layer.id === layerId ? { ...layer, ...result.data } : layer
        ),
      }))
    );
  }, []);

  const deleteLayer = useCallback(async (layerId: string) => {
    const response = await fetch(`/api/lca/layers/${layerId}`, {
      method: 'DELETE',
    });

    const result: ApiResponse<null> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete layer');
    }

    // Remove layer from local state
    setElements((prev) =>
      prev.map((el) => ({
        ...el,
        layers: el.layers.filter((layer) => layer.id !== layerId),
      }))
    );
  }, []);

  const reorderLayers = useCallback(async (elementId: string, layerIds: string[]) => {
    const response = await fetch('/api/lca/layers/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ element_id: elementId, layer_ids: layerIds }),
    });

    const result: ApiResponse<LayerWithMaterial[]> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to reorder layers');
    }

    // Update layers in local state
    setElements((prev) =>
      prev.map((el) =>
        el.id === elementId ? { ...el, layers: result.data! } : el
      )
    );
  }, []);

  // ============================================
  // RECALCULATION
  // ============================================

  const recalculate = useCallback(async () => {
    if (!projectId) return;

    try {
      // Trigger server-side recalculation
      await fetch('/api/lca/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId }),
      });

      // Refetch elements to get updated totals
      await fetchElements();
    } catch (err) {
      console.error('Error recalculating:', err);
    }
  }, [projectId, fetchElements]);

  // ============================================
  // RETURN
  // ============================================

  return {
    elements,
    isLoading,
    error,
    refetch: fetchElements,
    createElement,
    updateElement,
    deleteElement,
    addLayer,
    updateLayer,
    deleteLayer,
    reorderLayers,
    recalculate,
  };
}

export default useElements;
