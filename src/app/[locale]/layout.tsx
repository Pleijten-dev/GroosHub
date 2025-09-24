// src/app/[locale]/layout.tsx
import { Inter } from 'next/font/google';
import { Locale, locales, isValidLocale } from '../../lib/i18n/config';
import { notFound } from 'next/navigation';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default function RootLayout({
  children,
  params: { locale },
}: RootLayoutProps) {
  // Validate locale
  if (!isValidLocale(locale)) {
    notFound();
  }

  return (
    <html lang={locale} dir="ltr">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

// Generate static params for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Generate metadata
export function generateMetadata({ params }: { params: { locale: Locale } }) {
  return {
    title: 'Location Analysis App',
    description: 'Comprehensive location data analysis with CBS data',
    language: params.locale,
  };
}