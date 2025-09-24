// middleware.ts (place in project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { defaultLocale, locales } from './src/lib/i18n/config';

// Get locale from pathname
function getLocale(pathname: string): string {
  const segments = pathname.split('/');
  const firstSegment = segments[1];
  
  if (locales.includes(firstSegment as any)) {
    return firstSegment;
  }
  
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Check if pathname starts with a locale
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Redirect if no locale in pathname
  if (!pathnameHasLocale) {
    // Get preferred locale from Accept-Language header
    const acceptLanguage = request.headers.get('Accept-Language') || '';
    const preferredLocale = acceptLanguage
      .split(',')[0]
      ?.split('-')[0];
    
    const locale = locales.includes(preferredLocale as any) 
      ? preferredLocale 
      : defaultLocale;

    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip internal Next.js paths
    '/((?!api|_next|_vercel|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};