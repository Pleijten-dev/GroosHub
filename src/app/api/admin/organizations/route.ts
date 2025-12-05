import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllOrganizations, getOrganizationBySlug } from '@/lib/db/queries/organizations';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');

    if (slug) {
      const org = await getOrganizationBySlug(slug);
      return NextResponse.json({ organization: org });
    }

    const organizations = await getAllOrganizations();
    return NextResponse.json({ organizations });

  } catch (error) {
    console.error('Organizations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
