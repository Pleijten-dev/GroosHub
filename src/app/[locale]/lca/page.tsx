import Link from 'next/link';

export const metadata = {
  title: 'LCA Calculator | GroosHub',
  description: 'Calculate the environmental impact of your building projects according to Dutch MPG standards'
};

/**
 * LCA Calculator Landing Page
 *
 * Main entry point for the LCA (Life Cycle Assessment) calculator
 * Provides options for Quick Start or Advanced calculation
 */
export default async function LCAPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;

  const t = getTranslations(locale as 'nl' | 'en');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-base">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <header className="text-center mb-3xl pt-2xl">
          <h1 className="text-5xl font-bold text-gray-900 mb-base">
            {t.title}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t.subtitle}
          </p>
        </header>

        {/* Quick Start Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl mb-3xl">
          {/* Quick Start Option */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-lg p-2xl hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-lg">
              <div className="text-5xl">⚡</div>
              <div className="bg-primary/20 text-primary text-xs font-semibold px-sm py-xs rounded-full">
                {t.recommended}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-base">
              {t.quickStart}
            </h2>

            <p className="text-gray-700 mb-xl">
              {t.quickStartDescription}
            </p>

            <ul className="space-y-sm mb-xl">
              <li className="flex items-start gap-sm">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">{t.quickFeature1}</span>
              </li>
              <li className="flex items-start gap-sm">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">{t.quickFeature2}</span>
              </li>
              <li className="flex items-start gap-sm">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">{t.quickFeature3}</span>
              </li>
              <li className="flex items-start gap-sm">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-sm text-gray-700">{t.quickFeature4}</span>
              </li>
            </ul>

            <Link
              href={`/${locale}/lca/quick-start`}
              className="block w-full px-lg py-base bg-primary text-white text-center font-semibold rounded-base hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg"
            >
              {t.startQuickCalculation}
            </Link>
          </div>

          {/* Advanced Option */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-2xl hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-lg">
              <div className="text-5xl">🔬</div>
              <div className="bg-gray-200 text-gray-700 text-xs font-semibold px-sm py-xs rounded-full">
                {t.comingSoon}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-base">
              {t.advancedMode}
            </h2>

            <p className="text-gray-700 mb-xl">
              {t.advancedDescription}
            </p>

            <ul className="space-y-sm mb-xl">
              <li className="flex items-start gap-sm">
                <span className="text-blue-600 font-bold">•</span>
                <span className="text-sm text-gray-700">{t.advancedFeature1}</span>
              </li>
              <li className="flex items-start gap-sm">
                <span className="text-blue-600 font-bold">•</span>
                <span className="text-sm text-gray-700">{t.advancedFeature2}</span>
              </li>
              <li className="flex items-start gap-sm">
                <span className="text-blue-600 font-bold">•</span>
                <span className="text-sm text-gray-700">{t.advancedFeature3}</span>
              </li>
              <li className="flex items-start gap-sm">
                <span className="text-blue-600 font-bold">•</span>
                <span className="text-sm text-gray-700">{t.advancedFeature4}</span>
              </li>
            </ul>

            <button
              disabled
              className="block w-full px-lg py-base bg-gray-300 text-gray-500 text-center font-semibold rounded-base cursor-not-allowed"
            >
              {t.comingSoonButton}
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-3xl">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-xl">
            {t.whyUseLCA}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-base">
            <FeatureCard
              icon="🎯"
              title={t.feature1Title}
              description={t.feature1Desc}
            />
            <FeatureCard
              icon="📊"
              title={t.feature2Title}
              description={t.feature2Desc}
            />
            <FeatureCard
              icon="🏗️"
              title={t.feature3Title}
              description={t.feature3Desc}
            />
            <FeatureCard
              icon="🌱"
              title={t.feature4Title}
              description={t.feature4Desc}
            />
          </div>
        </div>

        {/* MPG Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-xl mb-3xl">
          <h3 className="text-2xl font-semibold text-blue-900 mb-base">
            {t.mpgInfoTitle}
          </h3>
          <p className="text-blue-800 mb-base">
            {t.mpgInfoText}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-base mt-lg">
            <div className="bg-white rounded-base p-base">
              <div className="text-2xl font-bold text-blue-600 mb-xs">2025</div>
              <div className="text-sm text-gray-600">{t.mpg2025}</div>
            </div>
            <div className="bg-white rounded-base p-base">
              <div className="text-2xl font-bold text-blue-600 mb-xs">2030</div>
              <div className="text-sm text-gray-600">{t.mpg2030}</div>
            </div>
            <div className="bg-white rounded-base p-base">
              <div className="text-2xl font-bold text-blue-600 mb-xs">EN 15978</div>
              <div className="text-sm text-gray-600">{t.en15978}</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-primary to-secondary text-white rounded-lg p-2xl">
          <h2 className="text-3xl font-bold mb-base">
            {t.readyToStart}
          </h2>
          <p className="text-xl mb-xl opacity-90">
            {t.readyToStartDesc}
          </p>
          <Link
            href={`/${locale}/lca/quick-start`}
            className="inline-block px-2xl py-lg bg-white text-primary font-bold rounded-base hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl text-lg"
          >
            {t.startNow}
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Feature Card Component
 */
function FeatureCard({
  icon,
  title,
  description
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-lg hover:shadow-md transition-shadow">
      <div className="text-4xl mb-base">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-sm">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

/**
 * Get translations
 */
function getTranslations(locale: 'nl' | 'en') {
  return locale === 'nl' ? {
    title: 'LCA Calculator',
    subtitle: 'Bereken de milieuprestatie van uw bouwproject volgens de Nederlandse MPG-methode',
    recommended: 'Aanbevolen',
    comingSoon: 'Binnenkort',
    quickStart: 'Quick Start',
    quickStartDescription: 'Snel een eerste inschatting maken met standaard bouwsystemen en isolatieniveaus. Ideaal voor voorlopige berekeningen en quick scans.',
    quickFeature1: 'Binnen 2 minuten resultaat',
    quickFeature2: 'Standaard Nederlandse bouwsystemen',
    quickFeature3: 'Vooraf gedefinieerde templates',
    quickFeature4: 'Direct MPG-compliance check',
    startQuickCalculation: 'Start Quick Calculation →',
    advancedMode: 'Geavanceerde Modus',
    advancedDescription: 'Gedetailleerde LCA met volledige controle over alle materiaalkeuzes en elementen. Voor nauwkeurige professionele berekeningen.',
    advancedFeature1: 'Volledige materiaalselectie (Ökobaudat)',
    advancedFeature2: 'Element-by-element opbouw',
    advancedFeature3: 'Aangepaste lifespans en transport',
    advancedFeature4: 'Gedetailleerde rapportage',
    comingSoonButton: 'Binnenkort Beschikbaar',
    whyUseLCA: 'Waarom LCA Calculator gebruiken?',
    feature1Title: 'MPG Compliance',
    feature1Desc: 'Voldoe aan de Nederlandse wettelijke eisen voor milieuprestatieberekeningen',
    feature2Title: 'Data-Driven',
    feature2Desc: 'Gebaseerd op Ökobaudat EPD database met 900+ geverifieerde materialen',
    feature3Title: 'Complete Lifecycle',
    feature3Desc: 'Berekent alle fases A1-D volgens EN 15978 standaard',
    feature4Title: 'Optimalisatie',
    feature4Desc: 'Vergelijk materialen en ontwerpen om de milieu-impact te minimaliseren',
    mpgInfoTitle: '📋 Over de MPG-methode',
    mpgInfoText: 'De Milieuprestatie Gebouwen (MPG) is de Nederlandse rekenmethode voor het bepalen van de milieu-impact van gebouwen over hun gehele levensduur. Vanaf 2025 is een MPG-berekening verplicht voor alle nieuwbouwprojecten.',
    mpg2025: 'MPG 2025 limiet actief',
    mpg2030: 'Strengere limiet vanaf 2030',
    en15978: 'Volgens EU standaard',
    readyToStart: 'Klaar om te beginnen?',
    readyToStartDesc: 'Start nu met een Quick Calculation en ontdek binnen enkele minuten de milieuprestatie van uw project',
    startNow: 'Start Nu'
  } : {
    title: 'LCA Calculator',
    subtitle: 'Calculate the environmental performance of your building project according to Dutch MPG methodology',
    recommended: 'Recommended',
    comingSoon: 'Coming Soon',
    quickStart: 'Quick Start',
    quickStartDescription: 'Quickly estimate environmental impact using standard construction systems and insulation levels. Ideal for preliminary calculations and quick scans.',
    quickFeature1: 'Results within 2 minutes',
    quickFeature2: 'Standard Dutch construction systems',
    quickFeature3: 'Pre-defined templates',
    quickFeature4: 'Instant MPG compliance check',
    startQuickCalculation: 'Start Quick Calculation →',
    advancedMode: 'Advanced Mode',
    advancedDescription: 'Detailed LCA with full control over all material choices and elements. For accurate professional calculations.',
    advancedFeature1: 'Full material selection (Ökobaudat)',
    advancedFeature2: 'Element-by-element construction',
    advancedFeature3: 'Custom lifespans and transport',
    advancedFeature4: 'Detailed reporting',
    comingSoonButton: 'Coming Soon',
    whyUseLCA: 'Why Use LCA Calculator?',
    feature1Title: 'MPG Compliance',
    feature1Desc: 'Meet Dutch legal requirements for environmental performance calculations',
    feature2Title: 'Data-Driven',
    feature2Desc: 'Based on Ökobaudat EPD database with 900+ verified materials',
    feature3Title: 'Complete Lifecycle',
    feature3Desc: 'Calculates all phases A1-D according to EN 15978 standard',
    feature4Title: 'Optimization',
    feature4Desc: 'Compare materials and designs to minimize environmental impact',
    mpgInfoTitle: '📋 About MPG Methodology',
    mpgInfoText: 'The Environmental Performance of Buildings (MPG) is the Dutch calculation method for determining the environmental impact of buildings over their entire lifecycle. From 2025, an MPG calculation is mandatory for all new construction projects.',
    mpg2025: 'MPG 2025 limit active',
    mpg2030: 'Stricter limit from 2030',
    en15978: 'According to EU standard',
    readyToStart: 'Ready to Get Started?',
    readyToStartDesc: 'Start with a Quick Calculation now and discover your project\'s environmental performance within minutes',
    startNow: 'Start Now'
  };
}
