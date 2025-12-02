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
 * Documentation:
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
 * R2 Client Configuration
 * Using AWS SDK v3 with S3-compatible endpoint
 */
export const r2Client = new S3Client({
  region: 'auto', // R2 uses 'auto' region
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
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
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      // Metadata for tracking
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await r2Client.send(command);

    console.log(`[R2] File uploaded successfully: ${key}`);
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
