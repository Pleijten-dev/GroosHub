import { Suspense } from 'react';
import QuickStartForm from '@/features/lca/components/quick-start/QuickStartForm';

export const metadata = {
  title: 'LCA Quick Start | GroosHub',
  description: 'Snel een LCA-berekening maken voor uw bouwproject'
};

/**
 * LCA Quick Start Page
 *
 * Simplified form for quick LCA calculations using predefined construction templates
 */
export default async function LCAQuickStartPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-base">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-2xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-base">
            {locale === 'nl'
              ? 'LCA Quick Start'
              : 'LCA Quick Start'}
          </h1>
          <p className="text-lg text-gray-600">
            {locale === 'nl'
              ? 'Maak snel een eerste inschatting van de milieuprestatie van uw bouwproject'
              : 'Quickly estimate the environmental performance of your building project'}
          </p>
        </header>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-base mb-2xl">
          <InfoCard
            title={locale === 'nl' ? 'Snel resultaat' : 'Quick results'}
            description={
              locale === 'nl'
                ? 'Binnen 2 minuten een eerste MPG-indicatie'
                : 'Get initial MPG indication within 2 minutes'
            }
          />
          <InfoCard
            title={locale === 'nl' ? 'Standaard templates' : 'Standard templates'}
            description={
              locale === 'nl'
                ? 'Gebaseerd op gangbare Nederlandse bouwsystemen'
                : 'Based on common Dutch construction systems'
            }
          />
          <InfoCard
            title={locale === 'nl' ? 'MPG-toets' : 'MPG assessment'}
            description={
              locale === 'nl'
                ? 'Direct zien of u voldoet aan de MPG-eis'
                : 'Immediately see if you meet MPG requirements'
            }
          />
        </div>

        {/* Quick Start Form */}
        <Suspense fallback={<FormSkeleton />}>
          <QuickStartForm locale={locale as 'nl' | 'en'} />
        </Suspense>

        {/* Additional Info */}
        <div className="mt-2xl p-lg bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-base">
            {locale === 'nl' ? 'Let op' : 'Please note'}
          </h3>
          <ul className="space-y-sm text-blue-800">
            <li>
              {locale === 'nl'
                ? '• Deze Quick Start geeft een indicatie op basis van standaard templates'
                : '• This Quick Start provides an indication based on standard templates'}
            </li>
            <li>
              {locale === 'nl'
                ? '• Voor een nauwkeurigere berekening, gebruik de Custom Mode'
                : '• For a more accurate calculation, use Custom Mode'}
            </li>
            <li>
              {locale === 'nl'
                ? '• De berekening is conform Bepalingsmethode Milieuprestatie Gebouwen 2025'
                : '• Calculation complies with Dutch MPG methodology 2025'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Info Card Component
 */
function InfoCard({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-lg rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900 mb-sm">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

/**
 * Form Loading Skeleton
 */
function FormSkeleton() {
  return (
    <div className="bg-white p-2xl rounded-lg border border-gray-200 shadow-sm">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-lg"></div>
        <div className="space-y-base">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
