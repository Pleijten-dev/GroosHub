import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      hasDbUrl: !!process.env.POSTGRES_URL,
    }
  });
}
