/**
 * LCA Project Detail Page
 *
 * Displays detailed information about a specific LCA project including:
 * - Project metadata (name, type, floor area)
 * - MPG compliance status and score
 * - Phase breakdown visualization
 * - Project actions (edit, export, delete)
 *
 * @module app/[locale]/lca/projects/[id]
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/shared/components/UI/Sidebar/Sidebar';
import { useSidebar } from '@/shared/hooks/useSidebar';
import { useProjects } from '@/features/lca/hooks';
import { LCAProjectsSection } from '@/features/lca/components/sidebar';
import { LCATabNavigation } from '@/features/lca/components/navigation';
import { NewProjectModal } from '@/features/lca/components/modals';
import { MPGScoreBadge } from '@/features/lca/components/ui';
import { PhaseBreakdownMini } from '@/features/lca/components/charts';
import type { LCAProject } from '@/features/lca/types';

// ============================================
// TRANSLATIONS
// ============================================

const TRANSLATIONS = {
  nl: {
    loading: 'Project laden...',
    notFound: 'Project niet gevonden',
    notFoundDescription: 'Het opgegeven project bestaat niet of is verwijderd.',
    backToDashboard: 'Terug naar Dashboard',
    projectDetails: 'Projectdetails',
    buildingType: 'Gebouwtype',
    floorArea: 'Bruto vloeroppervlak',
    constructionSystem: 'Constructiesysteem',
    floors: 'Verdiepingen',
    studyPeriod: 'Studieperiode',
    years: 'jaar',
    lastEdited: 'Laatst bewerkt',
    mpgCompliance: 'MPG Toetsing',
    mpgScore: 'MPG Score',
    referenceValue: 'Grenswaarde',
    phaseBreakdown: 'Fase Verdeling',
    totalGwp: 'Totaal GWP',
    actions: 'Acties',
    edit: 'Bewerken',
    export: 'Exporteren',
    delete: 'Verwijderen',
    m2: 'm²',
  },
  en: {
    loading: 'Loading project...',
    notFound: 'Project not found',
    notFoundDescription: 'The specified project does not exist or has been deleted.',
    backToDashboard: 'Back to Dashboard',
    projectDetails: 'Project Details',
    buildingType: 'Building Type',
    floorArea: 'Gross Floor Area',
    constructionSystem: 'Construction System',
    floors: 'Floors',
    studyPeriod: 'Study Period',
    years: 'years',
    lastEdited: 'Last edited',
    mpgCompliance: 'MPG Compliance',
    mpgScore: 'MPG Score',
    referenceValue: 'Reference Value',
    phaseBreakdown: 'Phase Breakdown',
    totalGwp: 'Total GWP',
    actions: 'Actions',
    edit: 'Edit',
    export: 'Export',
    delete: 'Delete',
    m2: 'm²',
  },
};

// Building type translations
const BUILDING_TYPES = {
  nl: {
    vrijstaand: 'Vrijstaand',
    twee_onder_een_kap: 'Twee-onder-een-kap',
    rijwoning: 'Rijwoning',
    appartement: 'Appartement',
    utiliteit: 'Utiliteit',
  },
  en: {
    vrijstaand: 'Detached',
    twee_onder_een_kap: 'Semi-detached',
    rijwoning: 'Terraced',
    appartement: 'Apartment',
    utiliteit: 'Commercial',
  },
};

// Construction system translations
const CONSTRUCTION_SYSTEMS = {
  nl: {
    houtskelet: 'Houtskelet',
    clv: 'CLT (Cross-Laminated Timber)',
    metselwerk: 'Metselwerk',
    betonbouw: 'Betonbouw',
    staalframe: 'Staalframe',
  },
  en: {
    houtskelet: 'Timber Frame',
    clv: 'CLT (Cross-Laminated Timber)',
    metselwerk: 'Masonry',
    betonbouw: 'Concrete',
    staalframe: 'Steel Frame',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(date: Date, locale: 'nl' | 'en'): string {
  return new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// ============================================
// COMPONENT
// ============================================

/**
 * LCA Project Detail Page
 */
