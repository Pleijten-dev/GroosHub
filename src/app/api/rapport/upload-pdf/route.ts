/**
 * API route for uploading rapport PDFs to R2 storage
 *
 * POST - Upload a PDF to R2 for a specific project
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadFileToR2, getPresignedUrl } from '@/lib/storage/r2-client';

/**
 * Generate a storage key for rapport PDFs
 * Pattern: {env}/projects/{projectId}/reports/{timestamp}-{filename}
 */
function generateRapportPdfKey(
  projectId: string,
  filename: string
): string {
  const environment = process.env.NODE_ENV || 'development';
  const timestamp = Date.now();

  // Sanitize filename
  const sanitizedFilename = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .toLowerCase();

  return `${environment}/projects/${projectId}/reports/${timestamp}-${sanitizedFilename}`;
}

/**
 * POST /api/rapport/upload-pdf
 * Upload a rapport PDF to R2 storage
 *
 * Request body (FormData):
 * - file: The PDF file
 * - projectId: The project ID to associate with
 * - filename: Optional custom filename
 *
 * Response:
 * - success: boolean
 * - data: { fileKey, presignedUrl, expiresIn }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const customFilename = formData.get('filename') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'No projectId provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max for PDFs)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate storage key
    const filename = customFilename || file.name || 'rapport.pdf';
    const fileKey = generateRapportPdfKey(projectId, filename);

    // Upload to R2
    await uploadFileToR2(buffer, fileKey, 'application/pdf');

    // Generate presigned URL for immediate access (1 hour)
    const presignedUrl = await getPresignedUrl(fileKey, 3600);

    console.log(`[RapportUpload] PDF uploaded for project ${projectId}: ${fileKey}`);

    return NextResponse.json({
      success: true,
      data: {
        fileKey,
        presignedUrl,
        expiresIn: 3600, // 1 hour
        filename,
        size: file.size,
      },
    });
  } catch (error) {
    console.error('[RapportUpload] Error uploading PDF:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload PDF',
      },
      { status: 500 }
    );
  }
}
