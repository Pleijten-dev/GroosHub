/**
 * Cache manager for PVE (Program van Eisen) custom configurations
 * Stores custom program allocations in localStorage for persistence
 */

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

const CACHE_KEY = 'grooshub_pve_custom_config';
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
      console.error('Error reading PVE config cache:', error);
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
      console.error('Error saving PVE config cache:', error);
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
      console.error('Error clearing PVE config cache:', error);
    }
  }

  /**
   * Check if cache exists and is valid
   */
  has(): boolean {
    return this.get() !== null;
  }
}

// Export singleton instance
export const pveConfigCache = new PVEConfigCache();
