/**
 * useWMSGrading Hook
 * Manages WMS grading for a location: checking status, triggering grading, polling progress
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WMSGradingData } from '@/features/location/types/wms-grading';

export interface UseWMSGradingOptions {
  /** Location snapshot ID */
  snapshotId?: string | null;
  /** Latitude of location */
  latitude?: number;
  /** Longitude of location */
  longitude?: number;
  /** Address of location */
  address?: string;
  /** Existing WMS grading data (if loaded from snapshot) */
  existingGradingData?: Record<string, unknown> | null;
  /** Auto-start grading if no data exists */
  autoGrade?: boolean;
  /** Poll interval in milliseconds */
  pollInterval?: number;
}

export interface UseWMSGradingReturn {
  /** WMS grading data */
  gradingData: WMSGradingData | null;
  /** Is grading currently in progress */
  isGrading: boolean;
  /** Grading progress (0-100) */
  progress: number;
  /** Number of layers completed */
  layersCompleted: number;
  /** Total layers to grade */
  layersTotal: number;
  /** Error message if grading failed */
  error: string | null;
  /** Manually trigger grading */
  startGrading: () => Promise<void>;
  /** Is critical grading complete (enables rapport generation) */
  isCriticalComplete: boolean;
}

export function useWMSGrading(options: UseWMSGradingOptions): UseWMSGradingReturn {
  const {
    snapshotId,
    latitude,
    longitude,
    address,
    existingGradingData,
    autoGrade = true,
    pollInterval = 5000
  } = options;

  const [gradingData, setGradingData] = useState<WMSGradingData | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [layersCompleted, setLayersCompleted] = useState(0);
  const [layersTotal, setLayersTotal] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [isCriticalComplete, setIsCriticalComplete] = useState(false);

  const gradingJobRef = useRef<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if existing grading data is valid
   */
  const hasValidGradingData = useCallback(() => {
    if (!existingGradingData) return false;

    // Check if it has the expected structure
    const data = existingGradingData as Partial<WMSGradingData>;
    return !!(data.layers && Object.keys(data.layers).length > 0);
  }, [existingGradingData]);

  /**
   * Start WMS grading
   */
  const startGrading = useCallback(async () => {
    if (!latitude || !longitude || !address) {
      setError('Missing location coordinates or address');
      return;
    }

    setIsGrading(true);
    setError(null);
    setProgress(0);
    setLayersCompleted(0);

    try {
      // If we have a snapshot ID, use the auto-grade endpoint
      if (snapshotId) {
        const response = await fetch(`/api/location/snapshots/${snapshotId}/grade-wms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });

        const result = await response.json();

        if (result.success && result.data) {
          setGradingData(result.data.snapshot.wms_grading_data);
          setProgress(100);
          setLayersCompleted(result.data.grading_statistics?.successful_layers || 0);
          setLayersTotal(result.data.grading_statistics?.total_layers || 25);
          setIsCriticalComplete(true);
        } else {
          setError(result.error || 'Grading failed');
        }
      } else {
        // No snapshot yet, grade directly
        const response = await fetch('/api/location/wms-grading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude,
            longitude,
            address
          })
        });

        const result = await response.json();

        if (result.success && result.data) {
          setGradingData(result.data);
          setProgress(100);
          setLayersCompleted(result.data.statistics?.successful_layers || 0);
          setLayersTotal(result.data.statistics?.total_layers || 25);
          setIsCriticalComplete(true);
        } else {
          setError(result.error || 'Grading failed');
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start grading');
    } finally {
      setIsGrading(false);
    }
  }, [snapshotId, latitude, longitude, address]);

  /**
   * Initialize grading data from existing data or auto-start
   */
  useEffect(() => {
    // If we have existing valid grading data, use it
    if (hasValidGradingData()) {
      setGradingData(existingGradingData as WMSGradingData);
      setIsCriticalComplete(true);
      setProgress(100);

      // Count successful layers
      const data = existingGradingData as WMSGradingData;
      const successful = Object.values(data.layers).filter(
        layer => layer.point_sample || layer.average_area_sample || layer.max_area_sample
      ).length;
      setLayersCompleted(successful);
      setLayersTotal(Object.keys(data.layers).length);

      return;
    }

    // Auto-start grading if enabled and we have the required data
    if (autoGrade && latitude && longitude && address && !isGrading) {
      // Delay slightly to avoid starting grading immediately on page load
      const timer = setTimeout(() => {
        startGrading();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [existingGradingData, hasValidGradingData, autoGrade, latitude, longitude, address, isGrading, startGrading]);

  /**
   * Cleanup poll timer
   */
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  return {
    gradingData,
    isGrading,
    progress,
    layersCompleted,
    layersTotal,
    error,
    startGrading,
    isCriticalComplete
  };
}

export default useWMSGrading;
