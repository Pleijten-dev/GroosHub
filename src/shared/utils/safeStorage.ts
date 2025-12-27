/**
 * Safe localStorage/sessionStorage wrapper
 *
 * Best Practice (2025): Always wrap storage access to prevent errors in:
 * - Server-side rendering (window is undefined)
 * - Private browsing mode (throws QuotaExceededError)
 * - When storage is disabled by user
 * - When quota is exceeded
 *
 * This wrapper provides a consistent API that gracefully handles all edge cases.
 */

type StorageType = 'local' | 'session';

/**
 * Check if storage is available
 */
function isStorageAvailable(type: StorageType): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const storage = type === 'local' ? window.localStorage : window.sessionStorage;
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe storage wrapper class
 */
class SafeStorage {
  private type: StorageType;
  private available: boolean;

  constructor(type: StorageType = 'local') {
    this.type = type;
    this.available = isStorageAvailable(type);
  }

  /**
   * Get item from storage
   * @returns The stored value or null if not found/error
   */
  getItem(key: string): string | null {
    if (!this.available) return null;

    try {
      const storage = this.type === 'local' ? window.localStorage : window.sessionStorage;
      return storage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get item "${key}" from ${this.type}Storage:`, error);
      return null;
    }
  }

  /**
   * Set item in storage
   * @returns true if successful, false otherwise
   */
  setItem(key: string, value: string): boolean {
    if (!this.available) return false;

    try {
      const storage = this.type === 'local' ? window.localStorage : window.sessionStorage;
      storage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Failed to set item "${key}" in ${this.type}Storage:`, error);
      return false;
    }
  }

  /**
   * Remove item from storage
   * @returns true if successful, false otherwise
   */
  removeItem(key: string): boolean {
    if (!this.available) return false;

    try {
      const storage = this.type === 'local' ? window.localStorage : window.sessionStorage;
      storage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove item "${key}" from ${this.type}Storage:`, error);
      return false;
    }
  }

  /**
   * Clear all items from storage
   * @returns true if successful, false otherwise
   */
  clear(): boolean {
    if (!this.available) return false;

    try {
      const storage = this.type === 'local' ? window.localStorage : window.sessionStorage;
      storage.clear();
      return true;
    } catch (error) {
      console.warn(`Failed to clear ${this.type}Storage:`, error);
      return false;
    }
  }

  /**
   * Get a parsed JSON object from storage
   */
  getObject<T>(key: string): T | null {
    const item = this.getItem(key);
    if (!item) return null;

    try {
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`Failed to parse JSON for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set a JSON object in storage
   */
  setObject<T>(key: string, value: T): boolean {
    try {
      const json = JSON.stringify(value);
      return this.setItem(key, json);
    } catch (error) {
      console.warn(`Failed to stringify value for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    return this.available;
  }
}

/**
 * Pre-configured localStorage instance
 */
export const safeLocalStorage = new SafeStorage('local');

/**
 * Pre-configured sessionStorage instance
 */
export const safeSessionStorage = new SafeStorage('session');

/**
 * Default export for backwards compatibility
 */
export const safeStorage = safeLocalStorage;

/**
 * Create a custom storage instance
 */
export function createSafeStorage(type: StorageType = 'local'): SafeStorage {
  return new SafeStorage(type);
}
