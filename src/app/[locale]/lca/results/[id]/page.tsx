import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';
import ResultsDashboard from '@/features/lca/components/results/ResultsDashboard';
import type { LCAProject } from '@/features/lca/types';

export const metadata = {
  title: 'LCA Results | GroosHub',
  description: 'View LCA calculation results for your building project'
};

/**
 * LCA Results Page
 *
 * Displays calculation results for a specific project
 */
export default async function LCAResultsPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params;

  // Check authentication
  const session = await auth();
  if (!session?.user) {
    return notFound();
  }

  // Load project data
  const sql = getDbConnection();

  const projectResult = await sql`
    SELECT * FROM lca_projects WHERE id = ${id}
  `;

  if (projectResult.length === 0) {
    return notFound();
  }

  const rawProject = projectResult[0];

  // Convert numeric fields from database strings to JavaScript numbers
  const project: LCAProject = {
    ...rawProject,
    gross_floor_area: Number(rawProject.gross_floor_area),
    study_period: Number(rawProject.study_period),
    floors: Number(rawProject.floors),
    annual_gas_use: rawProject.annual_gas_use ? Number(rawProject.annual_gas_use) : null,
    annual_electricity: rawProject.annual_electricity ? Number(rawProject.annual_electricity) : null,
    total_gwp_a1_a3: rawProject.total_gwp_a1_a3 ? Number(rawProject.total_gwp_a1_a3) : null,
    total_gwp_a4: rawProject.total_gwp_a4 ? Number(rawProject.total_gwp_a4) : null,
    total_gwp_a5: rawProject.total_gwp_a5 ? Number(rawProject.total_gwp_a5) : null,
    total_gwp_b4: rawProject.total_gwp_b4 ? Number(rawProject.total_gwp_b4) : null,
    total_gwp_c: rawProject.total_gwp_c ? Number(rawProject.total_gwp_c) : null,
    total_gwp_d: rawProject.total_gwp_d ? Number(rawProject.total_gwp_d) : null,
    total_gwp_sum: rawProject.total_gwp_sum ? Number(rawProject.total_gwp_sum) : null,
    total_gwp_per_m2_year: rawProject.total_gwp_per_m2_year ? Number(rawProject.total_gwp_per_m2_year) : null,
    operational_carbon: rawProject.operational_carbon ? Number(rawProject.operational_carbon) : null,
    total_carbon: rawProject.total_carbon ? Number(rawProject.total_carbon) : null,
    mpg_reference_value: rawProject.mpg_reference_value ? Number(rawProject.mpg_reference_value) : null,
    is_compliant: rawProject.is_compliant,
    user_id: String(rawProject.user_id),
  } as LCAProject;

  // Check ownership or public access
  if (String(project.user_id) !== String(session.user.id) && !project.is_public) {
    return notFound();
  }

  // Load MPG reference for this building type
  const referenceResult = await sql`
    SELECT mpg_limit, operational_carbon
    FROM lca_reference_values
    WHERE building_type = ${project.building_type}
    LIMIT 1
  `;

  const reference = referenceResult.length > 0 ? {
    mpg_limit: Number(referenceResult[0].mpg_limit),
    operational_carbon: Number(referenceResult[0].operational_carbon)
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-base">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-sm">
                {project.name}
              </h1>
              <p className="text-lg text-gray-600">
                {locale === 'nl' ? 'LCA Berekening Resultaten' : 'LCA Calculation Results'}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="bg-white p-lg rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm text-gray-600 mb-sm">
                {locale === 'nl' ? 'Project Details' : 'Project Details'}
              </div>
              <div className="space-y-xs text-sm">
                <div>
                  <span className="text-gray-500">
                    {locale === 'nl' ? 'Woningtype:' : 'Building type:'}
                  </span>{' '}
                  <span className="font-medium">{project.building_type}</span>
                </div>
                <div>
                  <span className="text-gray-500">
                    {locale === 'nl' ? 'Bouwsysteem:' : 'Construction:'}
                  </span>{' '}
                  <span className="font-medium">{project.construction_system || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">GFA:</span>{' '}
                  <span className="font-medium">{project.gross_floor_area} m²</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Results Dashboard */}
        <Suspense fallback={<DashboardSkeleton />}>
          <ResultsDashboard
            project={project}
            reference={reference}
            locale={locale as 'nl' | 'en'}
          />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Dashboard Loading Skeleton
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-xl animate-pulse">
      {/* MPG Card Skeleton */}
      <div className="bg-white p-2xl rounded-lg border border-gray-200">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-lg"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
        <div className="bg-white p-xl rounded-lg border border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-base"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
        <div className="bg-white p-xl rounded-lg border border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-base"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
