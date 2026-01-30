/**
 * Location Data Cache System
 *
 * Stores location data in localStorage with TTL to avoid redundant API calls.
 * Cache persists across page reloads and browser sessions.
 */

import type { UnifiedLocationData } from '../aggregator/multiLevelAggregator';
import type { AmenityMultiCategoryResponse } from '../sources/google-places/types';
import type { BuildingProgram } from '@/app/api/generate-building-program/route';
import { logger } from '@/shared/utils/logger';

/**
 * Cache entry structure
 */
interface CacheEntry {
  /** Unified location data */
  data: UnifiedLocationData;
  /** Amenities data */
  amenities: AmenityMultiCategoryResponse | null;
  /** AI-generated building program rapport (optional) */
  rapport?: BuildingProgram;
  /** Timestamp when rapport was generated */
  rapportGeneratedAt?: number;
  /** Timestamp when cached (milliseconds since epoch) */
  cachedAt: number;
  /** TTL in milliseconds */
  ttl: number;
  /** Original address used for lookup */
  address: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of cached entries */
  totalEntries: number;
  /** Number of valid (non-expired) entries */
  validEntries: number;
  /** Number of expired entries */
  expiredEntries: number;
  /** Total cache size in bytes (approximate) */
  cacheSize: number;
  /** List of cached addresses */
  cachedAddresses: string[];
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Cache key prefix */
  prefix: string;
  /** Default TTL in milliseconds (24 hours) */
  defaultTTL: number;
  /** Maximum cache size in bytes (5MB) */
  maxSize: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  prefix: 'grooshub_location_',
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 5 * 1024 * 1024, // 5MB
};

/**
 * Location Data Cache Manager
 */
