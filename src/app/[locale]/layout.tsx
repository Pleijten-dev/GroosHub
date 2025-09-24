// src/app/[locale]/layout.tsx
import { Inter } from 'next/font/google';
import { Locale, locales, isValidLocale } from '../../lib/i18n/config';
import { NavigationBar } from '../../shared/components/UI';
import { notFound } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default function LocaleLayout({
  children,
  params: { locale },
}: LocaleLayoutProps) {
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

// Generate metadata
export function generateMetadata({ params }: { params: { locale: Locale } }) {
  const titles = {
    nl: 'GroosHub - Stedelijke Ontwikkeling Platform',
    en: 'GroosHub - Urban Development Platform'
  };
  
  const descriptions = {
    nl: 'Uitgebreid stedelijke ontwikkeling en project analyse platform',
    en: 'Comprehensive urban development and project analysis platform'
  };

  return {
    title: titles[params.locale],
    description: descriptions[params.locale],
    other: {
      'language': params.locale,
    },
  };
}