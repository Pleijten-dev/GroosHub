/**
 * LCA Project Comparison Page
 *
 * Compare 2-4 LCA projects side-by-side with metrics and charts.
 *
 * @route /[locale]/lca/compare
 */

'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/shared/components/UI/MainLayout';
import { Sidebar, useSidebar } from '@/shared/components/UI/Sidebar';
import { LCATabNavigation } from '@/features/lca/components/navigation/LCATabNavigation';
import { Button } from '@/shared/components/UI/Button';
import {
  ProjectPicker,
  ComparisonTable,
  PhaseComparisonChart,
  type ProjectOption,
  type ComparisonProject,
  type PhaseData,
} from '@/features/lca/components/comparison';
import type { Locale } from '@/lib/i18n/config';

// ============================================
// TYPES
// ============================================

interface ComparePageProps {
  params: Promise<{ locale: Locale }>;
}

// ============================================
// CONSTANTS
// ============================================

const TRANSLATIONS = {
  nl: {
    title: 'Project Vergelijking',
    subtitle: 'Vergelijk meerdere projecten om de beste optie te vinden',
    selectProjects: 'Selecteer minimaal 2 projecten om te vergelijken',
    loading: 'Projecten laden...',
    error: 'Fout bij laden van projecten',
    noCalculated: 'Sommige geselecteerde projecten zijn nog niet berekend',
    calculateFirst: 'Bereken eerst',
    compare: 'Vergelijken',
    metricsTitle: 'Vergelijkingstabel',
    chartTitle: 'Fase Verdeling',
    backToDashboard: 'Terug naar Dashboard',
    exportComparison: 'Exporteer Vergelijking',
  },
  en: {
    title: 'Project Comparison',
    subtitle: 'Compare multiple projects to find the best option',
    selectProjects: 'Select at least 2 projects to compare',
    loading: 'Loading projects...',
    error: 'Error loading projects',
    noCalculated: 'Some selected projects have not been calculated yet',
    calculateFirst: 'Calculate first',
    compare: 'Compare',
    metricsTitle: 'Comparison Table',
    chartTitle: 'Phase Distribution',
    backToDashboard: 'Back to Dashboard',
    exportComparison: 'Export Comparison',
  },
};

// ============================================
// COMPONENT
// ============================================

export default function ComparePage({ params }: ComparePageProps) {
  const resolvedParams = use(params);
  const locale = resolvedParams.locale as 'nl' | 'en';
  const t = TRANSLATIONS[locale];
  const router = useRouter();

  const { isCollapsed, toggle } = useSidebar({
    defaultCollapsed: true,
    persistState: true,
    storageKey: 'lca-compare-sidebar-collapsed',
  });

  // State
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's projects on mount
  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/lca/projects');
        const data = await response.json();

        if (data.success) {
          setProjects(data.data);
        } else {
          setError(data.error || t.error);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(t.error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProjects();
  }, [t.error]);

  // Fetch comparison data when selection changes
  useEffect(() => {
    if (selectedIds.length < 2) {
      setComparisonData([]);
      return;
    }

    async function fetchComparisonData() {
      setIsComparing(true);
      try {
        // Fetch full data for each selected project
        const projectPromises = selectedIds.map(async (id) => {
          const response = await fetch(`/api/lca/projects/${id}`);
          const data = await response.json();
          return data.success ? data.data : null;
        });

        const results = await Promise.all(projectPromises);
        const validProjects = results.filter((p): p is ComparisonProject => p !== null);
        setComparisonData(validProjects);
      } catch (err) {
        console.error('Error fetching comparison data:', err);
      } finally {
        setIsComparing(false);
      }
    }

    fetchComparisonData();
  }, [selectedIds]);

  // Transform comparison data to phase chart format
  const phaseChartData: PhaseData[] = comparisonData
    .filter((p) => p.total_gwp_a1_a3 !== null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      a1_a3: p.total_gwp_a1_a3 || 0,
      a4: p.total_gwp_a4 || 0,
      a5: p.total_gwp_a5 || 0,
      b4: p.total_gwp_b4 || 0,
      c: p.total_gwp_c || 0,
      d: p.total_gwp_d || 0,
      total:
        (p.total_gwp_a1_a3 || 0) +
        (p.total_gwp_a4 || 0) +
        (p.total_gwp_a5 || 0) +
        (p.total_gwp_b4 || 0) +
        (p.total_gwp_c || 0) +
        (p.total_gwp_d || 0),
      isCompliant: p.is_compliant ?? false,
    }));

  // Check if any selected projects lack calculation data
  const hasUncalculatedProjects = comparisonData.some(
    (p) => p.total_gwp_per_m2_year === null
  );

  // Sidebar sections (minimal for comparison page)
  const sidebarSections = [
    {
      id: 'nav',
      title: locale === 'nl' ? 'Navigatie' : 'Navigation',
      content: (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${locale}/lca/dashboard`)}
            className="w-full justify-start"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            {t.backToDashboard}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout
      isCollapsed={isCollapsed}
      sidebar={
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={toggle}
          sections={sidebarSections}
          title={t.title}
          subtitle={t.subtitle}
          position="left"
          withNavbar={true}
        />
      }
    >
      <div className="flex flex-col h-full">
        {/* Tab Navigation */}
        <LCATabNavigation locale={locale} activeTab="compare" />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
                <p className="text-gray-600 mt-1">{t.subtitle}</p>
              </div>
            </div>

            {/* Project Picker */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {locale === 'nl' ? 'Selecteer Projecten' : 'Select Projects'}
              </h2>
              <ProjectPicker
                projects={projects}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                minSelection={2}
                maxSelection={4}
                locale={locale}
                isLoading={isLoading}
              />

              {selectedIds.length < 2 && !isLoading && (
                <p className="mt-3 text-sm text-gray-500">{t.selectProjects}</p>
              )}

              {hasUncalculatedProjects && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-700">{t.noCalculated}</p>
                </div>
              )}
            </div>

            {/* Loading State */}
            {isComparing && (
              <div className="flex items-center justify-center p-12">
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>{t.loading}</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Comparison Results */}
            {comparisonData.length >= 2 && !isComparing && (
              <>
                {/* Comparison Table */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {t.metricsTitle}
                    </h2>
                  </div>
                  <div className="p-4">
                    <ComparisonTable projects={comparisonData} locale={locale} />
                  </div>
                </div>

                {/* Phase Distribution Chart */}
                {phaseChartData.length >= 2 && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {t.chartTitle}
                      </h2>
                    </div>
                    <div className="p-4">
                      <PhaseComparisonChart
                        data={phaseChartData}
                        locale={locale}
                        height={350}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
