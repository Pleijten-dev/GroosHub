import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ExtremeLocationFinder } from '@/features/location/components/ExtremeLocationFinder';

interface LocationDemographicsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function LocationDemographicsPage({ params }: LocationDemographicsPageProps) {
  const session = await auth();
  const { locale } = await params;

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect(`/${locale}/login?callbackUrl=/${locale}/admin/location-demographics`);
  }

  // Redirect to home if not admin
  if (session.user.role !== 'admin') {
    redirect(`/${locale}`);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-base py-base flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {locale === 'nl' ? 'Locatie Demografie Test' : 'Location Demographics Test'}
            </h1>
            <p className="text-sm text-gray-500">
              {locale === 'nl'
                ? 'CBS Kerncijfers analyse voor alle wijken'
                : 'CBS Key figures analysis for all districts'}
            </p>
          </div>
          <a
            href={`/${locale}/admin`}
            className="px-base py-sm bg-gray-100 hover:bg-gray-200 rounded-base text-sm font-medium transition-colors"
          >
            {locale === 'nl' ? 'Terug naar Admin' : 'Back to Admin'}
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-base py-lg">
        <ExtremeLocationFinder locale={locale} />
      </main>
    </div>
  );
}
