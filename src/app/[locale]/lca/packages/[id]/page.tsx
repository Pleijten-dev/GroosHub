import { Suspense } from 'react';
import PackageEditorClient from '@/features/lca/components/packages/PackageEditorClient';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PackageEditorPage({ params }: PageProps) {
  const { locale, id } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-base">
      <div className="max-w-5xl mx-auto">
        <Suspense fallback={<div>Loading...</div>}>
          <PackageEditorClient locale={locale as 'nl' | 'en'} packageId={id} />
        </Suspense>
      </div>
    </div>
  );
}
