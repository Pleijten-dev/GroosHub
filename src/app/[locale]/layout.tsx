// src/app/[locale]/layout.tsx
import { Inter } from 'next/font/google';
import { Locale, locales, isValidLocale } from '../../lib/i18n/config';
import { NavigationBar } from '../../shared/components/UI';
import { notFound, redirect } from 'next/navigation';
import { auth } from '../../lib/auth';
import { headers } from 'next/headers';

const inter = Inter({ subsets: ['latin'] });

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const session = await auth();

  // Get current pathname from headers (set by proxy.ts)
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || '';
  console.log('[layout] Pathname from headers:', pathname);

  // Check if we're on the landing page (hide navbar there)
  // Only match exact landing page paths, not empty strings
  const isLandingPage = pathname === `/${locale}` || pathname === `/${locale}/`;

  // Handle must_change_password redirect (server-side)
  if (session?.user) {
    const mustChangePassword = session.user.must_change_password;
    const isChangePasswordPage = pathname.includes('/change-password');
    const isLoginPage = pathname.includes('/login');
    console.log('[layout] User:', { email: session.user.email, mustChangePassword, isChangePasswordPage, isLoginPage });

    // Skip redirect logic for login page (handled by login form)
    if (!isLoginPage) {
      if (mustChangePassword && !isChangePasswordPage) {
        // User must change password but not on change-password page
        redirect(`/${locale}/change-password`);
      }

      if (!mustChangePassword && isChangePasswordPage) {
        // User doesn't need to change password but is on change-password page
        redirect(`/${locale}`);
      }
    }
  }

  return (
    <div className={inter.className}>
      {/* Navigation Bar at the top - hidden on landing page */}
      {!isLandingPage && (
        <NavigationBar
          locale={locale}
          currentPath={`/${locale}`}
          user={
            session?.user
              ? {
                  id: session.user.id,
                  name: session.user.name || '',
                  email: session.user.email || '',
                  role: session.user.role,
                }
              : undefined
          }
        />
      )}

      {/* Main content area with proper padding for fixed navbar (only when navbar visible) */}
      <main className="min-h-screen bg-white" style={{ paddingTop: isLandingPage ? '0' : '64px' }}>
        {children}
      </main>
    </div>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  
  if (!isValidLocale(locale)) {
    return {
      title: 'GroosHub',
      description: 'Comprehensive urban development and project analysis platform',
    };
  }

  const titles = {
    nl: 'GroosHub',
    en: 'GroosHub'
  };
  
  const descriptions = {
    nl: 'Uitgebreid stedelijke ontwikkeling en project analyse platform',
    en: 'Comprehensive urban development and project analysis platform'
  };

  return {
    title: titles[locale as Locale],
    description: descriptions[locale as Locale],
    other: {
      'language': locale,
    },
  };
}