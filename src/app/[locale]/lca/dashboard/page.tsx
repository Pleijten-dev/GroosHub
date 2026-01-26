/**
 * LCA Dashboard Page
 *
 * Main dashboard for the LCA section using the shared Sidebar component
 * with LCA Projects Section.
 *
 * Demonstrates reusable sidebar architecture with:
 * - Shared Sidebar component (app-wide)
 * - LCA Projects Section (feature-specific content)
 * - Consistent collapse/expand behavior
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/shared/components/UI/Sidebar/Sidebar';
import { MainLayout } from '@/shared/components/UI/MainLayout';
import { useSidebar } from '@/shared/hooks/useSidebar';
import { useProjects } from '@/features/lca/hooks';
import { LCAProjectsSection } from '@/features/lca/components/sidebar';
import { LCATabNavigation } from '@/features/lca/components/navigation';
import { NewProjectModal } from '@/features/lca/components/modals';
import { MPGScoreBadge, ElementCategoryIcon } from '@/features/lca/components/ui';
import { PhaseBreakdownMini } from '@/features/lca/components/charts';

/**
 * LCA Dashboard Page Component
 */
export default function LCADashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  const router = useRouter();
  const locale = params.locale as 'nl' | 'en';
  const { isCollapsed, toggle } = useSidebar();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();

  // Fetch real projects from API
  const { projects, isLoading, error } = useProjects();

  // Keep demo data as fallback for demo purposes
  const demoProjects = [
    {
      id: '1',
      name: 'Timber Frame House - Sustainable Living',
      building_type: 'vrijstaand',
      gross_floor_area: 120,
      total_gwp_per_m2_year: 0.42,
      mpg_reference_value: 0.60,
      is_compliant: true,
      user_id: 'demo',
      construction_system: 'houtskelet',
      floors: 2,
      dwelling_count: 1,
      facade_cladding: 'hout',
      foundation: 'kruipruimte',
      roof: 'hellend_dakpannen',
      window_frames: 'hout',
      window_to_wall_ratio: 20,
      study_period: 75,
      is_template: false,
      is_public: false,
      created_at: new Date('2024-11-20'),
      updated_at: new Date('2024-11-25'),
      description: null,
      project_number: null,
      location: null,
      energy_label: null,
      heating_system: null,
      annual_gas_use: null,
      annual_electricity: null,
      total_gwp_a1_a3: null,
      total_gwp_a4: null,
      total_gwp_a5: null,
      total_gwp_b4: null,
      total_gwp_c: null,
      total_gwp_d: null,
      total_gwp_sum: null,
      operational_carbon: null,
      total_carbon: null,
    },
    {
      id: '2',
      name: 'CLT Apartment Building',
      building_type: 'appartement',
      gross_floor_area: 850,
      total_gwp_per_m2_year: 0.38,
      mpg_reference_value: 0.45,
      is_compliant: true,
      user_id: 'demo',
      construction_system: 'clt',
      floors: 4,
      dwelling_count: 12,
      facade_cladding: 'vezelcement',
      foundation: 'betonplaat',
      roof: 'plat_bitumen',
      window_frames: 'aluminium',
      window_to_wall_ratio: 25,
      study_period: 75,
      is_template: false,
      is_public: false,
      created_at: new Date('2024-11-18'),
      updated_at: new Date('2024-11-24'),
      description: null,
      project_number: null,
      location: null,
      energy_label: null,
      heating_system: null,
      annual_gas_use: null,
      annual_electricity: null,
      total_gwp_a1_a3: null,
      total_gwp_a4: null,
      total_gwp_a5: null,
      total_gwp_b4: null,
      total_gwp_c: null,
      total_gwp_d: null,
      total_gwp_sum: null,
      operational_carbon: null,
      total_carbon: null,
    },
    {
      id: '3',
      name: 'Terraced House Project',
      building_type: 'rijwoning',
      gross_floor_area: 95,
      total_gwp_per_m2_year: 0.52,
      mpg_reference_value: 0.50,
      is_compliant: false,
      user_id: 'demo',
      construction_system: 'metselwerk',
      floors: 2,
      dwelling_count: 1,
      facade_cladding: 'metselwerk',
      foundation: 'kruipruimte',
      roof: 'hellend_dakpannen',
      window_frames: 'pvc',
      window_to_wall_ratio: 18,
      study_period: 75,
      is_template: false,
      is_public: false,
      created_at: new Date('2024-11-15'),
      updated_at: new Date('2024-11-23'),
      description: null,
      project_number: null,
      location: null,
      energy_label: null,
      heating_system: null,
      annual_gas_use: null,
      annual_electricity: null,
      total_gwp_a1_a3: null,
      total_gwp_a4: null,
      total_gwp_a5: null,
      total_gwp_b4: null,
      total_gwp_c: null,
      total_gwp_d: null,
      total_gwp_sum: null,
      operational_carbon: null,
      total_carbon: null,
    },
    {
      id: '4',
      name: 'CLT Woongebouw Rotterdam',
      building_type: 'appartement',
      gross_floor_area: 1200,
      total_gwp_per_m2_year: 0.29,
      mpg_reference_value: 0.45,
      is_compliant: true,
      user_id: 'demo',
      construction_system: 'clt',
      floors: 5,
      dwelling_count: 16,
      facade_cladding: 'metaal',
      foundation: 'betonplaat',
      roof: 'plat_bitumen',
      window_frames: 'aluminium',
      window_to_wall_ratio: 30,
      study_period: 75,
      is_template: false,
      is_public: false,
      created_at: new Date('2024-11-12'),
      updated_at: new Date('2024-11-20'),
      description: null,
      project_number: null,
      location: null,
      energy_label: null,
      heating_system: null,
      annual_gas_use: null,
      annual_electricity: null,
      total_gwp_a1_a3: null,
      total_gwp_a4: null,
      total_gwp_a5: null,
      total_gwp_b4: null,
      total_gwp_c: null,
      total_gwp_d: null,
      total_gwp_sum: null,
      operational_carbon: null,
      total_carbon: null,
    },
    {
      id: '5',
      name: 'Passief Huis Eindhoven',
      building_type: 'twee_onder_een_kap',
      gross_floor_area: 140,
      total_gwp_per_m2_year: 0.38,
      mpg_reference_value: 0.55,
      is_compliant: true,
      user_id: 'demo',
      construction_system: 'houtskelet',
      floors: 2,
      dwelling_count: 2,
      facade_cladding: 'stucwerk',
      foundation: 'kruipruimte',
      roof: 'hellend_metaal',
      window_frames: 'hout',
      window_to_wall_ratio: 22,
      study_period: 75,
      is_template: false,
      is_public: false,
      created_at: new Date('2024-11-10'),
      updated_at: new Date('2024-11-18'),
      description: null,
      project_number: null,
      location: null,
      energy_label: null,
      heating_system: null,
      annual_gas_use: null,
      annual_electricity: null,
      total_gwp_a1_a3: null,
      total_gwp_a4: null,
      total_gwp_a5: null,
      total_gwp_b4: null,
      total_gwp_c: null,
      total_gwp_d: null,
      total_gwp_sum: null,
      operational_carbon: null,
      total_carbon: null,
    },
  ];

  // Demo phase data for chart
  const demoPhases = {
    a1a3: 1500,
    a4: 50,
    a5: 100,
    b4: 200,
    c: 500,
    d: -300,
  };

  const t = locale === 'nl' ? {
    dashboard: 'Dashboard',
    welcome: 'Welkom bij LCA Dashboard',
    description: 'Beheer uw projecten en bekijk de milieuprestatie',
    demoComponents: 'Demo Componenten Phase 3',
    mpgBadge: 'MPG Score Badge',
    phaseChart: 'Phase Breakdown Chart',
    elementIcons: 'Element Category Icons',
    compliant: 'Voldoet',
    warning: 'Grensgeval',
    nonCompliant: 'Voldoet niet',
  } : {
    dashboard: 'Dashboard',
    welcome: 'Welcome to LCA Dashboard',
    description: 'Manage your projects and view environmental performance',
    demoComponents: 'Demo Components Phase 3',
    mpgBadge: 'MPG Score Badge',
    phaseChart: 'Phase Breakdown Chart',
    elementIcons: 'Element Category Icons',
    compliant: 'Compliant',
    warning: 'Warning',
    nonCompliant: 'Non-compliant',
  };

  // Use real projects from API, fallback to demo if empty (for testing UI)
  const displayProjects = projects.length > 0 ? projects : demoProjects;

  // Sidebar sections - LCA Projects content
  const sidebarSections = [
    {
      id: 'lca-projects',
      title: '',
      content: isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {locale === 'nl' ? 'Projecten laden...' : 'Loading projects...'}
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            {locale === 'nl' ? 'Fout bij laden' : 'Error loading projects'}
          </p>
          <p className="mt-1 text-xs text-red-600">{error}</p>
        </div>
      ) : (
        <LCAProjectsSection
          projects={displayProjects}
          activeProjectId={activeProjectId}
          onNewProject={() => setShowNewProjectModal(true)}
          onSelectProject={(id) => setActiveProjectId(id)}
          onOpenProject={(id) => router.push(`/${locale}/lca/projects/${id}`)}
          onDuplicateProject={(id) => console.log('Duplicate:', id)}
          onDeleteProject={(id) => console.log('Delete:', id)}
          locale={locale}
        />
      ),
    },
  ];

  return (
    <>
      <MainLayout
        isCollapsed={isCollapsed}
        sidebar={
          <Sidebar
            isCollapsed={isCollapsed}
            onToggle={toggle}
            sections={sidebarSections}
            position="left"
            withNavbar={true}
          />
        }
      >
        {/* Tab Navigation */}
        <LCATabNavigation locale={locale} />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t.welcome}</h1>
            <p className="mt-2 text-gray-600">{t.description}</p>
          </div>

          {/* Demo Component Showcase */}
          <div className="space-y-8">
            {/* MPG Score Badges */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                {t.mpgBadge}
              </h2>
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="mb-2 text-sm text-gray-600">{t.compliant}</p>
                  <MPGScoreBadge
                    score={0.42}
                    limit={0.60}
                    size="lg"
                    showLabel={true}
                    locale={locale}
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm text-gray-600">{t.warning}</p>
                  <MPGScoreBadge
                    score={0.56}
                    limit={0.60}
                    size="lg"
                    showLabel={true}
                    locale={locale}
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm text-gray-600">{t.nonCompliant}</p>
                  <MPGScoreBadge
                    score={0.72}
                    limit={0.60}
                    size="lg"
                    showLabel={true}
                    locale={locale}
                  />
                </div>
              </div>
            </section>

            {/* Phase Breakdown Chart */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                {t.phaseChart}
              </h2>
              <div className="max-w-2xl rounded-lg bg-white p-6 shadow">
                <PhaseBreakdownMini
                  phases={demoPhases}
                  totalGwp={2050}
                  showLabels={true}
                  height={60}
                  locale={locale}
                />
              </div>
            </section>

            {/* Element Category Icons */}
            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                {t.elementIcons}
              </h2>
              <div className="flex flex-wrap gap-6">
                <ElementCategoryIcon
                  category="exterior_wall"
                  size="lg"
                  showLabel={true}
                  locale={locale}
                />
                <ElementCategoryIcon
                  category="roof"
                  size="lg"
                  showLabel={true}
                  locale={locale}
                />
                <ElementCategoryIcon
                  category="floor"
                  size="lg"
                  showLabel={true}
                  locale={locale}
                />
                <ElementCategoryIcon
                  category="foundation"
                  size="lg"
                  showLabel={true}
                  locale={locale}
                />
                <ElementCategoryIcon
                  category="windows"
                  size="lg"
                  showLabel={true}
                  locale={locale}
                />
              </div>
            </section>
          </div>
        </div>
      </MainLayout>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        locale={locale}
      />
    </>
  );
}
