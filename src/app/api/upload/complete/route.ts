import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFileBuffer, getFileMetadata } from '@/lib/storage/r2-client';
import { processFile } from '@/lib/ai/rag/processing-pipeline';
import { neon } from '@neondatabase/serverless';
import { detectFileType } from '@/lib/storage/file-validation';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes - use Fluid Compute for large XML processing

interface UploadCompleteRequest {
  fileKey: string;
  chatId?: string;
  projectId?: string;
  filename: string;
}

export async function POST(request: NextRequest) {
  console.log('[Upload Complete API] === NEW REQUEST ===');

  try {
    // 1. Check authentication
    console.log('[Upload Complete API] Checking authentication...');
    const session = await auth();

    if (!session?.user) {
      console.log('[Upload Complete API] No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id.toString();
    console.log('[Upload Complete API] User authenticated:', userId);

    // 2. Parse request body
    const body: UploadCompleteRequest = await request.json();
    const { fileKey, chatId, projectId, filename } = body;

    console.log('[Upload Complete API] Request:', {
      fileKey,
      chatId,
      projectId,
      filename
    });

    // Require either chatId or projectId
    if (!chatId && !projectId) {
      return NextResponse.json(
        { error: 'Missing required field: chatId or projectId' },
        { status: 400 }
      );
    }

    // 3. Verify file exists in R2
    console.log('[Upload Complete API] Verifying file in R2...');
    const metadata = await getFileMetadata(fileKey);

    if (!metadata.contentType) {
      console.log('[Upload Complete API] File not found in R2');
      return NextResponse.json(
        { error: 'File not found in R2' },
        { status: 404 }
      );
    }

    console.log('[Upload Complete API] File verified:', {
      size: metadata.contentLength,
      type: metadata.contentType
    });

    // 4. Create file record in database
    console.log('[Upload Complete API] Creating file record in database...');
    const sql = neon(process.env.POSTGRES_URL!);

    const fileType = detectFileType(metadata.contentType);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();

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
        ${chatId || null},
        ${projectId || null},
        ${userId},
        ${sanitizedFilename},
        ${filename},
        ${fileKey},
        ${metadata.contentLength || 0},
        ${metadata.contentType},
        ${fileType},
        ${'r2'},
        ${null}
      )
      RETURNING id;
    `;

    const fileId = result[0].id;
    console.log('[Upload Complete API] File record created with ID:', fileId);

    // 5. Check if file should auto-process for RAG
    const supportedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'application/xml', 'text/xml'];
    const shouldAutoProcess = supportedTypes.includes(metadata.contentType) && projectId;

    console.log('[Upload Complete API] Should auto-process:', shouldAutoProcess);

    let ragResult = null;

    if (shouldAutoProcess) {
      try {
        console.log('[Upload Complete API] Starting RAG processing...');

        // 6. Process file for RAG
        ragResult = await processFile({
          fileId,
          filePath: fileKey,
          filename: sanitizedFilename,
          mimeType: metadata.contentType,
          projectId: projectId!,
          onProgress: (step, progress) => {
            console.log(`[Upload Complete API] RAG ${step}: ${(progress * 100).toFixed(0)}%`);
          }
        });

        console.log('[Upload Complete API] RAG processing complete:', {
          fileId,
          chunks: ragResult.chunkCount
        });

      } catch (ragError) {
        console.error('[Upload Complete API] RAG processing error:', ragError);
        // Don't fail the upload if RAG processing fails
        ragResult = {
          success: false,
          error: ragError instanceof Error ? ragError.message : 'RAG processing failed'
        };
      }
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      fileKey,
      filename,
      size: metadata.contentLength,
      contentType: metadata.contentType,
      autoProcessed: shouldAutoProcess,
      rag: ragResult
    });

  } catch (error) {
    console.error('[Upload Complete API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to complete upload' },
      { status: 500 }
    );
  }
}
