-- ============================================
-- LCA CALCULATOR TEST DATA
-- ============================================
-- Creates a test project with realistic elements and layers
-- Run this script after importing materials from Ökobaudat

-- NOTE: Update the user_id to match an existing user in your database
-- You can find a user_id by running: SELECT id FROM users LIMIT 1;

-- Clean up any existing test data
DELETE FROM lca_layers WHERE element_id IN (
  SELECT id FROM lca_elements WHERE project_id = '00000000-0000-0000-0000-000000000001'
);
DELETE FROM lca_elements WHERE project_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM lca_projects WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================
-- TEST PROJECT: Houtskelet Woning
-- ============================================

INSERT INTO lca_projects (
  id,
  name,
  description,
  gross_floor_area,
  building_type,
  construction_system,
  floors,
  study_period,
  location,
  energy_label,
  user_id,
  is_template,
  is_public,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Houtskelet Woning - RC 6.0',
  'Test project voor calculator verificatie: Houtskeletbouw woning met RC 6.0 isolatie',
  120.0,                    -- 120 m² GFA
  'vrijstaand',             -- Detached house
  'houtskelet',             -- Timber frame
  2,                        -- 2 floors
  75,                       -- 75 year study period
  'Utrecht, Nederland',
  'A',                      -- Energy label A
  1,                        -- USER_ID: UPDATE THIS TO MATCH YOUR DATABASE!
  false,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- ============================================
-- ELEMENT 1: Exterior Wall (Gevel)
-- ============================================
-- Typical Dutch timber frame wall: OSB + insulation + timber studs + finishing

INSERT INTO lca_elements (
  id,
  project_id,
  name,
  category,
  quantity,
  quantity_unit,
  description
) VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Gevel Noord',
  'exterior_wall',
  50.0,                     -- 50 m² wall area
  'm2',
  'Houtskelet buitenmuur met RC 6.0 isolatie'
);

-- Layer 1: Exterior OSB board (12mm)
-- Find OSB material from imported materials
INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000010',
  1,
  id,
  0.012,                    -- 12mm thickness
  1.0                       -- 100% coverage
FROM lca_materials
WHERE category = 'timber'
  AND (name_en ILIKE '%OSB%' OR name_de ILIKE '%OSB%')
  AND dutch_availability = true
LIMIT 1;

-- Layer 2: Mineral wool insulation (200mm for RC 6.0)
INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000010',
  2,
  id,
  0.200,                    -- 200mm thickness
  1.0                       -- 100% coverage
FROM lca_materials
WHERE category = 'insulation'
  AND (name_en ILIKE '%mineral wool%' OR name_de ILIKE '%Mineralwolle%')
  AND dutch_availability = true
LIMIT 1;

-- Layer 3: Timber studs (45x195mm @ 600mm centers = 7.5% coverage)
INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000010',
  3,
  id,
  0.195,                    -- 195mm depth
  0.075                     -- 7.5% coverage (45mm stud / 600mm spacing)
FROM lca_materials
WHERE category = 'timber'
  AND (name_en ILIKE '%structural timber%' OR name_en ILIKE '%sawn timber%' OR name_de ILIKE '%Konstruktionsholz%')
  AND dutch_availability = true
LIMIT 1;

-- Layer 4: Interior gypsum board (12.5mm)
INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000010',
  4,
  id,
  0.0125,                   -- 12.5mm thickness
  1.0                       -- 100% coverage
FROM lca_materials
WHERE category = 'finishes'
  AND (name_en ILIKE '%gypsum%' OR name_de ILIKE '%Gipsplatte%')
  AND dutch_availability = true
LIMIT 1;

-- ============================================
-- ELEMENT 2: Roof (Dak)
-- ============================================

INSERT INTO lca_elements (
  id,
  project_id,
  name,
  category,
  quantity,
  quantity_unit,
  description
) VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Dakvlak',
  'roof',
  65.0,                     -- 65 m² roof area (120 m² footprint * 1.08 slope factor / 2 floors)
  'm2',
  'Hellend dak met RC 6.0 isolatie'
);

