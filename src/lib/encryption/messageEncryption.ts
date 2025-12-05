/**
 * Message Encryption Utilities
 * Uses AES-256-GCM for authenticated encryption
 * Organization-specific key derivation using PBKDF2
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 * Derive encryption key from master key and organization ID
 */
function deriveKey(masterKey: string, orgId: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    masterKey + orgId,
    salt,
    PBKDF2_ITERATIONS,
    32,
    'sha256'
  );
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
