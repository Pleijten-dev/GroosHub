// ============================================
// RESULTS DASHBOARD COMPONENT
// ============================================
// TODO: Implement this component
// See: Documentation/LCA_IMPLEMENTATION_TODO.md - Phase 2.3

'use client';

import type { LCAResult } from '../../types';

interface ResultsDashboardProps {
  result: LCAResult;
  gfa: number;
  studyPeriod: number;
  operationalCarbon: number;
  mpgLimit: number;
}

export function ResultsDashboard({
  result,
  gfa,
  studyPeriod,
  operationalCarbon,
  mpgLimit
}: ResultsDashboardProps) {
  const embodiedPerM2Year = result.total_a_to_c / gfa / studyPeriod;
  const totalCarbon = embodiedPerM2Year + operationalCarbon;
  const isCompliant = embodiedPerM2Year <= mpgLimit;

  return (
    <div className="space-y-6">
      {/* TODO: Main MPG Score Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm opacity-90 mb-1">
              Milieuprestatiecoëfficiënt (MPG)
            </div>
            <div className="text-5xl font-bold">
              {embodiedPerM2Year.toFixed(2)}
            </div>
            <div className="text-lg mt-1">kg CO₂-eq/m²/jaar</div>
          </div>
          <div className="text-right">
            {isCompliant ? (
              <div className="flex items-center gap-2 bg-green-500 rounded-full px-4 py-2">
                ✓ Voldoet
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-red-500 rounded-full px-4 py-2">
                ⚠ Voldoet niet
              </div>
            )}
            <div className="text-sm mt-2 opacity-90">
              Limiet: {mpgLimit} kg CO₂/m²/jaar
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/20">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm opacity-75">Totaal belichaamde CO₂</div>
              <div className="text-2xl font-semibold">
                {(result.total_a_to_c / 1000).toFixed(1)} ton
              </div>
            </div>
            <div>
              <div className="text-sm opacity-75">
                Operationele CO₂ (75 jr)
              </div>
              <div className="text-2xl font-semibold">
                {(operationalCarbon * gfa * studyPeriod / 1000).toFixed(1)} ton
              </div>
            </div>
            <div>
              <div className="text-sm opacity-75">Totale impact</div>
              <div className="text-2xl font-semibold">
                {totalCarbon.toFixed(1)} kg/m²/jr
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TODO: Module D Card */}
      {/* TODO: Phase Breakdown Chart */}
      {/* TODO: Element Breakdown Chart */}
    </div>
  );
}

export default ResultsDashboard;