-- Layer 1: Roof tiles
INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000011',
  1,
  id,
  0.015,                    -- 15mm equivalent thickness
  1.0
FROM lca_materials
WHERE category = 'finishes'
  AND (name_en ILIKE '%roof tile%' OR name_en ILIKE '%clay tile%' OR name_de ILIKE '%Dachziegel%')
  AND dutch_availability = true
LIMIT 1;

-- Layer 2: Roof insulation (240mm for RC 6.0)
INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000011',
  2,
  id,
  0.240,                    -- 240mm
  1.0
FROM lca_materials
WHERE category = 'insulation'
  AND (name_en ILIKE '%mineral wool%' OR name_de ILIKE '%Mineralwolle%')
  AND dutch_availability = true
LIMIT 1;

-- Layer 3: Timber rafters
INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000011',
  3,
  id,
  0.240,                    -- 240mm depth
  0.08                      -- 8% coverage (50mm rafter / 600mm spacing)
FROM lca_materials
WHERE category = 'timber'
  AND (name_en ILIKE '%structural timber%' OR name_en ILIKE '%sawn timber%')
  AND dutch_availability = true
LIMIT 1;

-- ============================================
-- ELEMENT 3: Ground Floor (Begane grond vloer)
-- ============================================

INSERT INTO lca_elements (
  id,
  project_id,
  name,
  category,
  quantity,
  quantity_unit,
  description
) VALUES (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'Begane grond vloer',
  'floor',
  60.0,                     -- 60 m² ground floor
  'm2',
  'Betonvloer op grond met isolatie'
);

-- Layer 1: Floor finish (tiles)
INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000012',
  1,
  id,
  0.010,                    -- 10mm tiles
  1.0
FROM lca_materials
WHERE category = 'finishes'
  AND (name_en ILIKE '%ceramic%' OR name_en ILIKE '%floor tile%' OR name_de ILIKE '%Fliese%')
  AND dutch_availability = true
LIMIT 1;

-- Layer 2: Concrete slab (150mm)
INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000012',
  2,
  id,
  0.150,                    -- 150mm
  1.0
FROM lca_materials
WHERE category = 'concrete'
  AND (name_en ILIKE '%concrete%' OR name_de ILIKE '%Beton%')
  AND NOT (name_en ILIKE '%reinforced%')  -- Regular concrete, not reinforced
  AND dutch_availability = true
LIMIT 1;

-- Layer 3: Floor insulation (100mm)
INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000012',
  3,
  id,
  0.100,                    -- 100mm
  1.0
FROM lca_materials
WHERE category = 'insulation'
  AND (name_en ILIKE '%polystyrene%' OR name_en ILIKE '%EPS%' OR name_de ILIKE '%Polystyrol%')
  AND dutch_availability = true
LIMIT 1;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that test data was created successfully
SELECT
  'Test project created' as status,
  id,
  name,
  gross_floor_area,
  building_type,
  construction_system
FROM lca_projects
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT
  'Elements created' as status,
  COUNT(*) as element_count
FROM lca_elements
WHERE project_id = '00000000-0000-0000-0000-000000000001';

SELECT
  'Layers created' as status,
  COUNT(*) as layer_count
FROM lca_layers
WHERE element_id IN (
  SELECT id FROM lca_elements WHERE project_id = '00000000-0000-0000-0000-000000000001'
);

-- Show complete structure
SELECT
  e.name as element_name,
  l.position,
  m.name_en as material_name,
  l.thickness,
  l.coverage,
  m.gwp_a1_a3
FROM lca_elements e
JOIN lca_layers l ON l.element_id = e.id
JOIN lca_materials m ON m.id = l.material_id
WHERE e.project_id = '00000000-0000-0000-0000-000000000001'
ORDER BY e.name, l.position;
