import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProjectFiles } from '@/lib/db/queries/files';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const files = await getProjectFiles(id);

    return NextResponse.json({ files });

  } catch (error) {
    console.error('Project files API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
