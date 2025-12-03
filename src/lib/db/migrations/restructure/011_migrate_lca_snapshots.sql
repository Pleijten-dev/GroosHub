-- ================================================
-- Migration 011: Migrate LCA Data to Snapshots
-- Description: Create initial LCA snapshots from existing data
-- Date: 2025-12-03
-- ================================================

BEGIN;

-- Migrate lca_projects data to lca_snapshots
INSERT INTO lca_snapshots (
  project_id,
  user_id,
  project_name,
  project_description,
  snapshot_date,
  version_number,
  is_active,
  functional_unit,
  system_boundary,
  allocation_method,
  processes,
  flows,
  impact_categories,
  results,
  parameters,
  comparisons,
  calculation_status,
  last_calculated_at,
  database_source,
  database_version,
  notes,
  metadata,
  created_at,
  updated_at
)
SELECT
  lp.id as project_id,
  lp.user_id,
  lp.name as project_name,
  lp.description as project_description,
  CURRENT_DATE as snapshot_date,
  1 as version_number,
  true as is_active,
  lp.functional_unit,
  lp.system_boundary,
  lp.allocation_method,

  -- Aggregate processes
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', proc.id,
        'name', proc.name,
        'category', proc.category,
        'amount', proc.amount,
        'unit', proc.unit,
        'data', proc.data
      )
    )
    FROM lca_processes proc
    WHERE proc.project_id = lp.id),
    '[]'::jsonb
  ) as processes,

  -- Aggregate flows
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', flow.id,
        'name', flow.name,
        'type', flow.type,
        'amount', flow.amount,
        'unit', flow.unit,
        'data', flow.data
      )
    )
    FROM lca_flows flow
    WHERE flow.project_id = lp.id),
    '[]'::jsonb
  ) as flows,

  -- Aggregate impact categories
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', ic.id,
        'name', ic.name,
        'unit', ic.unit,
        'value', ic.value
      )
    )
    FROM lca_impact_categories ic
    WHERE ic.project_id = lp.id),
    '[]'::jsonb
  ) as impact_categories,

  -- Aggregate results
  COALESCE(
    (SELECT jsonb_object_agg(
      res.category,
      jsonb_build_object(
        'value', res.value,
        'unit', res.unit,
        'data', res.data
      )
    )
    FROM lca_results res
    WHERE res.project_id = lp.id),
    '{}'::jsonb
  ) as results,

  -- Aggregate parameters
  COALESCE(
    (SELECT jsonb_object_agg(
      param.name,
      jsonb_build_object(
        'value', param.value,
        'unit', param.unit,
        'description', param.description
      )
    )
    FROM lca_parameters param
    WHERE param.project_id = lp.id),
    '{}'::jsonb
  ) as parameters,

  -- Aggregate comparisons
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'id', comp.id,
        'name', comp.name,
        'data', comp.data
      )
    )
    FROM lca_comparisons comp
    WHERE comp.project_id = lp.id),
    '[]'::jsonb
  ) as comparisons,

  'completed' as calculation_status,
  lp.updated_at as last_calculated_at,
  lp.database_source,
  lp.database_version,
  NULL as notes,
  jsonb_build_object(
    'migrated_from', 'lca_projects',
    'original_id', lp.id,
    'migration_date', CURRENT_TIMESTAMP
  ) as metadata,
  lp.created_at,
  lp.updated_at

FROM lca_projects lp
WHERE NOT EXISTS (
  SELECT 1 FROM lca_snapshots ls
  WHERE ls.project_id = lp.id
);

-- Verification
SELECT
  'lca_snapshots' as table_name,
  COUNT(*) as row_count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM lca_snapshots;

COMMIT;
