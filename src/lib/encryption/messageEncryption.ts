/**
 * Message Encryption Utilities
 * Uses AES-256-GCM for authenticated encryption
 * Organization-specific key derivation using PBKDF2
 *
 * Features:
 * - Automatic encryption when ENCRYPTION_MASTER_KEY is set
 * - Graceful fallback to unencrypted storage when key is not set
 * - Key caching for performance optimization
 * - Backward compatible with existing unencrypted data
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 * Default organization ID for key derivation
 * Can be overridden via ENCRYPTION_ORG_ID environment variable
 */
const DEFAULT_ORG_ID = 'grooshub';

/**
 * Get the organization ID for encryption
 */
export function getOrgId(): string {
  return process.env.ENCRYPTION_ORG_ID || DEFAULT_ORG_ID;
}

/**
 * Key cache for performance optimization
 * Maps `${masterKey}:${orgId}:${saltHex}` to derived key
 * Cache is limited to prevent memory issues
 */
const keyCache = new Map<string, Buffer>();
const KEY_CACHE_MAX_SIZE = 100;

/**
 * Derive encryption key from master key and organization ID
 * Uses caching to avoid repeated PBKDF2 computations
 */
function deriveKey(masterKey: string, orgId: string, salt: Buffer): Buffer {
  const saltHex = salt.toString('hex');
  const cacheKey = `${masterKey}:${orgId}:${saltHex}`;

  // Check cache first
  const cached = keyCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Derive new key
  const key = crypto.pbkdf2Sync(
    masterKey + orgId,
    salt,
    PBKDF2_ITERATIONS,
    32,
    'sha256'
  );

  // Add to cache (with size limit)
  if (keyCache.size >= KEY_CACHE_MAX_SIZE) {
    // Remove oldest entry (first key)
    const firstKey = keyCache.keys().next().value;
    if (firstKey) {
      keyCache.delete(firstKey);
    }
  }
  keyCache.set(cacheKey, key);

  return key;
}

/**
 * Encrypt a message using AES-256-GCM
 * @param plaintext - The message to encrypt
 * @param orgId - Organization ID for key derivation
 * @returns Encrypted message in format: salt:iv:encrypted:tag
 */
export function encryptMessage(
  plaintext: string,
  orgId: string
): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY not configured');
  }

  // Generate random IV and salt
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive key
  const key = deriveKey(masterKey, orgId, salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const tag = cipher.getAuthTag();

  // Format: salt:iv:encrypted:tag
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    encrypted,
    tag.toString('hex')
  ].join(':');
}

/**
 * Decrypt a message encrypted with encryptMessage
 * @param ciphertext - The encrypted message
 * @param orgId - Organization ID for key derivation
 * @returns Decrypted plaintext
 */
export function decryptMessage(
  ciphertext: string,
  orgId: string
): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY not configured');
  }

  // Parse components
  const parts = ciphertext.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid ciphertext format');
  }

  const [saltHex, ivHex, encryptedHex, tagHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  // Derive key
  const key = deriveKey(masterKey, orgId, salt);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.ENCRYPTION_MASTER_KEY;
}

/**
 * Encrypt JSON data
 */
export function encryptJSON(data: unknown, orgId: string): string {
  return encryptMessage(JSON.stringify(data), orgId);
}

/**
 * Decrypt JSON data
 */
export function decryptJSON<T>(ciphertext: string, orgId: string): T {
  const decrypted = decryptMessage(ciphertext, orgId);
  return JSON.parse(decrypted) as T;
}

// ============================================
// Auto-Encrypt/Decrypt Helpers
// These functions automatically use the default ORG_ID
// and gracefully handle encryption being disabled
// ============================================

/**
 * Encrypt text content for storage
 * Returns original text if encryption is disabled
 * @returns { encrypted: string, isEncrypted: boolean }
 */
export function encryptForStorage(plaintext: string): { encrypted: string; isEncrypted: boolean } {
  if (!isEncryptionEnabled()) {
    return { encrypted: plaintext, isEncrypted: false };
  }

  try {
    const encrypted = encryptMessage(plaintext, getOrgId());
    return { encrypted, isEncrypted: true };
  } catch (error) {
    console.error('[Encryption] Failed to encrypt, storing as plaintext:', error);
    return { encrypted: plaintext, isEncrypted: false };
  }
}

