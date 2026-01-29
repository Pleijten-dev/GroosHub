import { handlers } from '@/lib/auth';
import { NextRequest } from 'next/server';

// Wrap handlers to add logging
const wrappedGET = async (req: NextRequest) => {
  const url = new URL(req.url);
  console.log(`🔑 [NextAuth API] GET ${url.pathname}`);
  return handlers.GET(req);
};

const wrappedPOST = async (req: NextRequest) => {
  const url = new URL(req.url);
  console.log(`🔑 [NextAuth API] POST ${url.pathname}`);
  return handlers.POST(req);
};

export { wrappedGET as GET, wrappedPOST as POST };