export default function LCAProjectPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  const router = useRouter();
  const locale = params.locale as 'nl' | 'en';
  const projectId = params.id;
  const t = TRANSLATIONS[locale];

  const { isCollapsed, toggle } = useSidebar();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const { projects, isLoading: projectsLoading } = useProjects();

  // Find the current project
  const [project, setProject] = useState<LCAProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectsLoading && projects.length > 0) {
      const foundProject = projects.find((p) => p.id === projectId);
      setProject(foundProject || null);
      setIsLoading(false);
    } else if (!projectsLoading && projects.length === 0) {
      setIsLoading(false);
    }
  }, [projectId, projects, projectsLoading]);

  // Demo phase data (fallback for projects without phase data)
  const demoPhases = {
    a1a3: project?.total_gwp_a1_a3 || 1500,
    a4: project?.total_gwp_a4 || 50,
    a5: project?.total_gwp_a5 || 100,
    b4: project?.total_gwp_b4 || 200,
    c: project?.total_gwp_c || 500,
    d: project?.total_gwp_d || -300,
  };

  const totalGwp = project?.total_gwp_sum || 2050;

  // Sidebar sections
  const sidebarSections = [
    {
      id: 'lca-projects',
      title: '',
      content: projectsLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              {locale === 'nl' ? 'Projecten laden...' : 'Loading projects...'}
            </p>
          </div>
        </div>
      ) : (
        <LCAProjectsSection
          projects={projects}
          activeProjectId={projectId}
          onNewProject={() => setShowNewProjectModal(true)}
          onSelectProject={(id) => router.push(`/${locale}/lca/projects/${id}`)}
          onOpenProject={(id) => router.push(`/${locale}/lca/projects/${id}`)}
          onDuplicateProject={(id) => console.log('Duplicate:', id)}
          onDeleteProject={(id) => console.log('Delete:', id)}
          locale={locale}
        />
      ),
    },
  ];

  // ============================================
  // RENDER - LOADING
  // ============================================

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-lg font-medium text-gray-700">
            {t.loading}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - NOT FOUND
  // ============================================

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {t.notFound}
          </h1>
          <p className="mb-6 text-gray-600">{t.notFoundDescription}</p>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/lca/dashboard`)}
            className="rounded-base bg-primary px-4 py-2 text-white hover:bg-primary/90 transition-colors"
          >
            {t.backToDashboard}
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - PROJECT DETAILS
  // ============================================

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Shared Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={toggle}
        sections={sidebarSections}
        expandedWidth="280px"
        collapsedWidth="60px"
        position="left"
        withNavbar={true}
      />

      {/* Main Content */}
      <div
        className="flex flex-1 flex-col overflow-hidden transition-all duration-300"
        style={{
          marginLeft: isCollapsed ? '60px' : '280px',
        }}
      >
        {/* Tab Navigation */}
        <LCATabNavigation locale={locale} />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {/* Project Header */}
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              {project.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                {BUILDING_TYPES[locale][project.building_type as keyof typeof BUILDING_TYPES.nl] || project.building_type}
              </span>
              <span>•</span>
              <span>
                {project.gross_floor_area} {t.m2}
              </span>
              {project.construction_system && (
                <>
                  <span>•</span>
                  <span>
                    {CONSTRUCTION_SYSTEMS[locale][project.construction_system as keyof typeof CONSTRUCTION_SYSTEMS.nl] || project.construction_system}
                  </span>
                </>
              )}
              <span>•</span>
              <span>
                {t.lastEdited}: {formatDate(project.updated_at, locale)}
              </span>
            </div>
          </div>

          {/* MPG Compliance Section */}
          {project.total_gwp_per_m2_year !== null &&
            project.mpg_reference_value !== null && (
              <section className="mb-8">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  {t.mpgCompliance}
                </h2>
                <div className="rounded-lg bg-white p-6 shadow">
                  <div className="mb-6 grid gap-6 md:grid-cols-2">
                    {/* MPG Score */}
                    <div>
                      <div className="mb-2 text-sm font-medium text-gray-600">
                        {t.mpgScore}
                      </div>
                      <div className="text-4xl font-bold text-gray-900">
                        {Number(project.total_gwp_per_m2_year).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        kg CO₂-eq/m²/jaar
                      </div>
                    </div>

                    {/* Reference Value */}
                    <div>
                      <div className="mb-2 text-sm font-medium text-gray-600">
                        {t.referenceValue}
                      </div>
                      <div className="text-4xl font-bold text-gray-900">
                        {Number(project.mpg_reference_value).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">
                        kg CO₂-eq/m²/jaar
                      </div>
                    </div>
                  </div>

                  {/* Compliance Badge */}
                  <MPGScoreBadge
                    score={Number(project.total_gwp_per_m2_year)}
                    limit={Number(project.mpg_reference_value)}
                    size="lg"
                    showLabel={true}
                    locale={locale}
                    className="justify-center"
                  />
                </div>
              </section>
            )}

          {/* Phase Breakdown Section */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {t.phaseBreakdown}
            </h2>
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 text-sm text-gray-600">
                {t.totalGwp}: <span className="font-semibold">{totalGwp}</span> kg CO₂-eq
              </div>
              <PhaseBreakdownMini
                phases={demoPhases}
                totalGwp={totalGwp}
                showLabels={true}
                height={80}
                locale={locale}
              />
            </div>
          </section>

          {/* Project Details Grid */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {t.projectDetails}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Building Type */}
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t.buildingType}
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {BUILDING_TYPES[locale][project.building_type as keyof typeof BUILDING_TYPES.nl] || project.building_type}
                </div>
              </div>

              {/* Floor Area */}
              <div className="rounded-lg bg-white p-4 shadow">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t.floorArea}
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {project.gross_floor_area} {t.m2}
                </div>
              </div>

              {/* Construction System */}
              {project.construction_system && (
                <div className="rounded-lg bg-white p-4 shadow">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t.constructionSystem}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {CONSTRUCTION_SYSTEMS[locale][project.construction_system as keyof typeof CONSTRUCTION_SYSTEMS.nl] || project.construction_system}
                  </div>
                </div>
              )}

              {/* Floors */}
              {project.floors && (
                <div className="rounded-lg bg-white p-4 shadow">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t.floors}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {project.floors}
                  </div>
                </div>
              )}

              {/* Study Period */}
              {project.study_period && (
                <div className="rounded-lg bg-white p-4 shadow">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t.studyPeriod}
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    {project.study_period} {t.years}
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        locale={locale}
      />
    </div>
  );
}