/**
 * Decrypt text content from storage
 * Handles both encrypted and unencrypted content based on flag
 */
export function decryptFromStorage(content: string, isEncrypted: boolean): string {
  if (!isEncrypted) {
    return content;
  }

  if (!isEncryptionEnabled()) {
    console.warn('[Encryption] Content is encrypted but ENCRYPTION_MASTER_KEY is not set');
    throw new Error('Cannot decrypt: ENCRYPTION_MASTER_KEY not configured');
  }

  try {
    return decryptMessage(content, getOrgId());
  } catch (error) {
    console.error('[Encryption] Failed to decrypt content:', error);
    throw error;
  }
}

/**
 * Encrypt JSON data for storage
 * Returns stringified JSON if encryption is disabled
 * @returns { encrypted: string, isEncrypted: boolean }
 */
export function encryptJSONForStorage(data: unknown): { encrypted: string; isEncrypted: boolean } {
  const jsonString = JSON.stringify(data);

  if (!isEncryptionEnabled()) {
    return { encrypted: jsonString, isEncrypted: false };
  }

  try {
    const encrypted = encryptMessage(jsonString, getOrgId());
    return { encrypted, isEncrypted: true };
  } catch (error) {
    console.error('[Encryption] Failed to encrypt JSON, storing as plaintext:', error);
    return { encrypted: jsonString, isEncrypted: false };
  }
}

/**
 * Decrypt JSON data from storage
 * Handles both encrypted and unencrypted content based on flag
 */
export function decryptJSONFromStorage<T>(content: string, isEncrypted: boolean): T {
  if (!isEncrypted) {
    return JSON.parse(content) as T;
  }

  if (!isEncryptionEnabled()) {
    console.warn('[Encryption] Content is encrypted but ENCRYPTION_MASTER_KEY is not set');
    throw new Error('Cannot decrypt: ENCRYPTION_MASTER_KEY not configured');
  }

  try {
    return decryptJSON<T>(content, getOrgId());
  } catch (error) {
    console.error('[Encryption] Failed to decrypt JSON:', error);
    throw error;
  }
}

/**
 * Encrypt a Buffer (for file encryption)
 * Returns original buffer if encryption is disabled
 * @returns { encrypted: Buffer, isEncrypted: boolean }
 */
export function encryptBuffer(buffer: Buffer): { encrypted: Buffer; isEncrypted: boolean } {
  if (!isEncryptionEnabled()) {
    return { encrypted: buffer, isEncrypted: false };
  }

  const masterKey = process.env.ENCRYPTION_MASTER_KEY!;
  const orgId = getOrgId();

  try {
    // Generate random IV and salt
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive key
    const key = deriveKey(masterKey, orgId, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    // Get auth tag
    const tag = cipher.getAuthTag();

    // Combine: salt (32) + iv (16) + tag (16) + encrypted data
    const result = Buffer.concat([salt, iv, tag, encrypted]);

    return { encrypted: result, isEncrypted: true };
  } catch (error) {
    console.error('[Encryption] Failed to encrypt buffer:', error);
    return { encrypted: buffer, isEncrypted: false };
  }
}

/**
 * Decrypt a Buffer from storage
 * Handles both encrypted and unencrypted content based on flag
 */
export function decryptBuffer(buffer: Buffer, isEncrypted: boolean): Buffer {
  if (!isEncrypted) {
    return buffer;
  }

  if (!isEncryptionEnabled()) {
    throw new Error('Cannot decrypt: ENCRYPTION_MASTER_KEY not configured');
  }

  const masterKey = process.env.ENCRYPTION_MASTER_KEY!;
  const orgId = getOrgId();

  try {
    // Extract components: salt (32) + iv (16) + tag (16) + encrypted data
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive key
    const key = deriveKey(masterKey, orgId, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted;
  } catch (error) {
    console.error('[Encryption] Failed to decrypt buffer:', error);
    throw error;
  }
}

/**
 * Clear the key cache (for testing or security purposes)
 */
export function clearKeyCache(): void {
  keyCache.clear();
}
