/**
 * Tests for message encryption utilities
 * Run with: npm test src/lib/encryption/__tests__/messageEncryption.test.ts
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { encryptMessage, decryptMessage, encryptJSON, decryptJSON, isEncryptionConfigured } from '../messageEncryption';

// Set up test environment
beforeAll(() => {
  // Set test master key
  process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32-characters-long-for-testing';
});

describe('Message Encryption', () => {
  const testOrgId = 'test-org-id-123';
  const testMessage = 'This is a secret message';

  describe('encryptMessage / decryptMessage', () => {
    it('should encrypt and decrypt a message successfully', () => {
      const encrypted = encryptMessage(testMessage, testOrgId);
      const decrypted = decryptMessage(encrypted, testOrgId);

      expect(decrypted).toBe(testMessage);
    });

    it('should produce different ciphertexts for the same message', () => {
      const encrypted1 = encryptMessage(testMessage, testOrgId);
      const encrypted2 = encryptMessage(testMessage, testOrgId);

      // Different IVs and salts should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same plaintext
      expect(decryptMessage(encrypted1, testOrgId)).toBe(testMessage);
      expect(decryptMessage(encrypted2, testOrgId)).toBe(testMessage);
    });

    it('should produce different ciphertexts for different organizations', () => {
      const org1 = 'org-1';
      const org2 = 'org-2';

      const encrypted1 = encryptMessage(testMessage, org1);
      const encrypted2 = encryptMessage(testMessage, org2);

      // Different org IDs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);

      // Each org can only decrypt its own messages
      expect(decryptMessage(encrypted1, org1)).toBe(testMessage);
      expect(decryptMessage(encrypted2, org2)).toBe(testMessage);

      // Attempting to decrypt with wrong org ID should fail
      expect(() => decryptMessage(encrypted1, org2)).toThrow();
      expect(() => decryptMessage(encrypted2, org1)).toThrow();
    });

    it('should handle empty strings', () => {
      const encrypted = encryptMessage('', testOrgId);
      const decrypted = decryptMessage(encrypted, testOrgId);

      expect(decrypted).toBe('');
    });

    it('should handle special characters and unicode', () => {
      const specialMessage = '🔐 Secret: €100 & <script>alert("xss")</script>';
      const encrypted = encryptMessage(specialMessage, testOrgId);
      const decrypted = decryptMessage(encrypted, testOrgId);

      expect(decrypted).toBe(specialMessage);
    });

    it('should throw error when master key is not configured', () => {
      const originalKey = process.env.ENCRYPTION_MASTER_KEY;
      delete process.env.ENCRYPTION_MASTER_KEY;

      expect(() => encryptMessage(testMessage, testOrgId)).toThrow('ENCRYPTION_MASTER_KEY not configured');

      process.env.ENCRYPTION_MASTER_KEY = originalKey;
    });

    it('should throw error on invalid ciphertext format', () => {
      expect(() => decryptMessage('invalid-format', testOrgId)).toThrow('Invalid ciphertext format');
      expect(() => decryptMessage('only:three:parts', testOrgId)).toThrow('Invalid ciphertext format');
    });

    it('should throw error on tampered ciphertext', () => {
      const encrypted = encryptMessage(testMessage, testOrgId);
      const parts = encrypted.split(':');

      // Tamper with the encrypted data
      parts[2] = parts[2].replace('a', 'b');
      const tampered = parts.join(':');

      expect(() => decryptMessage(tampered, testOrgId)).toThrow();
    });

    it('should have correct ciphertext format (salt:iv:encrypted:tag)', () => {
      const encrypted = encryptMessage(testMessage, testOrgId);
      const parts = encrypted.split(':');

      expect(parts.length).toBe(4);
      expect(parts[0].length).toBe(64); // 32 bytes salt = 64 hex chars
      expect(parts[1].length).toBe(32); // 16 bytes IV = 32 hex chars
      expect(parts[3].length).toBe(32); // 16 bytes tag = 32 hex chars
    });
  });

  describe('encryptJSON / decryptJSON', () => {
    const testData = {
      id: 123,
      message: 'Secret data',
      nested: {
        array: [1, 2, 3],
        bool: true
      },
      nullValue: null
    };

    it('should encrypt and decrypt JSON data', () => {
      const encrypted = encryptJSON(testData, testOrgId);
      const decrypted = decryptJSON(encrypted, testOrgId);

      expect(decrypted).toEqual(testData);
    });

    it('should handle arrays', () => {
      const array = [1, 'two', { three: 3 }, null, true];
      const encrypted = encryptJSON(array, testOrgId);
      const decrypted = decryptJSON(encrypted, testOrgId);

      expect(decrypted).toEqual(array);
    });

    it('should preserve data types', () => {
      const encrypted = encryptJSON(testData, testOrgId);
      const decrypted = decryptJSON<typeof testData>(encrypted, testOrgId);

      expect(typeof decrypted.id).toBe('number');
      expect(typeof decrypted.message).toBe('string');
      expect(typeof decrypted.nested.bool).toBe('boolean');
      expect(decrypted.nullValue).toBeNull();
      expect(Array.isArray(decrypted.nested.array)).toBe(true);
    });
  });

  describe('isEncryptionConfigured', () => {
    it('should return true when master key is set', () => {
      expect(isEncryptionConfigured()).toBe(true);
    });

    it('should return false when master key is not set', () => {
      const originalKey = process.env.ENCRYPTION_MASTER_KEY;
      delete process.env.ENCRYPTION_MASTER_KEY;

      expect(isEncryptionConfigured()).toBe(false);

      process.env.ENCRYPTION_MASTER_KEY = originalKey;
    });
  });
});
