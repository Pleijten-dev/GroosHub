/**
 * Cache manager for PVE (Program van Eisen) custom configurations
 * Stores custom program allocations in localStorage for persistence
 */

import { logger } from '@/shared/utils/logger';

export interface PVEAllocations {
  apartments: number;
  commercial: number;
  hospitality: number;
  social: number;
  communal: number;
  offices: number;
}

export interface PVECachedConfig {
  totalM2: number;
  percentages: PVEAllocations;
  disabledCategories: string[];
  lockedCategories: string[];
  timestamp: number;
}

export interface PVEFinalState {
  totalM2: number;
  percentages: PVEAllocations;
  timestamp: number;
}

const CACHE_KEY = 'grooshub_pve_custom_config';
const FINAL_PVE_CACHE_KEY = 'grooshub_pve_final_state';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

class PVEConfigCache {
  /**
   * Check if localStorage is available
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cached custom PVE configuration
   */
  get(): PVECachedConfig | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        return null;
      }

      const config: PVECachedConfig = JSON.parse(cached);

      // Check if cache has expired
      if (Date.now() - config.timestamp > CACHE_TTL) {
        this.clear();
        return null;
      }

      return config;
    } catch (error) {
      logger.error('Failed to read PVE config cache', error);
      return null;
    }
  }

  /**
   * Save custom PVE configuration to cache
   */
  set(config: Omit<PVECachedConfig, 'timestamp'>): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      const cacheData: PVECachedConfig = {
        ...config,
        timestamp: Date.now()
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      logger.error('Failed to save PVE config cache', error);
      return false;
    }
  }

  /**
   * Clear cached PVE configuration
   */
  clear(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
      logger.error('Failed to clear PVE config cache', error);
    }
  }

  /**
   * Check if cache exists and is valid
   */
  has(): boolean {
    return this.get() !== null;
  }

  /**
   * Get final PVE state (last shown configuration)
   */
  getFinalPVE(): PVEFinalState | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    try {
      const cached = localStorage.getItem(FINAL_PVE_CACHE_KEY);
      if (!cached) {
        return null;
      }

      const state: PVEFinalState = JSON.parse(cached);

      // Check if cache has expired
      if (Date.now() - state.timestamp > CACHE_TTL) {
        this.clearFinalPVE();
        return null;
      }

      return state;
    } catch (error) {
      logger.error('Failed to read final PVE state', error);
      return null;
    }
  }

  /**
   * Save final PVE state (current configuration snapshot)
   */
  setFinalPVE(state: Omit<PVEFinalState, 'timestamp'>): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      const cacheData: PVEFinalState = {
        ...state,
        timestamp: Date.now()
      };

      localStorage.setItem(FINAL_PVE_CACHE_KEY, JSON.stringify(cacheData));

      return true;
    } catch (error) {
      logger.error('Failed to save final PVE state', error);
      return false;
    }
  }

  /**
   * Clear final PVE state
   */
  clearFinalPVE(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(FINAL_PVE_CACHE_KEY);
    } catch (error) {
      logger.error('Failed to clear final PVE state', error);
    }
  }

  /**
   * Check if final PVE state exists and is valid
   */
  hasFinalPVE(): boolean {
    return this.getFinalPVE() !== null;
  }
}

// Export singleton instance
export const pveConfigCache = new PVEConfigCache();