export class LocationDataCache {
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Normalize address to create consistent cache key
   * Removes extra spaces, converts to lowercase, removes special characters
   */
  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s/g, '_'); // Spaces to underscores
  }

  /**
   * Generate cache key for an address
   */
  private getCacheKey(address: string): string {
    const normalized = this.normalizeAddress(address);
    return `${this.config.prefix}${normalized}`;
  }

  /**
   * Check if localStorage is available
   */
  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get cache entry for an address
   * Returns null if not found or expired
   */
  get(address: string): { data: UnifiedLocationData; amenities: AmenityMultiCategoryResponse | null; rapport?: BuildingProgram } | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    try {
      const key = this.getCacheKey(address);
      const cached = localStorage.getItem(key);

      if (!cached) {
        return null;
      }

      const entry: CacheEntry = JSON.parse(cached);
      const now = Date.now();

      // Check if expired
      if (now - entry.cachedAt > entry.ttl) {
        // Remove expired entry
        localStorage.removeItem(key);
        return null;
      }

      // Reconstruct Date objects that were serialized
      if (entry.data.fetchedAt) {
        entry.data.fetchedAt = new Date(entry.data.fetchedAt);
      }

      // Debug: Log safety data structure after reading from cache
      console.log('📦 [Cache GET] Safety data structure:', {
        hasNational: !!entry.data.safety?.national?.length,
        hasMunicipality: !!entry.data.safety?.municipality?.length,
        hasDistrict: !!entry.data.safety?.district?.length,
        hasNeighborhood: !!entry.data.safety?.neighborhood?.length,
        nationalCount: entry.data.safety?.national?.length || 0,
        municipalityCount: entry.data.safety?.municipality?.length || 0,
        districtCount: entry.data.safety?.district?.length || 0,
        neighborhoodCount: entry.data.safety?.neighborhood?.length || 0,
      });

      return {
        data: entry.data,
        amenities: entry.amenities,
        rapport: entry.rapport,
      };
    } catch (error) {
      logger.error('Failed to read from location cache', error);
      return null;
    }
  }

  /**
   * Store data in cache
   * Returns true if successful, false otherwise
   */
  set(
    address: string,
    data: UnifiedLocationData,
    amenities: AmenityMultiCategoryResponse | null,
    ttl?: number,
    rapport?: BuildingProgram
  ): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      const key = this.getCacheKey(address);

      // Debug: Log safety data structure before caching
      console.log('📦 [Cache SET] Safety data structure:', {
        hasNational: !!data.safety?.national?.length,
        hasMunicipality: !!data.safety?.municipality?.length,
        hasDistrict: !!data.safety?.district?.length,
        hasNeighborhood: !!data.safety?.neighborhood?.length,
        nationalCount: data.safety?.national?.length || 0,
        municipalityCount: data.safety?.municipality?.length || 0,
        districtCount: data.safety?.district?.length || 0,
        neighborhoodCount: data.safety?.neighborhood?.length || 0,
      });
      const entry: CacheEntry = {
        data,
        amenities,
        rapport,
        rapportGeneratedAt: rapport ? Date.now() : undefined,
        cachedAt: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        address,
      };

      const serialized = JSON.stringify(entry);

      // Check size
      if (serialized.length > this.config.maxSize) {
        logger.warn('Cache entry too large, not caching', { size: serialized.length });
        return false;
      }

      // Check total cache size and cleanup if needed
      const stats = this.getStats();
      if (stats.cacheSize + serialized.length > this.config.maxSize) {
        this.cleanupOldest();
      }

      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      logger.error('Failed to write to location cache', error);

      // If quota exceeded, try to cleanup and retry
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.cleanupOldest();
        try {
          const key = this.getCacheKey(address);
          const entry: CacheEntry = {
            data,
            amenities,
            rapport,
            rapportGeneratedAt: rapport ? Date.now() : undefined,
            cachedAt: Date.now(),
            ttl: ttl || this.config.defaultTTL,
            address,
          };
          localStorage.setItem(key, JSON.stringify(entry));
          return true;
        } catch {
          return false;
        }
      }

      return false;
    }
  }

  /**
   * Update only the rapport in an existing cache entry
   * Returns true if successful, false otherwise
   */
  setRapport(address: string, rapport: BuildingProgram): boolean {
    if (!this.isLocalStorageAvailable()) {
      return false;
    }

    try {
      const key = this.getCacheKey(address);
      const cached = localStorage.getItem(key);

      if (!cached) {
        logger.warn('No cache entry found for address, cannot set rapport');
        return false;
      }

      const entry: CacheEntry = JSON.parse(cached);
      entry.rapport = rapport;
      entry.rapportGeneratedAt = Date.now();

      const serialized = JSON.stringify(entry);

      // Check size
      if (serialized.length > this.config.maxSize) {
        logger.warn('Cache entry with rapport too large', { size: serialized.length });
        return false;
      }

      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      logger.error('Failed to update rapport in cache', error);
      return false;
    }
  }

  /**
   * Get only the rapport from cache
   * Returns null if not found or no rapport exists
   */
  getRapport(address: string): BuildingProgram | null {
    const cached = this.get(address);
    return cached?.rapport || null;
  }

  /**
   * Check if a rapport exists for an address
   */
  hasRapport(address: string): boolean {
    return this.getRapport(address) !== null;
  }

  /**
   * Remove entry from cache
   */
  remove(address: string): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      const key = this.getCacheKey(address);
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('Failed to remove from cache', error);
    }
  }

  /**
   * Clear all cached location data
   */
  clearAll(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter((key) => key.startsWith(this.config.prefix));

      cacheKeys.forEach((key) => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      logger.error('Failed to clear cache', error);
    }
  }

  /**
   * Remove expired entries from cache
   */
  cleanupExpired(): number {
    if (!this.isLocalStorageAvailable()) {
      return 0;
    }

    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter((key) => key.startsWith(this.config.prefix));
      let removed = 0;
      const now = Date.now();

      cacheKeys.forEach((key) => {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry: CacheEntry = JSON.parse(cached);
            if (now - entry.cachedAt > entry.ttl) {
              localStorage.removeItem(key);
              removed++;
            }
          }
        } catch {
          // Invalid entry, remove it
          localStorage.removeItem(key);
          removed++;
        }
      });

      return removed;
    } catch (error) {
      logger.error('Failed to cleanup cache', error);
      return 0;
    }
  }

  /**
   * Remove oldest entries to free up space
   */
  private cleanupOldest(count: number = 5): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter((key) => key.startsWith(this.config.prefix));

      // Get entries with their timestamps
      const entries: Array<{ key: string; cachedAt: number }> = [];

      cacheKeys.forEach((key) => {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry: CacheEntry = JSON.parse(cached);
            entries.push({ key, cachedAt: entry.cachedAt });
          }
        } catch {
          // Skip invalid entries
        }
      });

      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.cachedAt - b.cachedAt);

      // Remove oldest entries
      entries.slice(0, count).forEach(({ key }) => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      logger.error('Failed to cleanup oldest entries', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    if (!this.isLocalStorageAvailable()) {
      return {
        totalEntries: 0,
        validEntries: 0,
        expiredEntries: 0,
        cacheSize: 0,
        cachedAddresses: [],
      };
    }

    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter((key) => key.startsWith(this.config.prefix));

      let validEntries = 0;
      let expiredEntries = 0;
      let cacheSize = 0;
      const cachedAddresses: string[] = [];
      const now = Date.now();

      cacheKeys.forEach((key) => {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            cacheSize += cached.length;
            const entry: CacheEntry = JSON.parse(cached);

            if (now - entry.cachedAt > entry.ttl) {
              expiredEntries++;
            } else {
              validEntries++;
              cachedAddresses.push(entry.address);
            }
          }
        } catch {
          // Skip invalid entries
        }
      });

      return {
        totalEntries: cacheKeys.length,
        validEntries,
        expiredEntries,
        cacheSize,
        cachedAddresses,
      };
    } catch (error) {
      logger.error('Failed to get cache stats', error);
      return {
        totalEntries: 0,
        validEntries: 0,
        expiredEntries: 0,
        cacheSize: 0,
        cachedAddresses: [],
      };
    }
  }

  /**
   * Check if an address is cached and not expired
   */
  has(address: string): boolean {
    return this.get(address) !== null;
  }
}

// Export singleton instance
export const locationDataCache = new LocationDataCache();
