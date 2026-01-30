/**
 * Admin LCA Testing Suite
 *
 * Testing page for LCA backend components and API endpoints.
 * Allows testing of:
 * - Material search and benchmarking
 * - Element/Layer CRUD operations
 * - Project comparison
 * - Calculation triggers
 *
 * @route /[locale]/admin/lca-test
 */

'use client';

import React, { useState, use } from 'react';
import { MainLayout } from '@/shared/components/UI/MainLayout';
import { Sidebar, useSidebar } from '@/shared/components/UI/Sidebar';
import { Button } from '@/shared/components/UI/Button';
import { Input } from '@/shared/components/UI/Input';
import { cn } from '@/shared/utils/cn';
import {
  MaterialSelector,
  MaterialBenchmark,
  MaterialAlternatives,
} from '@/features/lca/components/editor';
import type { Material } from '@/features/lca/types';
import type { Locale } from '@/lib/i18n/config';

// ============================================
// TYPES
// ============================================

interface TestPageProps {
  params: Promise<{ locale: Locale }>;
}

type TestSection = 'materials' | 'benchmark' | 'elements' | 'api' | 'comparison';

interface ApiTestResult {
  endpoint: string;
  method: string;
  status: number | null;
  duration: number | null;
  response: unknown;
  error: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const SECTIONS: { id: TestSection; label: { nl: string; en: string } }[] = [
  { id: 'materials', label: { nl: 'Materialen', en: 'Materials' } },
  { id: 'benchmark', label: { nl: 'Benchmarking', en: 'Benchmarking' } },
  { id: 'elements', label: { nl: 'Elementen', en: 'Elements' } },
  { id: 'api', label: { nl: 'API Testen', en: 'API Testing' } },
  { id: 'comparison', label: { nl: 'Vergelijking', en: 'Comparison' } },
];

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/lca/projects', description: 'List all projects' },
  { method: 'POST', path: '/api/lca/materials', description: 'Get material categories' },
  { method: 'GET', path: '/api/lca/materials?search=beton&limit=5', description: 'Search materials' },
  { method: 'GET', path: '/api/lca/materials/benchmark?category=concrete', description: 'Get benchmark data' },
];

// ============================================
// COMPONENT
// ============================================

