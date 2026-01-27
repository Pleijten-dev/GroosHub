/**
 * Cloudflare R2 Storage Client
 *
 * Provides secure file upload and retrieval using Cloudflare R2
 * with S3-compatible API.
 *
 * Features:
 * - Private by default (no public access)
 * - Presigned URLs with expiration (1 hour default)
 * - Structured file paths: users/{userId}/chats/{chatId}/messages/{messageId}/{timestamp}-{filename}
 * - Support for images and PDFs
 *
 * Encryption Strategy:
 * - Server-routed uploads (uploadFileToR2): Additional AES-256-GCM encryption when
 *   ENCRYPTION_MASTER_KEY is set. Files are encrypted before upload and decrypted on retrieval.
 * - Presigned URL uploads: Rely on R2's built-in encryption at rest (AES-256).
 *   This is necessary for large files (>4.5MB) that exceed Vercel's serverless limit.
 * - All files in R2 are encrypted at rest by Cloudflare regardless of upload method.
 *
 * Documentation:
 * - R2 Encryption: https://developers.cloudflare.com/r2/reference/data-security/
 * - Presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
 * - AWS SDK v3: https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { encryptBuffer, decryptBuffer, isEncryptionEnabled } from '@/lib/encryption';

// Validate required environment variables
const requiredEnvVars = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

/**
 * Build R2 endpoint URL based on jurisdiction
 *
 * Default: https://{account_id}.r2.cloudflarestorage.com
 * EU:      https://{account_id}.eu.r2.cloudflarestorage.com
 */
function buildR2Endpoint(): string {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const jurisdiction = process.env.R2_JURISDICTION?.toLowerCase();

  if (jurisdiction === 'eu') {
    return `https://${accountId}.eu.r2.cloudflarestorage.com`;
  }

  return `https://${accountId}.r2.cloudflarestorage.com`;
}

/**
 * R2 Client Configuration
 * Using AWS SDK v3 with S3-compatible endpoint
 */
export const r2Client = new S3Client({
  region: 'auto', // R2 uses 'auto' region
  endpoint: buildR2Endpoint(),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;

/**
 * Generate a structured file key for R2 storage
 *
 * Pattern: {environment}/users/{userId}/chats/{chatId}/messages/{messageId}/{timestamp}-{filename}
 *
 * Example: production/users/abc123/chats/def456/messages/ghi789/1733155200000-document.pdf
 */
export function generateFileKey(
  userId: string,
  chatId: string,
  messageId: string,
  filename: string
): string {
  const environment = process.env.NODE_ENV || 'development';
  const timestamp = Date.now();

  // Sanitize filename (remove special characters, preserve extension)
  const sanitizedFilename = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .toLowerCase();

  return `${environment}/users/${userId}/chats/${chatId}/messages/${messageId}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Upload a file to R2 storage
 * Automatically encrypts the file if ENCRYPTION_MASTER_KEY is configured
 *
 * @param file - File buffer to upload
 * @param key - Storage key (use generateFileKey)
 * @param contentType - MIME type of the file
 * @returns Storage key of uploaded file
 */
export async function uploadFileToR2(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<string> {
  try {
    // Convert to Buffer if Uint8Array
    const fileBuffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

    // Encrypt file buffer for storage
    const { encrypted: encryptedBuffer, isEncrypted } = encryptBuffer(fileBuffer);

    console.log(`[R2] Uploading file: ${key} (encrypted: ${isEncrypted ? '🔐 Yes' : '⚠️ No'})`);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: encryptedBuffer,
      ContentType: contentType,
      // Metadata for tracking (including encryption status)
      Metadata: {
        uploadedAt: new Date().toISOString(),
        encrypted: isEncrypted ? 'true' : 'false',
        originalSize: fileBuffer.length.toString(),
      },
    });

    await r2Client.send(command);

    console.log(`[R2] ✅ File uploaded successfully: ${key}`);
    return key;
  } catch (error) {
    console.error('[R2] Upload error:', error);
    throw new Error(`Failed to upload file to R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a presigned URL for downloading a file
 *
 * Presigned URLs allow temporary access to private files without exposing credentials.
 *
 * @param key - Storage key of the file
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL that expires after the specified time
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn });

    console.log(`[R2] Generated presigned URL for: ${key} (expires in ${expiresIn}s)`);
    return url;
  } catch (error) {
    console.error('[R2] Presigned URL error:', error);
    throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a presigned URL for uploading a file
 *
 * This allows clients to upload files directly to R2 without passing through our API,
 * bypassing Vercel's 4.5MB serverless function body limit.
 *
 * Security Note: Files uploaded via presigned URLs are protected by R2's built-in
 * encryption at rest (AES-256) but do NOT receive additional application-layer
 * encryption. This is acceptable for shared project files where multiple users
 * need access, and R2's encryption provides adequate protection.
 *
 * @param key - Storage key where file will be uploaded
 * @param contentType - MIME type of the file
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL that expires after the specified time
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn });

    console.log(`[R2] Generated presigned upload URL for: ${key} (expires in ${expiresIn}s)`);
    return url;
  } catch (error) {
    console.error('[R2] Presigned upload URL error:', error);
    throw new Error(`Failed to generate presigned upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file as buffer from R2 storage
 * Automatically decrypts if the file was encrypted
 *
 * @param key - Storage key
 * @returns File contents as Buffer (decrypted if applicable)
 */
export async function getFileBuffer(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);

    if (!response.Body) {
      throw new Error('No file body in response');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Check metadata for encryption status
    const isEncrypted = response.Metadata?.encrypted === 'true';

    if (isEncrypted) {
      console.log(`[R2] 🔐 Decrypting file: ${key}`);
      try {
        return decryptBuffer(buffer, true);
      } catch (error) {
        console.error(`[R2] ❌ Failed to decrypt file ${key}:`, error);
        throw new Error('Failed to decrypt file');
      }
    }

    return buffer;
  } catch (error) {
    console.error('[R2] Get file buffer error:', error);
    throw new Error(`Failed to get file buffer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a file exists in R2
 *
 * @param key - Storage key to check
 * @returns True if file exists, false otherwise
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    // HeadObject throws an error if file doesn't exist
    return false;
  }
}

/**
 * Delete a file from R2 storage
 *
 * @param key - Storage key to delete
 */
export async function deleteFileFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    console.log(`[R2] File deleted successfully: ${key}`);
  } catch (error) {
    console.error('[R2] Delete error:', error);
    throw new Error(`Failed to delete file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file metadata from R2
 *
 * @param key - Storage key
 * @returns File metadata including size, content type, last modified
 */
export async function getFileMetadata(key: string): Promise<{
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
}> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
    };
  } catch (error) {
    console.error('[R2] Metadata error:', error);
    throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
