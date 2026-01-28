/**
 * Encryption utilities for GroosHub
 * Provides organization-specific AES-256-GCM encryption
 *
 * Usage:
 * - Set ENCRYPTION_MASTER_KEY in .env.local to enable encryption
 * - Use encryptForStorage/decryptFromStorage for automatic handling
 * - Encryption is backward compatible with unencrypted data
 */

export {
  // Core encryption functions (require orgId parameter)
  encryptMessage,
  decryptMessage,
  encryptJSON,
  decryptJSON,
  // Status check
  isEncryptionEnabled,
  getOrgId,
  // Auto-encrypt/decrypt helpers (use default orgId, handle disabled state)
  encryptForStorage,
  decryptFromStorage,
  encryptJSONForStorage,
  decryptJSONFromStorage,
  // Buffer encryption for files
  encryptBuffer,
  decryptBuffer,
  // Utilities
  clearKeyCache
} from './messageEncryption';
