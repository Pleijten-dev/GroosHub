/**
 * Rapport Cache System
 *
 * Caches LLM-generated rapport data to avoid redundant API calls.
 * Uses localStorage for immediate caching and provides interface for database persistence.
 *
 * Cache Strategy:
 * - Key based on location hash + PVE configuration + locale
 * - Stores all 3 stage outputs + combined program
 * - TTL of 24 hours for local cache (data might change)
 * - Database snapshots are permanent until deleted
 */

import type { CompactLocationExport } from '../../utils/jsonExportCompact';
import type {
  Stage2Output,
  Stage3Output,
  StagedBuildingProgram,
} from '../../utils/stagedGenerationOrchestrator';
import type { Stage1Output } from '../../utils/stagedGenerationData';

// ============================================================================
// TYPES
// ============================================================================

export interface CachedRapportData {
  // Stage outputs
  stage1Output: Stage1Output;
  stage2Output: Stage2Output;
  stage3Output: Stage3Output;
  combinedProgram: StagedBuildingProgram;

  // Metadata
  inputHash: string;
  timestamp: number;
  locale: 'nl' | 'en';
  locationAddress: string;
  coordinates?: { lat: number; lon: number };

  // Cache version for migration
  version: number;
}

export interface RapportSnapshot {
  id: string;
  userId?: string;
  name: string;
  locationAddress: string;
  coordinates?: { lat: number; lon: number };
  rapportData: CachedRapportData;
  inputData: CompactLocationExport;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_VERSION = 1;
const CACHE_PREFIX = 'rapport_cache_';
const CACHE_INDEX_KEY = 'rapport_cache_index';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB max cache size

// ============================================================================
// HASH UTILITIES
// ============================================================================

/**
 * Generate a hash from the input data to create a unique cache key.
 * Uses relevant fields that would affect the LLM output.
 */
export function generateInputHash(
  data: CompactLocationExport,
  locale: 'nl' | 'en'
): string {
  // Include key factors that affect LLM output
  const hashInput = {
    location: data.metadata.location,
    coordinates: data.metadata.coordinates,
    pve: data.pve ? {
      totalM2: data.pve.totalM2,
      percentages: data.pve.percentages,
    } : null,
    scenarios: data.targetGroups.recommendedScenarios.map(s => ({
      name: s.name,
      personaNames: s.personaNames,
    })),
    locale,
  };

  // Simple hash function
  const str = JSON.stringify(hashInput);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${Math.abs(hash).toString(36)}_${locale}`;
}

/**
 * Generate a cache key from the input hash
 */
function getCacheKey(inputHash: string): string {
  return `${CACHE_PREFIX}${inputHash}`;
}

// ============================================================================
// LOCAL STORAGE CACHE
// ============================================================================

interface CacheEntry {
  data: CachedRapportData;
  expiresAt: number;
}

interface CacheIndex {
  entries: Array<{
    key: string;
    locationAddress: string;
    timestamp: number;
    size: number;
  }>;
  totalSize: number;
}

/**
 * Get cache index from localStorage
 */
function getCacheIndex(): CacheIndex {
  try {
    const indexStr = localStorage.getItem(CACHE_INDEX_KEY);
    if (indexStr) {
      return JSON.parse(indexStr);
    }
  } catch (e) {
    console.warn('[RapportCache] Failed to read cache index:', e);
  }
  return { entries: [], totalSize: 0 };
}

/**
 * Save cache index to localStorage
 */
function saveCacheIndex(index: CacheIndex): void {
  try {
    localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch (e) {
    console.warn('[RapportCache] Failed to save cache index:', e);
  }
}

/**
 * Clean up expired entries and enforce size limit
 */
function cleanupCache(): void {
  const index = getCacheIndex();
  const now = Date.now();
  const validEntries: typeof index.entries = [];
  let totalSize = 0;

  // Remove expired entries
  for (const entry of index.entries) {
    const cacheKey = getCacheKey(entry.key);
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed: CacheEntry = JSON.parse(stored);
        if (parsed.expiresAt > now) {
          validEntries.push(entry);
          totalSize += entry.size;
        } else {
          localStorage.removeItem(cacheKey);
          console.log(`[RapportCache] Removed expired entry: ${entry.locationAddress}`);
        }
      }
    } catch (e) {
      // Remove corrupted entries
      localStorage.removeItem(cacheKey);
    }
  }

  // Enforce size limit - remove oldest entries first
  validEntries.sort((a, b) => b.timestamp - a.timestamp);
  while (totalSize > MAX_CACHE_SIZE && validEntries.length > 1) {
    const oldest = validEntries.pop();
    if (oldest) {
      localStorage.removeItem(getCacheKey(oldest.key));
      totalSize -= oldest.size;
      console.log(`[RapportCache] Removed old entry to free space: ${oldest.locationAddress}`);
    }
  }

  saveCacheIndex({ entries: validEntries, totalSize });
}

/**
 * Save rapport data to local cache
 */
export function saveToLocalCache(
  inputHash: string,
  data: CachedRapportData,
  ttl: number = DEFAULT_TTL
): boolean {
  try {
    const cacheKey = getCacheKey(inputHash);
    const entry: CacheEntry = {
      data,
      expiresAt: Date.now() + ttl,
    };

    const entryStr = JSON.stringify(entry);
    const entrySize = entryStr.length;

    // Check if we have space
    const index = getCacheIndex();
    if (index.totalSize + entrySize > MAX_CACHE_SIZE) {
      cleanupCache();
    }

    // Save entry
    localStorage.setItem(cacheKey, entryStr);

    // Update index
    const updatedIndex = getCacheIndex();
    const existingIdx = updatedIndex.entries.findIndex(e => e.key === inputHash);
    const indexEntry = {
      key: inputHash,
      locationAddress: data.locationAddress,
      timestamp: data.timestamp,
      size: entrySize,
    };

    if (existingIdx >= 0) {
      updatedIndex.totalSize -= updatedIndex.entries[existingIdx].size;
      updatedIndex.entries[existingIdx] = indexEntry;
    } else {
      updatedIndex.entries.push(indexEntry);
    }
    updatedIndex.totalSize += entrySize;

    saveCacheIndex(updatedIndex);

    console.log(`[RapportCache] Saved to cache: ${data.locationAddress} (${(entrySize / 1024).toFixed(1)}KB)`);
    return true;
  } catch (e) {
    console.error('[RapportCache] Failed to save to cache:', e);
    return false;
  }
}

/**
 * Get rapport data from local cache
 */
export function getFromLocalCache(inputHash: string): CachedRapportData | null {
  try {
    const cacheKey = getCacheKey(inputHash);
    const stored = localStorage.getItem(cacheKey);

    if (!stored) {
      return null;
    }

    const entry: CacheEntry = JSON.parse(stored);

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      localStorage.removeItem(cacheKey);
      console.log('[RapportCache] Cache entry expired');
      return null;
    }

    // Check version compatibility
    if (entry.data.version !== CACHE_VERSION) {
      localStorage.removeItem(cacheKey);
      console.log('[RapportCache] Cache entry version mismatch');
      return null;
    }

    console.log(`[RapportCache] Cache hit: ${entry.data.locationAddress}`);
    return entry.data;
  } catch (e) {
    console.error('[RapportCache] Failed to read from cache:', e);
    return null;
  }
}

/**
 * Clear a specific cache entry
 */
export function clearCacheEntry(inputHash: string): void {
  const cacheKey = getCacheKey(inputHash);
  localStorage.removeItem(cacheKey);

  const index = getCacheIndex();
  const entryIdx = index.entries.findIndex(e => e.key === inputHash);
  if (entryIdx >= 0) {
    index.totalSize -= index.entries[entryIdx].size;
    index.entries.splice(entryIdx, 1);
    saveCacheIndex(index);
  }
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  const index = getCacheIndex();
  for (const entry of index.entries) {
    localStorage.removeItem(getCacheKey(entry.key));
  }
  saveCacheIndex({ entries: [], totalSize: 0 });
  console.log('[RapportCache] Cleared all cache entries');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entryCount: number;
  totalSize: number;
  entries: Array<{ locationAddress: string; timestamp: number; size: number }>;
} {
  const index = getCacheIndex();
  return {
    entryCount: index.entries.length,
    totalSize: index.totalSize,
    entries: index.entries.map(e => ({
      locationAddress: e.locationAddress,
      timestamp: e.timestamp,
      size: e.size,
    })),
  };
}

// ============================================================================
// RAPPORT CACHE CLASS
// ============================================================================

/**
 * Main cache class for rapport data
 */
export class RapportCache {
  private locale: 'nl' | 'en';

  constructor(locale: 'nl' | 'en' = 'nl') {
    this.locale = locale;
  }

  /**
   * Check if rapport data is cached for the given input
   */
  isCached(inputData: CompactLocationExport): boolean {
    const hash = generateInputHash(inputData, this.locale);
    const cached = getFromLocalCache(hash);
    return cached !== null;
  }

  /**
   * Get cached rapport data if available
   */
  get(inputData: CompactLocationExport): CachedRapportData | null {
    const hash = generateInputHash(inputData, this.locale);
    return getFromLocalCache(hash);
  }

  /**
   * Save rapport data to cache
   */
  save(
    inputData: CompactLocationExport,
    stage1Output: Stage1Output,
    stage2Output: Stage2Output,
    stage3Output: Stage3Output,
    combinedProgram: StagedBuildingProgram
  ): boolean {
    const hash = generateInputHash(inputData, this.locale);

    const cachedData: CachedRapportData = {
      stage1Output,
      stage2Output,
      stage3Output,
      combinedProgram,
      inputHash: hash,
      timestamp: Date.now(),
      locale: this.locale,
      locationAddress: inputData.metadata.location,
      coordinates: inputData.metadata.coordinates,
      version: CACHE_VERSION,
    };

    return saveToLocalCache(hash, cachedData);
  }

  /**
   * Clear cache for specific input data
   */
  clear(inputData: CompactLocationExport): void {
    const hash = generateInputHash(inputData, this.locale);
    clearCacheEntry(hash);
  }

  /**
   * Clear all cached rapport data
   */
  clearAll(): void {
    clearAllCache();
  }

  /**
   * Get statistics about the cache
   */
  getStats() {
    return getCacheStats();
  }

  /**
   * Create a snapshot-ready object for database storage
   */
  createSnapshot(
    inputData: CompactLocationExport,
    cachedData: CachedRapportData,
    name: string
  ): Omit<RapportSnapshot, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name,
      locationAddress: cachedData.locationAddress,
      coordinates: cachedData.coordinates,
      rapportData: cachedData,
      inputData,
    };
  }
}

/**
 * Get cached rapport data by address (for snapshot saving)
 * Searches the cache index for an entry matching the address
 * Uses flexible matching to handle slight address variations
 */
export function getRapportDataByAddress(address: string): CachedRapportData | null {
  try {
    const index = getCacheIndex();

    // Log for debugging
    console.log('[RapportCache] Looking for address:', address);
    console.log('[RapportCache] Cache entries:', index.entries.map(e => e.locationAddress));

    // Try exact match first
    let entry = index.entries.find(e => e.locationAddress === address);

    // If no exact match, try partial match (address contains or is contained)
    if (!entry) {
      const normalizedSearch = address.toLowerCase().trim();
      entry = index.entries.find(e => {
        const normalizedEntry = e.locationAddress.toLowerCase().trim();
        return normalizedEntry.includes(normalizedSearch) || normalizedSearch.includes(normalizedEntry);
      });

      if (entry) {
        console.log('[RapportCache] Found partial match:', entry.locationAddress);
      }
    }

    if (!entry) {
      console.log('[RapportCache] No matching entry found for address');
      return null;
    }

    const data = getFromLocalCache(entry.key);
    if (data) {
      console.log('[RapportCache] Successfully retrieved rapport data for snapshot save');
    }
    return data;
  } catch (error) {
    console.error('[RapportCache] Error getting rapport data by address:', error);
    return null;
  }
}

/**
 * Restore rapport data to local cache (for snapshot loading)
 * Used when loading a snapshot that has rapport_data
 */
export function restoreRapportDataToCache(
  rapportData: CachedRapportData,
  ttl: number = DEFAULT_TTL
): boolean {
  if (!rapportData || !rapportData.inputHash) {
    console.warn('[RapportCache] Invalid rapport data for restoration');
    return false;
  }

  return saveToLocalCache(rapportData.inputHash, rapportData, ttl);
}

/**
 * Default export - singleton instance
 */
export const rapportCache = {
  nl: new RapportCache('nl'),
  en: new RapportCache('en'),
};

export default rapportCache;
