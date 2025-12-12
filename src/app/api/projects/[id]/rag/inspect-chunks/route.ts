/**
 * Chunk Inspection API
 * GET /api/projects/[id]/rag/inspect-chunks?search=4.126
 *
 * Allows inspecting stored chunks to debug retrieval issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    const db = getDbConnection();

    // Query chunks containing search term
    const chunks = await db`
      SELECT
        id,
        chunk_index,
        chunk_text,
        source_file,
        page_number,
        section_title,
        metadata,
        token_count,
        created_at
      FROM project_doc_chunks
      WHERE project_id = ${projectId}
        ${search ? db`AND (chunk_text ILIKE ${'%' + search + '%'} OR metadata::text ILIKE ${'%' + search + '%'})` : db``}
      ORDER BY
        CASE
          WHEN chunk_text ILIKE ${'%' + search + '%'} THEN 0
          ELSE 1
        END,
        chunk_index
      LIMIT ${limit}
    `;

    return NextResponse.json({
      success: true,
      search,
      total: chunks.length,
      chunks: chunks.map(c => ({
        id: c.id,
        chunkIndex: c.chunk_index,
        sourceFile: c.source_file,
        pageNumber: c.page_number,
        sectionTitle: c.section_title,
        tokenCount: c.token_count,
        metadata: c.metadata,
        preview: c.chunk_text.substring(0, 200) + '...',
        fullText: c.chunk_text,
        createdAt: c.created_at
      }))
    });

  } catch (error) {
    console.error('[Inspect Chunks API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to inspect chunks' },
      { status: 500 }
    );
  }
}
