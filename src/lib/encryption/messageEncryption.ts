import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derive encryption key from master key and organization ID
 * Uses PBKDF2 with 100,000 iterations for security
 */
function deriveKey(masterKey: string, orgId: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    masterKey + orgId,
    salt,
    100000, // iterations
    32, // key length
    'sha256'
  );
}

/**
 * Encrypt a message with organization-specific encryption
 *
 * @param plaintext - The text to encrypt
 * @param orgId - Organization ID for key derivation
 * @returns Encrypted string in format: salt:iv:encrypted:tag
 */
export function encryptMessage(
  plaintext: string,
  orgId: string
): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;

  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY not configured in environment');
  }

  // Generate random IV and salt for this encryption
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive organization-specific key
  const key = deriveKey(masterKey, orgId, salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt plaintext
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Return all components as colon-separated hex strings
  return [
    salt.toString('hex'),
    iv.toString('hex'),
    encrypted,
    tag.toString('hex')
  ].join(':');
}

/**
 * Decrypt a message with organization-specific encryption
 *
 * @param ciphertext - Encrypted string in format: salt:iv:encrypted:tag
 * @param orgId - Organization ID for key derivation
 * @returns Decrypted plaintext
 */
export function decryptMessage(
  ciphertext: string,
  orgId: string
): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;

  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY not configured in environment');
  }

  // Parse ciphertext components
  const parts = ciphertext.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid ciphertext format - expected salt:iv:encrypted:tag');
  }

  const [saltHex, ivHex, encryptedHex, tagHex] = parts;

  // Convert from hex strings to buffers
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  // Derive organization-specific key
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
 * Encrypt JSON data
 *
 * @param data - Object to encrypt
 * @param orgId - Organization ID for key derivation
 * @returns Encrypted string
 */
export function encryptJSON(
  data: unknown,
  orgId: string
): string {
  const plaintext = JSON.stringify(data);
  return encryptMessage(plaintext, orgId);
}

/**
 * Decrypt JSON data
 *
 * @param ciphertext - Encrypted string
 * @param orgId - Organization ID for key derivation
 * @returns Decrypted object
 */
export function decryptJSON<T = unknown>(
  ciphertext: string,
  orgId: string
): T {
  const plaintext = decryptMessage(ciphertext, orgId);
  return JSON.parse(plaintext) as T;
}

/**
 * Check if encryption is configured
 * @returns true if ENCRYPTION_MASTER_KEY is set
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env.ENCRYPTION_MASTER_KEY;
}
