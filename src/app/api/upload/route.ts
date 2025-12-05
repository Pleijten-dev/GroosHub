/**
 * File Upload API Endpoint
 *
 * Handles secure file uploads to Cloudflare R2 storage
 *
 * Features:
 * - Authentication required (user must be logged in)
 * - File validation (type, size, MIME)
 * - Uploads to R2 with structured paths
 * - Stores metadata in PostgreSQL
 * - Returns file metadata for use in chat
 *
 * Request: multipart/form-data with files
 * Response: Array of uploaded file metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import {
  uploadFileToR2,
  generateFileKey,
} from '@/lib/storage/r2-client';
import {
  validateFile,
  validateFiles,
  sanitizeFilename,
  FileValidationError,
  MAX_FILES_PER_UPLOAD,
} from '@/lib/storage/file-validation';
import { createChat } from '@/lib/ai/chat-store';

export const runtime = 'nodejs'; // Required for file uploads

interface UploadedFile {
  id: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  createdAt: string;
}

/**
 * POST /api/upload
 *
 * Upload one or more files to R2 storage
 *
 * Body (multipart/form-data):
 * - files: File[] (1-10 files)
 * - chatId: string (required)
 * - messageId?: string (optional, for attaching to specific message)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 2. Parse form data
    const formData = await request.formData();
    const chatId = formData.get('chatId') as string;
    const messageId = (formData.get('messageId') as string) || null;

    if (!chatId) {
      return NextResponse.json(
        { error: 'Missing required field: chatId' },
        { status: 400 }
      );
    }

    // 3. Extract files from form data
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_UPLOAD} files allowed per upload` },
        { status: 400 }
      );
    }

    // 4. Validate all files before uploading any
    try {
      validateFiles(
        files.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size,
        }))
      );
    } catch (error) {
      if (error instanceof FileValidationError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 400 }
        );
      }
      throw error;
    }

    // 5. Ensure chat exists in database (create if needed)
    // This handles the case where user uploads files before sending first message
    const sql = neon(process.env.POSTGRES_URL!);

    try {
      // Check if chat exists
      const existingChat = await sql`
        SELECT id FROM chat_conversations WHERE id = ${chatId} LIMIT 1;
      `;

      if (existingChat.length === 0) {
        // Chat doesn't exist, create it
        console.log(`[Upload] Chat ${chatId} doesn't exist, creating it for user ${userId}`);
        await createChat({
          userId: Number(userId),
          chatId: chatId,
          title: 'New Chat', // Will be updated when first message is sent
        });
        console.log(`[Upload] Chat ${chatId} created successfully`);
      }
    } catch (error) {
      console.error('[Upload] Error checking/creating chat:', error);
      return NextResponse.json(
        { error: 'Failed to prepare chat for file upload' },
        { status: 500 }
      );
    }

    // 6. Upload files to R2 and store metadata
    const uploadedFiles: UploadedFile[] = [];

    for (const file of files) {
      try {
        // Validate individual file
        const fileType = validateFile({
          name: file.name,
          type: file.type,
          size: file.size,
        });

        // Generate storage key
        const sanitized = sanitizeFilename(file.name);
        const storageKey = generateFileKey(
          String(userId),
          chatId,
          messageId || 'temp',
          sanitized
        );

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to R2
        await uploadFileToR2(buffer, storageKey, file.type);

        // Store metadata in database
        const result = await sql`
          INSERT INTO chat_files (
            chat_id,
            message_id,
            user_id,
            storage_key,
            file_name,
            file_type,
            mime_type,
            file_size
          ) VALUES (
            ${chatId},
            ${messageId},
            ${userId},
            ${storageKey},
            ${file.name},
            ${fileType},
            ${file.type},
            ${file.size}
          )
          RETURNING id, file_name, file_type, mime_type, file_size, storage_key, created_at;
        `;

        const uploadedFile = result[0];
        uploadedFiles.push({
          id: uploadedFile.id,
          fileName: uploadedFile.file_name,
          fileType: uploadedFile.file_type,
          mimeType: uploadedFile.mime_type,
          fileSize: uploadedFile.file_size,
          storageKey: uploadedFile.storage_key,
          createdAt: uploadedFile.created_at,
        });

        console.log(`[Upload] File uploaded: ${file.name} (${fileType}) for user ${userId}`);

      } catch (error) {
        console.error(`[Upload] Failed to upload file ${file.name}:`, error);
        // If one file fails, we could either:
        // A) Fail the entire batch (current approach)
        // B) Continue and report partial success
        throw error;
      }
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
    });

  } catch (error) {
    console.error('[Upload API] Error:', error);

    if (error instanceof FileValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to upload files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload
 *
 * Get uploaded files for a chat
 *
 * Query params:
 * - chatId: string (required)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        { error: 'Missing required parameter: chatId' },
        { status: 400 }
      );
    }

    // Get files for chat (verify user owns the chat)
    const sql = neon(process.env.POSTGRES_URL!);

    const files = await sql`
      SELECT
        cf.id,
        cf.file_name,
        cf.file_type,
        cf.mime_type,
        cf.file_size,
        cf.storage_key,
        cf.message_id,
        cf.created_at
      FROM chat_files cf
      JOIN chats c ON c.id = cf.chat_id
      WHERE cf.chat_id = ${chatId}
        AND c.user_id = ${userId}
      ORDER BY cf.created_at DESC;
    `;

    return NextResponse.json({
      success: true,
      files: files,
    });

  } catch (error) {
    console.error('[Upload API GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve files' },
      { status: 500 }
    );
  }
}
