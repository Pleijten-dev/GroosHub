import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPresignedUploadUrl, generateFileKey } from '@/lib/storage/r2-client';
import { FILE_CONFIGS, detectFileType } from '@/lib/storage/file-validation';

export const runtime = 'nodejs';

interface PresignedUrlRequest {
  filename: string;
  contentType: string;
  chatId?: string;
  projectId?: string;
  messageId?: string;
}

export async function POST(request: NextRequest) {
  console.log('[Presigned URL API] === NEW REQUEST ===');

  try {
    // 1. Check authentication
    console.log('[Presigned URL API] Checking authentication...');
    const session = await auth();

    if (!session?.user) {
      console.log('[Presigned URL API] No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id.toString();
    console.log('[Presigned URL API] User authenticated:', userId);

    // 2. Parse request body
    const body: PresignedUrlRequest = await request.json();
    const { filename, contentType, chatId, projectId, messageId } = body;

    console.log('[Presigned URL API] Request:', {
      filename,
      contentType,
      chatId,
      projectId,
      messageId
    });

    // Require either chatId or projectId
    if (!chatId && !projectId) {
      return NextResponse.json(
        { error: 'Missing required field: chatId or projectId' },
        { status: 400 }
      );
    }

    // 3. Detect and validate file type
    const fileType = detectFileType(contentType);

    if (!fileType) {
      console.log('[Presigned URL API] Unsupported file type:', contentType);
      return NextResponse.json(
        { error: `Unsupported file type: ${contentType}` },
        { status: 400 }
      );
    }

    console.log('[Presigned URL API] File type detected:', fileType);

    // 4. Check file extension
    const fileExt = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
    const config = FILE_CONFIGS[fileType];

    if (fileExt && !config.allowedExtensions.includes(fileExt)) {
      console.log('[Presigned URL API] Invalid file extension:', fileExt);
      return NextResponse.json(
        { error: `File extension ${fileExt} not allowed for ${fileType} files` },
        { status: 400 }
      );
    }

    // 5. Generate file key (different patterns for chat vs project)
    let fileKey: string;
    if (chatId) {
      fileKey = generateFileKey(userId, chatId, messageId || 'temp', filename);
    } else if (projectId) {
      // Project uploads: {environment}/users/{userId}/projects/{projectId}/{timestamp}-{filename}
      const environment = process.env.NODE_ENV || 'development';
      const timestamp = Date.now();
      const sanitizedFilename = filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .toLowerCase();
      fileKey = `${environment}/users/${userId}/projects/${projectId}/${timestamp}-${sanitizedFilename}`;
    } else {
      throw new Error('No chatId or projectId provided');
    }
    console.log('[Presigned URL API] Generated file key:', fileKey);

    // 6. Generate presigned upload URL (10 minute expiration)
    const uploadUrl = await getPresignedUploadUrl(fileKey, contentType, 600);
    console.log('[Presigned URL API] Generated presigned URL');

    // 7. Return presigned URL and file key
    return NextResponse.json({
      success: true,
      uploadUrl,
      fileKey,
      maxSize: config.maxSize,
      expiresIn: 600 // 10 minutes
    });

  } catch (error) {
    console.error('[Presigned URL API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    );
  }
}
