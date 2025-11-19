// src/app/[locale]/layout.tsx
import { Inter } from 'next/font/google';
import { Locale, locales, isValidLocale } from '../../lib/i18n/config';
import { NavigationBar } from '../../shared/components/UI';
import { notFound } from 'next/navigation';
import { auth } from '../../lib/auth';

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

  return (
    <div className={`${inter.className} page-background`}>
      {/* Navigation Bar at the top */}
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

      {/* Main content area */}
      <main className="flex flex-col h-screen">
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
      title: 'GroosHub - Urban Development Platform',
      description: 'Comprehensive urban development and project analysis platform',
    };
  }

  const titles = {
    nl: 'GroosHub - Stedelijke Ontwikkeling Platform',
    en: 'GroosHub - Urban Development Platform'
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