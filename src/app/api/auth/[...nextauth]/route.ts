import { handlers } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// Wrap handlers with error catching
async function wrappedGET(req: NextRequest) {
  try {
    return await handlers.GET(req);
  } catch (error) {
    console.error('NextAuth GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function wrappedPOST(req: NextRequest) {
  try {
    return await handlers.POST(req);
  } catch (error) {
    console.error('NextAuth POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { wrappedGET as GET, wrappedPOST as POST };
