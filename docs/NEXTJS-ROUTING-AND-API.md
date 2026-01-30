# Next.js 16 Routing and API Configuration

**Last Updated:** January 29, 2026

This document covers Next.js 16 routing patterns, API route configuration, and common pitfalls to avoid in the GroosHub application.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Dynamic Route Parameters](#dynamic-route-parameters)
3. [Locale-Prefixed API Routes](#locale-prefixed-api-routes)
4. [Proxy Configuration](#proxy-configuration)
5. [Common Pitfalls](#common-pitfalls)
6. [Troubleshooting](#troubleshooting)

---

## Project Structure

### App Router Layout

```
src/
├── app/
│   ├── api/                    # API routes (not locale-prefixed)
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   ├── health/
│   │   ├── projects/
│   │   │   ├── [id]/          # Dynamic segment - use consistent naming!
│   │   │   │   ├── files/
│   │   │   │   ├── notes/
│   │   │   │   ├── tasks/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   └── ...
│   ├── [locale]/              # Locale dynamic segment (nl, en)
│   │   ├── login/
│   │   ├── ai-assistant/
│   │   ├── location/
│   │   └── ...
│   ├── layout.tsx
│   └── page.tsx
├── proxy.ts                   # Next.js 16 proxy (formerly middleware)
└── ...
```

### Key Points

- **API routes** live in `app/api/` (NOT under `app/[locale]/api/`)
- **Page routes** live in `app/[locale]/` for internationalization
- **Proxy** (`proxy.ts`) handles authentication and route protection
- **Rewrites** in `next.config.ts` handle locale-prefixed API routes

---

## Dynamic Route Parameters

### Critical Rule: Consistent Parameter Names

**Next.js 16 requires all dynamic segments at the same path level to use the same parameter name.**

#### Wrong - Will Cause Runtime Errors

```
src/app/api/projects/
├── [id]/           # Uses 'id'
│   └── route.ts
└── [projectId]/    # Uses 'projectId' - CONFLICT!
    └── notes/
        └── route.ts
```

This causes the error:
```
Error: You cannot use different slug names for the same dynamic path ('id' !== 'projectId')
```

#### Correct - Consistent Naming

```
src/app/api/projects/
└── [id]/           # All routes use 'id'
    ├── route.ts
    ├── notes/
    │   └── route.ts
    ├── tasks/
    │   └── route.ts
    └── ...
```

### Accessing Parameters in Route Handlers

```typescript
// In Next.js 16, params is a Promise
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Use id...
}
```

If you need a different variable name internally, destructure with aliasing:

```typescript
const { id: projectId } = await params;
// Now use projectId in your code
```

---

## Locale-Prefixed API Routes

### The Problem

When a user's browser is set to Dutch locale, API calls might go to `/nl/api/health` instead of `/api/health`. Without proper configuration:

1. Next.js sees `/nl/api/health`
2. It matches `nl` to the `[locale]` dynamic segment
3. It looks for `app/[locale]/api/health/route.ts`
4. This doesn't exist → 404 error

### The Solution: next.config.ts Rewrites

Use `beforeFiles` rewrites to map locale-prefixed API routes to the actual API routes:

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // beforeFiles rewrites run before filesystem routes
      beforeFiles: [
        // Rewrite locale-prefixed API routes to /api/*
        {
          source: '/nl/api/:path*',
          destination: '/api/:path*',
        },
        {
          source: '/en/api/:path*',
          destination: '/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
```

### Why Not Use Proxy Rewrites?

We initially tried using `NextResponse.rewrite()` in the proxy:

```typescript
// DON'T DO THIS - causes requests to hang
if (pathname.match(/^\/(nl|en)\/api\/(.*)/)) {
  const url = request.nextUrl.clone();
  url.pathname = `/api/${match[2]}`;
  return NextResponse.rewrite(url);
}
```

**Problems with proxy rewrites for internal routes:**
- Requests can hang indefinitely
- Less reliable than config-based rewrites
- Harder to debug

**Use `next.config.ts` rewrites for:**
- Static path mappings
- Internal route rewrites
- Locale-prefixed route handling

**Use proxy for:**
- Dynamic logic (authentication checks)
- Header/cookie manipulation
- Conditional redirects

---

## Proxy Configuration

### Next.js 16 Changes

In Next.js 16, `middleware.ts` was renamed to `proxy.ts`. The functionality is identical.

### Current Proxy Setup

```typescript
// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip all API routes - they're handled by next.config.ts rewrites
  if (pathname.includes('/api/')) {
    return NextResponse.next();
  }

  // Only process GET requests for page routes
  if (request.method !== 'GET') {
    return NextResponse.next();
  }

  // Authentication logic for pages...
  const locale = pathname.startsWith('/en') ? 'en' : 'nl';

  const publicRoutes = ['/nl/login', '/en/login', '/nl/change-password', '/en/change-password'];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionToken =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value;

  if (!sessionToken) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  // Exclude /api/* from proxy - handled by next.config.ts
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Execution Order

Understanding the request execution order is critical:

1. `headers` from next.config.js
2. `redirects` from next.config.js
3. **Proxy** (proxy.ts)
4. **`beforeFiles` rewrites** from next.config.js ← Handles `/nl/api/*` → `/api/*`
5. Filesystem routes (`app/api/`, `app/[locale]/`, etc.)
6. `afterFiles` rewrites
7. `fallback` rewrites

---

## Common Pitfalls

### 1. Inconsistent Dynamic Segment Names

**Symptom:** 504 errors on all API routes, error message about slug names

**Cause:** Two folders at the same level with different parameter names (e.g., `[id]` and `[projectId]`)

**Fix:** Rename to use consistent parameter names

### 2. Locale-Prefixed API Calls Failing

**Symptom:** `/nl/api/health` returns 404, `/api/health` works

**Cause:** Missing rewrites in next.config.ts

**Fix:** Add beforeFiles rewrites for each locale

### 3. Proxy Rewrites Causing Hangs

**Symptom:** Requests to rewritten paths hang indefinitely

**Cause:** Using `NextResponse.rewrite()` in proxy for internal routes

**Fix:** Use `next.config.ts` rewrites instead

### 4. API Routes Not Excluded from Proxy

**Symptom:** API routes being processed by authentication proxy

**Cause:** Matcher not excluding API paths correctly

**Fix:** Ensure matcher excludes `/api/*` or check `pathname.includes('/api/')` in proxy

---

## Troubleshooting

### Debug Checklist

1. **Check for parameter conflicts:**
   ```bash
   # List all dynamic route folders
   find src/app/api -type d -name '\[*\]' | sort
   ```
   Verify no two folders at the same level have different names.

2. **Verify rewrites are configured:**
   ```typescript
   // next.config.ts should have beforeFiles rewrites
   // for /nl/api/* and /en/api/*
   ```

3. **Check proxy matcher:**
   The matcher should exclude `/api/*` paths:
   ```typescript
   matcher: ['/((?!api|_next/static|...).*)',]
   ```

4. **Test API routes directly:**
   ```bash
   curl https://your-app.vercel.app/api/health
   curl https://your-app.vercel.app/nl/api/health
   ```
   Both should return the same response.

### Vercel Logs to Watch For

- `504 Gateway Timeout` - Often indicates routing loops or hanging rewrites
- `You cannot use different slug names` - Dynamic parameter naming conflict
- `404 Not Found` on locale-prefixed APIs - Missing rewrites

### Local Development

To test routing locally:

```bash
pnpm dev
# Then test both:
curl http://localhost:3000/api/health
curl http://localhost:3000/nl/api/health
```

---

## References

- [Next.js 16 Proxy Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Next.js Rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)
- [Next.js Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
