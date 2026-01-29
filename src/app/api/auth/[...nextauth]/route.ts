import { handlers } from '@/lib/auth';
import { NextRequest } from 'next/server';

// Wrap handlers to add logging
const wrappedGET = async (req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) => {
  const params = await ctx.params;
  console.log(`🔑 [NextAuth API] GET /api/auth/${params.nextauth?.join('/')}`);
  return handlers.GET(req, ctx);
};

const wrappedPOST = async (req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) => {
  const params = await ctx.params;
  console.log(`🔑 [NextAuth API] POST /api/auth/${params.nextauth?.join('/')}`);
  return handlers.POST(req, ctx);
};

export { wrappedGET as GET, wrappedPOST as POST };
