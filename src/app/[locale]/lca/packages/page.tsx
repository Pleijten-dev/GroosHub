import { Suspense } from 'react';
import PackageListClient from '@/features/lca/components/packages/PackageListClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function PackagesPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-base">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<div>Loading...</div>}>
          <PackageListClient locale={locale as 'nl' | 'en'} />
        </Suspense>
      </div>
    </div>
  );
}
