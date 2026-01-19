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
import { processFile } from '@/lib/ai/rag/processing-pipeline';

export const runtime = 'nodejs'; // Required for file uploads
export const maxDuration = 60; // Allow up to 60 seconds for large file uploads

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
 * - chatId?: string (optional, for chat uploads)
 * - projectId?: string (optional, for project uploads)
 * - messageId?: string (optional, for attaching to specific message)
 *
 * Note: Either chatId or projectId must be provided
 */
export async function POST(request: NextRequest) {
  console.log('[Upload API] === NEW UPLOAD REQUEST ===');
  console.log('[Upload API] Request headers:', Object.fromEntries(request.headers.entries()));

  try {
    // 1. Check authentication
    console.log('[Upload API] Step 1: Checking authentication...');
    const session = await auth();
    console.log('[Upload API] Session:', session ? `User ID: ${session.user?.id}` : 'No session');

    if (!session?.user?.id) {
      console.log('[Upload API] ❌ Authentication failed - no session');
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log('[Upload API] ✅ Authenticated as user:', userId);

    // 2. Parse form data
    console.log('[Upload API] Step 2: Parsing form data...');
    const formData = await request.formData();
    const chatId = (formData.get('chatId') as string) || null;
    const projectId = (formData.get('projectId') as string) || null;
    const messageId = (formData.get('messageId') as string) || null;

    console.log('[Upload API] Form data:', { chatId, projectId, messageId });

    // Require either chatId or projectId
    if (!chatId && !projectId) {
      return NextResponse.json(
        { error: 'Missing required field: chatId or projectId' },
        { status: 400 }
      );
    }

    // For project uploads, verify user is a member
    const sql = neon(process.env.POSTGRES_URL!);

    if (projectId) {
      const membership = await sql`
        SELECT id FROM project_members
        WHERE project_id = ${projectId}
        AND user_id = ${userId}
        AND left_at IS NULL
        LIMIT 1;
      `;

      if (membership.length === 0) {
        return NextResponse.json(
          { error: 'You are not a member of this project' },
          { status: 403 }
        );
      }
    }

    // 3. Extract files from form data
    console.log('[Upload API] Step 3: Extracting files from form data...');
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log('[Upload API] Found file:', {
          key,
          name: value.name,
          type: value.type,
          size: value.size
        });
        files.push(value);
      }
    }

    console.log('[Upload API] Total files found:', files.length);

    if (files.length === 0) {
      console.log('[Upload API] ❌ No files provided');
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      console.log('[Upload API] ❌ Too many files:', files.length);
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_UPLOAD} files allowed per upload` },
        { status: 400 }
      );
    }

    // 4. Validate all files before uploading any
    console.log('[Upload API] Step 4: Validating files...');
    try {
      const fileInfos = files.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
      }));
      console.log('[Upload API] File infos to validate:', fileInfos);

      validateFiles(fileInfos);
      console.log('[Upload API] ✅ All files validated successfully');
    } catch (error) {
      if (error instanceof FileValidationError) {
        console.log('[Upload API] ❌ Validation failed:', error.message, error.code);
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: 400 }
        );
      }
      console.log('[Upload API] ❌ Unexpected validation error:', error);
      throw error;
    }

    // 5. Ensure chat exists in database (create if needed)
    // This handles the case where user uploads files before sending first message
    // Skip this check for project uploads
    if (chatId) {
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
        const timestamp = Date.now();
        const environment = process.env.NODE_ENV || 'development';

        // Different paths for chat vs project files
        const storageKey = projectId
          ? `${environment}/projects/${projectId}/files/${timestamp}-${sanitized}`
          : generateFileKey(String(userId), chatId!, messageId || 'temp', sanitized);

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to R2
        await uploadFileToR2(buffer, storageKey, file.type);

        // Store metadata in database using new file_uploads table
        const result = await sql`
          INSERT INTO file_uploads (
            chat_id,
            project_id,
            user_id,
            filename,
            original_filename,
            file_path,
            file_size_bytes,
            mime_type,
            file_category,
            storage_provider,
            storage_url
          ) VALUES (
            ${chatId},
            ${projectId},
            ${userId},
            ${sanitized},
            ${file.name},
            ${storageKey},
            ${file.size},
            ${file.type},
            ${fileType},
            ${'r2'},
            ${null}
          )
          RETURNING id, filename, original_filename, file_path, file_size_bytes, mime_type, file_category, created_at;
        `;

        const uploadedFile = result[0];
        uploadedFiles.push({
          id: uploadedFile.id,
          fileName: uploadedFile.original_filename,
          fileType: uploadedFile.file_category,
          mimeType: uploadedFile.mime_type,
          fileSize: uploadedFile.file_size_bytes,
          storageKey: uploadedFile.file_path,
          createdAt: uploadedFile.created_at,
        });

        console.log(`[Upload] File uploaded: ${file.name} (${fileType}) for user ${userId} ${projectId ? `to project ${projectId}` : `to chat ${chatId}`}`);

        // Automatically process for RAG if this is a project file and supported type
        if (projectId) {
          const supportedTypes = ['text/plain', 'text/markdown', 'text/csv', 'application/pdf', 'application/xml', 'text/xml'];
          if (supportedTypes.includes(file.type)) {
            console.log(`[Upload] 🚀 Auto-triggering RAG processing for ${file.name}`);

            // Trigger processing asynchronously (non-blocking)
            processFile({
              fileId: uploadedFile.id,
              projectId: projectId,
              filePath: storageKey,
              filename: sanitized,
              mimeType: file.type,
              onProgress: (step, progress) => {
                console.log(
                  `[Auto-RAG] ${file.name} - ${step}: ${(progress * 100).toFixed(0)}%`
                );
              }
            }).then(result => {
              if (result.success) {
                console.log(
                  `[Auto-RAG] ✅ ${file.name} processed: ` +
                  `${result.chunkCount} chunks, ${result.totalTokens} tokens`
                );
              } else {
                console.error(`[Auto-RAG] ❌ ${file.name} failed:`, result.error);
              }
            }).catch(error => {
              console.error(`[Auto-RAG] ❌ ${file.name} processing error:`, error);
            });
          } else {
            console.log(`[Upload] ℹ️  Skipping RAG processing for ${file.name} (unsupported type: ${file.type})`);
          }
        }

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
    console.error('[Upload API] ❌ CAUGHT ERROR:', error);
    console.error('[Upload API] Error type:', error?.constructor?.name);
    console.error('[Upload API] Error stack:', error instanceof Error ? error.stack : 'No stack');

    if (error instanceof FileValidationError) {
      console.log('[Upload API] Returning validation error response');
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    console.log('[Upload API] Returning generic error response');
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
        fu.id,
        fu.original_filename as file_name,
        fu.file_category as file_type,
        fu.mime_type,
        fu.file_size_bytes as file_size,
        fu.file_path as storage_key,
        fu.created_at
      FROM file_uploads fu
      JOIN chat_conversations cc ON cc.id = fu.chat_id
      WHERE fu.chat_id = ${chatId}
        AND cc.user_id = ${userId}
      ORDER BY fu.created_at DESC;
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
