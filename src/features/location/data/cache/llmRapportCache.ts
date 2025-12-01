/**
 * Cache manager for LLM-generated rapport data
 * Stores AI-generated building programs in localStorage for persistence
 */

import type { LLMRapportData } from '../../types/saved-locations';

const CACHE_KEY_PREFIX = 'grooshub_llm_rapport';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface CachedLLMRapport {
  data: LLMRapportData;
  address: string;
  timestamp: number;
}

class LLMRapportCache {
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
   * Generate cache key for a specific address
   */
  private getCacheKey(address: string): string {
    // Normalize address for consistent cache keys
    const normalized = address.toLowerCase().trim().replace(/\s+/g, '-');
    return `${CACHE_KEY_PREFIX}_${normalized}`;
  }

  /**
   * Get cached LLM rapport for a specific address
   */
  get(address: string): LLMRapportData | null {
    if (!this.isLocalStorageAvailable() || !address) {
      return null;
    }

    try {
      const cacheKey = this.getCacheKey(address);
      const cached = localStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      const rapport: CachedLLMRapport = JSON.parse(cached);

      // Check if cache has expired
      if (Date.now() - rapport.timestamp > CACHE_TTL) {
        this.clear(address);
        return null;
      }

      return rapport.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get cached rapport for current address (from localStorage)
   */
  getCurrentRapport(): LLMRapportData | null {
    const currentAddress = localStorage.getItem('grooshub_current_address');
    if (!currentAddress) {
      return null;
    }
    return this.get(currentAddress);
  }

  /**
   * Save LLM rapport to cache
   */
  set(address: string, rapportData: LLMRapportData): boolean {
    if (!this.isLocalStorageAvailable() || !address) {
      return false;
    }

    try {
      const cacheKey = this.getCacheKey(address);
      const cacheData: CachedLLMRapport = {
        data: rapportData,
        address,
        timestamp: Date.now()
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear cached rapport for a specific address
   */
  clear(address: string): void {
    if (!this.isLocalStorageAvailable() || !address) {
      return;
    }

    try {
      const cacheKey = this.getCacheKey(address);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Clear all LLM rapport caches
   */
  clearAll(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      // Find all keys with the rapport prefix
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Check if rapport exists for a specific address
   */
  has(address: string): boolean {
    return this.get(address) !== null;
  }

  /**
   * Check if rapport exists for current address
   */
  hasCurrentRapport(): boolean {
    return this.getCurrentRapport() !== null;
  }
}

// Export singleton instance
export const llmRapportCache = new LLMRapportCache();
