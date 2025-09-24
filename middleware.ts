// middleware.ts (place in project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { defaultLocale, locales, Locale } from './src/lib/i18n/config';

// Get locale from pathname
function getLocale(pathname: string): string {
  const segments = pathname.split('/');
  const firstSegment = segments[1];
  
  if (locales.includes(firstSegment as Locale)) {
    return firstSegment;
  }
  
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip internal Next.js paths and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') // Skip files (images, etc.)
  ) {
    return NextResponse.next();
  }

  // Check if pathname starts with a locale
  const pathnameHasLocale = locales.some(
    (locale: Locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Redirect root path to default locale
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(`/${defaultLocale}`, request.url)
    );
  }

  // Redirect if no locale in pathname
  if (!pathnameHasLocale) {
    // Get preferred locale from Accept-Language header
    const acceptLanguage = request.headers.get('Accept-Language') || '';
    const preferredLocale = acceptLanguage
      .split(',')[0]
      ?.split('-')[0];
    
    const locale = locales.includes(preferredLocale as Locale) 
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
    // Match all paths except:
    // - API routes (/api/...)
    // - Next.js internal routes (/_next/...)  
    // - Static files (favicon.ico, etc.)
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};