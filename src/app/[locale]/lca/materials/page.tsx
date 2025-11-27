import { Suspense } from 'react';
import MaterialsPageClient from '@/features/lca/components/materials/MaterialsPageClient';

export default async function MaterialsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;

  return (
    <div className="container mx-auto px-base py-lg">
      <Suspense fallback={<div>Loading...</div>}>
        <MaterialsPageClient locale={locale as 'nl' | 'en'} />
      </Suspense>
    </div>
  );
}
