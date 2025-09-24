// src/app/[locale]/layout.tsx
import { Inter } from 'next/font/google';
import { Locale, locales, isValidLocale } from '../../lib/i18n/config';
import { NavigationBar } from '../../shared/components/UI';
import { notFound } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // Next.js 15: params is now a Promise
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  // Await params before using its properties
  const { locale } = await params;

  // Validate locale
  if (!isValidLocale(locale)) {
    notFound();
  }

  return (
    <div className={inter.className}>
      {/* Navigation Bar at the top */}
      <NavigationBar 
        locale={locale}
        currentPath={`/${locale}`}
      />
      
      {/* Main content area */}
      <main className="min-h-screen bg-white" style={{ paddingTop: '64px' }}>
        {children}
      </main>
    </div>
  );
}

// Generate static params for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Generate metadata - also needs to await params
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  
  // Validate locale for metadata
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