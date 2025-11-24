// ============================================
// RESULTS DASHBOARD COMPONENT
// ============================================

'use client';

import { useState } from 'react';

interface Project {
  id: string;
  name: string;
  building_type: string;
  construction_system: string;
  gross_floor_area: number;
  study_period: number;
  total_gwp_per_m2_year: number | null;
  mpg_reference_value: number | null;
  is_compliant: boolean | null;
  total_gwp_a1_a3: number | null;
  total_gwp_a4: number | null;
  total_gwp_a5: number | null;
  total_gwp_b4: number | null;
  total_gwp_c: number | null;
  total_gwp_d: number | null;
  total_gwp_sum: number | null;
  operational_carbon: number | null;
  energy_label: string | null;
}

interface Reference {
  mpg_limit: number;
  operational_carbon: number;
}

interface ResultsDashboardProps {
  project: Project;
  reference: Reference | null;
  locale: 'nl' | 'en';
}

export function ResultsDashboard({
  project,
  reference,
  locale
}: ResultsDashboardProps) {
  const [showCalculation, setShowCalculation] = useState(false);

  const t = getTranslations(locale);

  // Check if project has been calculated
  const hasResults = project.total_gwp_per_m2_year !== null;

  // Use project values or defaults
  const mpgValue = project.total_gwp_per_m2_year || 0;
  const mpgLimit = reference?.mpg_limit || project.mpg_reference_value || 0;
  const isCompliant = project.is_compliant ?? (mpgValue <= mpgLimit);

  // Phase values (in kg CO₂-eq)
  const a1a3 = project.total_gwp_a1_a3 || 0;
  const a4 = project.total_gwp_a4 || 0;
  const a5 = project.total_gwp_a5 || 0;
  const b4 = project.total_gwp_b4 || 0;
  const c = project.total_gwp_c || 0;
  const d = project.total_gwp_d || 0;
  const totalAC = project.total_gwp_sum || (a1a3 + a4 + a5 + b4 + c);

  // Operational carbon
  const operationalPerM2Year = reference?.operational_carbon || project.operational_carbon || 0;
  const operationalTotal = operationalPerM2Year * project.gross_floor_area * project.study_period;

  return (
    <div className="space-y-xl">
      {/* Calculation Status */}
      {!hasResults && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-lg">
          <div className="flex items-start gap-base">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-900 mb-sm">{t.notCalculated}</h3>
              <p className="text-sm text-yellow-800 mb-base">{t.notCalculatedDesc}</p>
              <button
                onClick={() => setShowCalculation(true)}
                className="px-base py-sm bg-yellow-600 text-white rounded-base hover:bg-yellow-700 transition-colors text-sm font-medium"
              >
                {t.triggerCalculation}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main MPG Score Card */}
      <div className={`bg-gradient-to-br ${
        isCompliant ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'
      } text-white rounded-lg p-2xl shadow-lg`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm opacity-90 mb-sm">
              {t.mpgLabel}
            </div>
            <div className="text-5xl font-bold">
              {mpgValue.toFixed(2)}
            </div>
            <div className="text-lg mt-sm">{t.mpgUnit}</div>
          </div>
          <div className="text-right">
            {isCompliant ? (
              <div className="flex items-center gap-sm bg-white/20 backdrop-blur rounded-full px-lg py-sm">
                <span className="text-2xl">✓</span>
                <span className="font-semibold">{t.compliant}</span>
              </div>
            ) : (
              <div className="flex items-center gap-sm bg-white/20 backdrop-blur rounded-full px-lg py-sm">
                <span className="text-2xl">⚠</span>
                <span className="font-semibold">{t.notCompliant}</span>
              </div>
            )}
            <div className="text-sm mt-base opacity-90">
              {t.limit}: {mpgLimit.toFixed(2)} {t.mpgUnit}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-xl pt-xl border-t border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div>
              <div className="text-sm opacity-75">{t.embodiedCarbon}</div>
              <div className="text-2xl font-semibold">
                {(totalAC / 1000).toFixed(1)} {t.tons}
              </div>
              <div className="text-xs opacity-75 mt-xs">
                {(totalAC / project.gross_floor_area / project.study_period).toFixed(2)} kg/m²/yr
              </div>
            </div>
            <div>
              <div className="text-sm opacity-75">{t.operationalCarbon}</div>
              <div className="text-2xl font-semibold">
                {(operationalTotal / 1000).toFixed(1)} {t.tons}
              </div>
              <div className="text-xs opacity-75 mt-xs">
                {operationalPerM2Year.toFixed(2)} kg/m²/yr × {project.study_period} yr
              </div>
            </div>
            <div>
              <div className="text-sm opacity-75">{t.totalImpact}</div>
              <div className="text-2xl font-semibold">
                {((totalAC + operationalTotal) / 1000).toFixed(1)} {t.tons}
              </div>
              <div className="text-xs opacity-75 mt-xs">
                {((totalAC / project.gross_floor_area / project.study_period) + operationalPerM2Year).toFixed(2)} kg/m²/yr
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LCA Phases Breakdown */}
      {hasResults && (
        <div className="bg-white p-xl rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-lg">{t.phaseBreakdown}</h2>

          <div className="space-y-base">
            <PhaseBar label="A1-A3 (Production)" value={a1a3} total={totalAC} color="bg-blue-500" />
            <PhaseBar label="A4 (Transport)" value={a4} total={totalAC} color="bg-blue-400" />
            <PhaseBar label="A5 (Construction)" value={a5} total={totalAC} color="bg-blue-300" />
            <PhaseBar label="B4 (Replacement)" value={b4} total={totalAC} color="bg-orange-400" />
            <PhaseBar label="C (End of Life)" value={c} total={totalAC} color="bg-red-400" />

            {d !== 0 && (
              <div className="pt-base mt-base border-t border-gray-200">
                <PhaseBar
                  label="D (Benefits)"
                  value={Math.abs(d)}
                  total={totalAC}
                  color={d < 0 ? "bg-green-500" : "bg-red-500"}
                  isNegative={d < 0}
                />
              </div>
            )}
          </div>

          <div className="mt-lg pt-lg border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900">{t.totalAC}</span>
              <span className="text-lg font-bold text-gray-900">
                {(totalAC / 1000).toFixed(2)} {t.tons} CO₂-eq
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
        {/* Project Details */}
        <div className="bg-white p-xl rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-lg">{t.projectDetails}</h3>
          <dl className="space-y-base">
            <div>
              <dt className="text-sm text-gray-500">{t.buildingType}</dt>
              <dd className="font-medium text-gray-900 capitalize">{project.building_type}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{t.constructionSystem}</dt>
              <dd className="font-medium text-gray-900 capitalize">{project.construction_system}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{t.grossFloorArea}</dt>
              <dd className="font-medium text-gray-900">{project.gross_floor_area} m²</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{t.studyPeriod}</dt>
              <dd className="font-medium text-gray-900">{project.study_period} {t.years}</dd>
            </div>
            {project.energy_label && (
              <div>
                <dt className="text-sm text-gray-500">{t.energyLabel}</dt>
                <dd className="font-medium text-gray-900">{project.energy_label}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Calculation Info */}
        <div className="bg-white p-xl rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-lg">{t.methodology}</h3>
          <div className="space-y-base text-sm text-gray-700">
            <p>
              {locale === 'nl'
                ? 'Berekening volgens de Bepalingsmethode Milieuprestatie Gebouwen (MPG) 2025.'
                : 'Calculation according to the Dutch MPG 2025 methodology.'}
            </p>
            <p>
              {locale === 'nl'
                ? 'EPD-data uit Ökobaudat database, service lives uit NMD.'
                : 'EPD data from Ökobaudat database, service lives from NMD.'}
            </p>
            <div className="pt-base mt-base border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {locale === 'nl'
                  ? 'Voor officiële MPG-berekeningen dient altijd verificatie door een erkend bureau plaats te vinden.'
                  : 'For official MPG calculations, verification by a certified bureau is always required.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Trigger Modal (Placeholder) */}
      {showCalculation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-2xl max-w-md mx-base">
            <h3 className="text-xl font-semibold mb-base">
              {locale === 'nl' ? 'Berekening starten' : 'Start Calculation'}
            </h3>
            <p className="text-gray-600 mb-xl">
              {locale === 'nl'
                ? 'De calculator wordt momenteel nog ontwikkeld. Deze functie komt binnenkort beschikbaar.'
                : 'The calculator is currently under development. This feature will be available soon.'}
            </p>
            <button
              onClick={() => setShowCalculation(false)}
              className="w-full px-lg py-sm bg-primary text-white rounded-base hover:bg-primary/90"
            >
              {locale === 'nl' ? 'Sluiten' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Phase Bar Component
 */
function PhaseBar({
  label,
  value,
  total,
  color,
  isNegative = false
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  isNegative?: boolean;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-sm">
        <span className="text-sm font-medium text-gray-700">
          {isNegative && '- '}{label}
        </span>
        <span className="text-sm text-gray-600">
          {(value / 1000).toFixed(2)} tons ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

/**
 * Get translations
 */
function getTranslations(locale: 'nl' | 'en') {
  return locale === 'nl' ? {
    mpgLabel: 'Milieuprestatiecoëfficiënt (MPG)',
    mpgUnit: 'kg CO₂-eq/m²/jaar',
    compliant: 'Voldoet',
    notCompliant: 'Voldoet niet',
    limit: 'Limiet',
    embodiedCarbon: 'Belichaamde CO₂ (A-C)',
    operationalCarbon: 'Operationele CO₂ (B6)',
    totalImpact: 'Totale impact',
    tons: 'ton',
    phaseBreakdown: 'LCA Fasen Overzicht',
    totalAC: 'Totaal (A-C)',
    projectDetails: 'Project Details',
    buildingType: 'Woningtype',
    constructionSystem: 'Bouwsysteem',
    grossFloorArea: 'Gebruiksoppervlakte',
    studyPeriod: 'Studieperiode',
    years: 'jaar',
    energyLabel: 'Energielabel',
    methodology: 'Methodologie',
    notCalculated: 'Project nog niet berekend',
    notCalculatedDesc: 'Dit project heeft nog geen LCA-berekening. Klik op onderstaande knop om de berekening te starten.',
    triggerCalculation: 'Berekening starten'
  } : {
    mpgLabel: 'Environmental Performance Coefficient (MPG)',
    mpgUnit: 'kg CO₂-eq/m²/year',
    compliant: 'Compliant',
    notCompliant: 'Not Compliant',
    limit: 'Limit',
    embodiedCarbon: 'Embodied Carbon (A-C)',
    operationalCarbon: 'Operational Carbon (B6)',
    totalImpact: 'Total Impact',
    tons: 'tons',
    phaseBreakdown: 'LCA Phase Breakdown',
    totalAC: 'Total (A-C)',
    projectDetails: 'Project Details',
    buildingType: 'Building Type',
    constructionSystem: 'Construction System',
    grossFloorArea: 'Gross Floor Area',
    studyPeriod: 'Study Period',
    years: 'years',
    energyLabel: 'Energy Label',
    methodology: 'Methodology',
    notCalculated: 'Project Not Yet Calculated',
    notCalculatedDesc: 'This project does not have an LCA calculation yet. Click the button below to start the calculation.',
    triggerCalculation: 'Start Calculation'
  };
}

export default ResultsDashboard;