export default function LCATestPage({ params }: TestPageProps) {
  const resolvedParams = use(params);
  const locale = resolvedParams.locale as 'nl' | 'en';

  const { isCollapsed, toggle } = useSidebar({
    defaultCollapsed: true,
    persistState: true,
    storageKey: 'admin-lca-test-sidebar-collapsed',
  });

  // State
  const [activeSection, setActiveSection] = useState<TestSection>('materials');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<{
    stats: { count: number; min_gwp: number; max_gwp: number; avg_gwp: number; median_gwp: number; percentiles: { p25: number; p75: number; p90: number } };
    alternatives: Array<{ id: string; name_nl: string | null; name_en: string | null; name_de: string | null; gwp_a1_a3: number; quality_rating: number; declared_unit: string; density: number | null; subcategory: string | null; is_generic: boolean }>;
  } | null>(null);
  const [isBenchmarkLoading, setIsBenchmarkLoading] = useState(false);
  const [apiResults, setApiResults] = useState<ApiTestResult[]>([]);
  const [customEndpoint, setCustomEndpoint] = useState('/api/lca/projects');
  const [customMethod, setCustomMethod] = useState('GET');

  // Fetch benchmark when material is selected
  const fetchBenchmark = async (material: Material) => {
    setSelectedMaterial(material);
    setIsBenchmarkLoading(true);

    try {
      const params = new URLSearchParams({
        category: material.category,
        material_id: material.id,
        limit: '5',
      });

      const response = await fetch(`/api/lca/materials/benchmark?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setBenchmarkData({
          stats: data.data.stats,
          alternatives: data.data.alternatives,
        });
      }
    } catch (error) {
      console.error('Benchmark fetch error:', error);
      setBenchmarkData(null);
    } finally {
      setIsBenchmarkLoading(false);
    }
  };

  // Run API test
  const runApiTest = async (method: string, endpoint: string) => {
    const start = performance.now();
    const result: ApiTestResult = {
      endpoint,
      method,
      status: null,
      duration: null,
      response: null,
      error: null,
    };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
      });

      result.status = response.status;
      result.duration = Math.round(performance.now() - start);

      try {
        result.response = await response.json();
      } catch {
        result.response = await response.text();
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.duration = Math.round(performance.now() - start);
    }

    setApiResults((prev) => [result, ...prev.slice(0, 9)]);
  };

  // Sidebar sections
  const sidebarSections = [
    {
      id: 'nav',
      title: locale === 'nl' ? 'Test Secties' : 'Test Sections',
      content: (
        <div className="space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                activeSection === section.id
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {section.label[locale]}
            </button>
          ))}
        </div>
      ),
    },
  ];

  // Render section content
  const renderSection = () => {
    switch (activeSection) {
      case 'materials':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                {locale === 'nl' ? 'Materiaal Selector Test' : 'Material Selector Test'}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {locale === 'nl'
                  ? 'Test de MaterialSelector component met zoeken en filtering.'
                  : 'Test the MaterialSelector component with search and filtering.'}
              </p>
              <MaterialSelector
                selectedMaterial={selectedMaterial}
                onSelectMaterial={fetchBenchmark}
                locale={locale}
                showBenchmark={true}
                showAlternatives={true}
              />
            </div>

            {selectedMaterial && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-md font-semibold mb-4">
                  {locale === 'nl' ? 'Geselecteerd Materiaal' : 'Selected Material'}
                </h3>
                <pre className="bg-gray-50 p-4 rounded-md text-xs overflow-auto max-h-64">
                  {JSON.stringify(selectedMaterial, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );

      case 'benchmark':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                {locale === 'nl' ? 'Benchmark Componenten Test' : 'Benchmark Components Test'}
              </h2>

              {/* Material Selector without built-in benchmark */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {locale === 'nl' ? 'Selecteer een materiaal:' : 'Select a material:'}
                </label>
                <MaterialSelector
                  selectedMaterial={selectedMaterial}
                  onSelectMaterial={fetchBenchmark}
                  locale={locale}
                />
              </div>

              {/* Separate Benchmark Display */}
              {selectedMaterial && benchmarkData && (
                <div className="space-y-4">
                  <h3 className="text-md font-semibold">
                    {locale === 'nl' ? 'MaterialBenchmark Component:' : 'MaterialBenchmark Component:'}
                  </h3>
                  <MaterialBenchmark
                    gwpValue={selectedMaterial.gwp_a1_a3}
                    stats={benchmarkData.stats}
                    categoryName={selectedMaterial.category}
                    locale={locale}
                  />

                  <h3 className="text-md font-semibold mt-6">
                    {locale === 'nl' ? 'MaterialBenchmark (Compact):' : 'MaterialBenchmark (Compact):'}
                  </h3>
                  <MaterialBenchmark
                    gwpValue={selectedMaterial.gwp_a1_a3}
                    stats={benchmarkData.stats}
                    locale={locale}
                    compact={true}
                  />

                  <h3 className="text-md font-semibold mt-6">
                    {locale === 'nl' ? 'MaterialAlternatives Component:' : 'MaterialAlternatives Component:'}
                  </h3>
                  <MaterialAlternatives
                    alternatives={benchmarkData.alternatives}
                    currentGwp={selectedMaterial.gwp_a1_a3}
                    onSelectAlternative={fetchBenchmark}
                    locale={locale}
                    isLoading={isBenchmarkLoading}
                  />
                </div>
              )}

              {isBenchmarkLoading && (
                <div className="flex items-center gap-2 p-4 text-gray-500">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>{locale === 'nl' ? 'Laden...' : 'Loading...'}</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'elements':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                {locale === 'nl' ? 'Element Editor Test' : 'Element Editor Test'}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {locale === 'nl'
                  ? 'Test de Element en Layer editor componenten. Ga naar een project detail pagina om deze te testen met echte data.'
                  : 'Test the Element and Layer editor components. Go to a project detail page to test these with real data.'}
              </p>
              <Button
                onClick={() => window.open(`/${locale}/lca/dashboard`, '_blank')}
              >
                {locale === 'nl' ? 'Open LCA Dashboard' : 'Open LCA Dashboard'}
              </Button>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                {locale === 'nl' ? 'API Endpoint Tester' : 'API Endpoint Tester'}
              </h2>

              {/* Quick test buttons */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {locale === 'nl' ? 'Snelle Tests:' : 'Quick Tests:'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {API_ENDPOINTS.map((ep, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant="outline"
                      onClick={() => runApiTest(ep.method, ep.path)}
                    >
                      {ep.method} {ep.description}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom endpoint test */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {locale === 'nl' ? 'Aangepaste Test:' : 'Custom Test:'}
                </h3>
                <div className="flex gap-2">
                  <select
                    value={customMethod}
                    onChange={(e) => setCustomMethod(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <Input
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder="/api/lca/..."
                    className="flex-1"
                  />
                  <Button onClick={() => runApiTest(customMethod, customEndpoint)}>
                    {locale === 'nl' ? 'Uitvoeren' : 'Run'}
                  </Button>
                </div>
              </div>

              {/* Results */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  {locale === 'nl' ? 'Resultaten:' : 'Results:'}
                </h3>
                {apiResults.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    {locale === 'nl' ? 'Nog geen tests uitgevoerd.' : 'No tests run yet.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {apiResults.map((result, index) => (
                      <div
                        key={index}
                        className={cn(
                          'p-3 rounded-md border',
                          result.error || (result.status && result.status >= 400)
                            ? 'bg-red-50 border-red-200'
                            : 'bg-green-50 border-green-200'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-sm">
                            <span className="font-bold">{result.method}</span> {result.endpoint}
                          </span>
                          <div className="flex items-center gap-2">
                            {result.status && (
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-xs font-medium',
                                  result.status < 400
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                )}
                              >
                                {result.status}
                              </span>
                            )}
                            {result.duration !== null && (
                              <span className="text-xs text-gray-500">
                                {result.duration}ms
                              </span>
                            )}
                          </div>
                        </div>
                        {result.error && (
                          <p className="text-sm text-red-600">{result.error}</p>
                        )}
                        {result.response && (
                          <pre className="bg-white/50 p-2 rounded text-xs overflow-auto max-h-40 mt-2">
                            {JSON.stringify(result.response, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'comparison':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">
                {locale === 'nl' ? 'Vergelijking Test' : 'Comparison Test'}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {locale === 'nl'
                  ? 'Test de project vergelijkings componenten.'
                  : 'Test the project comparison components.'}
              </p>
              <Button
                onClick={() => window.open(`/${locale}/lca/compare`, '_blank')}
              >
                {locale === 'nl' ? 'Open Vergelijkingspagina' : 'Open Comparison Page'}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout
      isCollapsed={isCollapsed}
      sidebar={
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={toggle}
          sections={sidebarSections}
          title={locale === 'nl' ? 'LCA Test Suite' : 'LCA Test Suite'}
          subtitle={locale === 'nl' ? 'Admin tools voor testen' : 'Admin tools for testing'}
          position="left"
          withNavbar={true}
        />
      }
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {locale === 'nl' ? 'LCA Test Suite' : 'LCA Test Suite'}
              </h1>
              <p className="text-sm text-gray-500">
                {locale === 'nl'
                  ? 'Test backend componenten en API endpoints'
                  : 'Test backend components and API endpoints'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            {renderSection()}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
