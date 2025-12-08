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
  CONCAT(lp.gross_floor_area, ' m² GFA over ', lp.study_period, ' years') as functional_unit,  -- Derived from existing data
  'Building life cycle (cradle to grave)' as system_boundary,  -- Default value
  'Economic allocation' as allocation_method,  -- Default value

  -- Processes: Empty array (no separate lca_processes table exists)
  '[]'::jsonb as processes,

  -- Flows: Empty array (no separate lca_flows table exists)
  '[]'::jsonb as flows,

  -- Impact categories: Build from existing GWP results
  jsonb_build_array(
    jsonb_build_object(
      'name', 'Global Warming Potential',
      'unit', 'kg CO2-eq',
      'value', lp.total_gwp_sum
    )
  ) as impact_categories,

  -- Results: Build from existing total_gwp_* columns
  jsonb_build_object(
    'A1-A3', jsonb_build_object('value', lp.total_gwp_a1_a3, 'unit', 'kg CO2-eq', 'description', 'Product stage'),
    'A4', jsonb_build_object('value', lp.total_gwp_a4, 'unit', 'kg CO2-eq', 'description', 'Transport'),
    'A5', jsonb_build_object('value', lp.total_gwp_a5, 'unit', 'kg CO2-eq', 'description', 'Construction'),
    'B4', jsonb_build_object('value', lp.total_gwp_b4, 'unit', 'kg CO2-eq', 'description', 'Replacement'),
    'C', jsonb_build_object('value', lp.total_gwp_c, 'unit', 'kg CO2-eq', 'description', 'End of life'),
    'D', jsonb_build_object('value', lp.total_gwp_d, 'unit', 'kg CO2-eq', 'description', 'Benefits beyond'),
    'Total', jsonb_build_object('value', lp.total_gwp_sum, 'unit', 'kg CO2-eq', 'description', 'Total A-C'),
    'Per_m2_year', jsonb_build_object('value', lp.total_gwp_per_m2_year, 'unit', 'kg CO2-eq/m²/year', 'description', 'Normalized'),
    'Operational', jsonb_build_object('value', lp.operational_carbon, 'unit', 'kg CO2-eq', 'description', 'B6 operational'),
    'Total_Carbon', jsonb_build_object('value', lp.total_carbon, 'unit', 'kg CO2-eq', 'description', 'Embodied + operational')
  ) as results,

  -- Parameters: Build from existing project data
  jsonb_build_object(
    'gross_floor_area', jsonb_build_object('value', lp.gross_floor_area, 'unit', 'm²', 'description', 'Gross floor area'),
    'building_type', jsonb_build_object('value', lp.building_type, 'unit', '', 'description', 'Type of building'),
    'construction_system', jsonb_build_object('value', lp.construction_system, 'unit', '', 'description', 'Construction system'),
    'floors', jsonb_build_object('value', lp.floors, 'unit', '', 'description', 'Number of floors'),
    'study_period', jsonb_build_object('value', lp.study_period, 'unit', 'years', 'description', 'Study period'),
    'location', jsonb_build_object('value', lp.location, 'unit', '', 'description', 'Project location'),
    'energy_label', jsonb_build_object('value', lp.energy_label, 'unit', '', 'description', 'Energy label'),
    'heating_system', jsonb_build_object('value', lp.heating_system, 'unit', '', 'description', 'Heating system'),
    'annual_gas_use', jsonb_build_object('value', lp.annual_gas_use, 'unit', 'm³/year', 'description', 'Annual gas consumption'),
    'annual_electricity', jsonb_build_object('value', lp.annual_electricity, 'unit', 'kWh/year', 'description', 'Annual electricity consumption'),
    'mpg_reference_value', jsonb_build_object('value', lp.mpg_reference_value, 'unit', 'kg CO2/m²/year', 'description', 'MPG reference value'),
    'is_compliant', jsonb_build_object('value', lp.is_compliant, 'unit', '', 'description', 'MPG compliant')
  ) as parameters,

  -- Comparisons: Empty array (no separate lca_comparisons table exists)
  '[]'::jsonb as comparisons,

  'completed' as calculation_status,
  lp.updated_at as last_calculated_at,
  'National Environmental Database' as database_source,  -- Default value for existing projects
  '3.0' as database_version,  -- Default version
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
