# LCA Calculator SQL Conversion Guide

This document outlines how to convert `src/features/lca/utils/lca-calculator.ts` from Prisma ORM to direct SQL queries using the Neon serverless driver.

## Current State

The calculator currently uses placeholder Prisma types and expects a PrismaClient instance:

```typescript
// Current signature
export async function calculateProjectLCA(
  projectId: string,
  prisma: PrismaClient  // ❌ Placeholder type
): Promise<LCAResult>
```

## Target State

Convert to use SQL connection from `src/lib/db/connection.ts`:

```typescript
// Target signature
export async function calculateProjectLCA(
  projectId: string
): Promise<LCAResult>
```

---

## Required Changes

### 1. Update Imports

**Before:**
```typescript
import type { Material, LCAProject, LCAElement, LCALayer } from '../types';

// Placeholder
type PrismaClient = any;
```

**After:**
```typescript
import type { Material, LCAProject, LCAElement, LCALayer } from '../types';
import { getDbConnection } from '@/lib/db/connection';
```

---

### 2. Convert Data Loading Query

The main function loads a project with all nested elements and layers.

**Before (Prisma):**
```typescript
const project = await prisma.lCAProject.findUnique({
  where: { id: projectId },
  include: {
    elements: {
      include: {
        layers: {
          include: {
            material: true
          },
          orderBy: { position: 'asc' }
        }
      }
    }
  }
});
```

**After (SQL with JOINs):**
```typescript
const sql = getDbConnection();

// Load project data
const projectRows = await sql`
  SELECT
    p.*,
    e.id as element_id,
    e.name as element_name,
    e.sfb_code,
    e.category as element_category,
    e.quantity,
    e.quantity_unit,
    l.id as layer_id,
    l.position as layer_position,
    l.thickness as layer_thickness,
    l.coverage as layer_coverage,
    l.custom_lifespan,
    l.custom_transport_km,
    l.custom_eol_scenario,
    m.*
  FROM lca_projects p
  LEFT JOIN lca_elements e ON e.project_id = p.id
  LEFT JOIN lca_layers l ON l.element_id = e.id
  LEFT JOIN lca_materials m ON m.id = l.material_id
  WHERE p.id = ${projectId}
  ORDER BY e.id, l.position
`;

if (projectRows.length === 0) {
  throw new Error(`Project ${projectId} not found`);
}

// Transform flat rows into nested structure
const project = transformToNestedStructure(projectRows);
```

---

### 3. Create Data Transformation Helper

The SQL query returns flat rows, but the calculator expects nested objects.

**Add this helper function:**

```typescript
interface ProjectRow {
  // Project fields
  id: string;
  name: string;
  gross_floor_area: number;
  study_period: number;
  building_type: string;
  // Element fields (nullable)
  element_id: string | null;
  element_name: string | null;
  element_category: string | null;
  quantity: number | null;
  quantity_unit: string | null;
  // Layer fields (nullable)
  layer_id: string | null;
  layer_position: number | null;
  layer_thickness: number | null;
  layer_coverage: number | null;
  custom_lifespan: number | null;
  custom_transport_km: number | null;
  custom_eol_scenario: string | null;
  // Material fields (all Material interface fields)
  // ... (65 fields from Material interface)
}

function transformToNestedStructure(rows: ProjectRow[]): ProjectWithElements {
  if (rows.length === 0) {
    throw new Error('No project data found');
  }

  const firstRow = rows[0];

  // Extract project data (same for all rows)
  const project: LCAProject = {
    id: firstRow.id,
    name: firstRow.name,
    description: firstRow.description,
    project_number: firstRow.project_number,
    gross_floor_area: firstRow.gross_floor_area,
    building_type: firstRow.building_type,
    construction_system: firstRow.construction_system,
    floors: firstRow.floors,
    study_period: firstRow.study_period,
    location: firstRow.location,
    energy_label: firstRow.energy_label,
    heating_system: firstRow.heating_system,
    annual_gas_use: firstRow.annual_gas_use,
    annual_electricity: firstRow.annual_electricity,
    total_gwp_a1_a3: firstRow.total_gwp_a1_a3,
    total_gwp_a4: firstRow.total_gwp_a4,
    total_gwp_a5: firstRow.total_gwp_a5,
    total_gwp_b4: firstRow.total_gwp_b4,
    total_gwp_c: firstRow.total_gwp_c,
    total_gwp_d: firstRow.total_gwp_d,
    total_gwp_sum: firstRow.total_gwp_sum,
    total_gwp_per_m2_year: firstRow.total_gwp_per_m2_year,
    operational_carbon: firstRow.operational_carbon,
    total_carbon: firstRow.total_carbon,
    mpg_reference_value: firstRow.mpg_reference_value,
    is_compliant: firstRow.is_compliant,
    user_id: firstRow.user_id,
    is_template: firstRow.is_template,
    is_public: firstRow.is_public,
    created_at: firstRow.created_at,
    updated_at: firstRow.updated_at
  };

  // Group rows by element_id
  const elementsMap = new Map<string, ElementWithLayers>();

  rows.forEach(row => {
    if (!row.element_id) return; // Skip if no element

    // Get or create element
    if (!elementsMap.has(row.element_id)) {
      elementsMap.set(row.element_id, {
        id: row.element_id,
        project_id: project.id,
        name: row.element_name!,
        sfb_code: row.sfb_code,
        category: row.element_category!,
        quantity: row.quantity!,
        quantity_unit: row.quantity_unit!,
        description: null,
        notes: null,
        total_gwp_a1_a3: null,
        total_gwp_a4: null,
        total_gwp_a5: null,
        total_gwp_b4: null,
        total_gwp_c: null,
        total_gwp_d: null,
        created_at: new Date(),
        updated_at: new Date(),
        layers: []
      });
    }

    const element = elementsMap.get(row.element_id)!;

    // Add layer if present
    if (row.layer_id) {
      const material: Material = {
        id: row.id,
        oekobaudat_uuid: row.oekobaudat_uuid,
        oekobaudat_version: row.oekobaudat_version,
        name_de: row.name_de,
        name_en: row.name_en,
        name_nl: row.name_nl,
        category: row.category,
        subcategory: row.subcategory,
        material_type: row.material_type,
        density: row.density,
        bulk_density: row.bulk_density,
        area_weight: row.area_weight,
        reference_thickness: row.reference_thickness,
        thermal_conductivity: row.thermal_conductivity,
        declared_unit: row.declared_unit,
        conversion_to_kg: row.conversion_to_kg,
        gwp_a1_a3: row.gwp_a1_a3,
        odp_a1_a3: row.odp_a1_a3,
        pocp_a1_a3: row.pocp_a1_a3,
        ap_a1_a3: row.ap_a1_a3,
        ep_a1_a3: row.ep_a1_a3,
        adpe_a1_a3: row.adpe_a1_a3,
        adpf_a1_a3: row.adpf_a1_a3,
        gwp_a4: row.gwp_a4,
        transport_distance: row.transport_distance,
        transport_mode: row.transport_mode,
        gwp_a5: row.gwp_a5,
        gwp_c1: row.gwp_c1,
        gwp_c2: row.gwp_c2,
        gwp_c3: row.gwp_c3,
        gwp_c4: row.gwp_c4,
        gwp_d: row.gwp_d,
        biogenic_carbon: row.biogenic_carbon,
        fossil_carbon: row.fossil_carbon,
        reference_service_life: row.reference_service_life,
        rsl_source: row.rsl_source,
        rsl_confidence: row.rsl_confidence,
        eol_scenario: row.eol_scenario,
        recyclability: row.recyclability,
        region: row.region,
        dutch_availability: row.dutch_availability,
        epd_validity: row.epd_validity,
        epd_owner: row.epd_owner,
        epd_url: row.epd_url,
        background_database: row.background_database,
        quality_rating: row.quality_rating,
        is_verified: row.is_verified,
        is_generic: row.is_generic,
        user_id: row.user_id,
        is_public: row.is_public,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      element.layers.push({
        id: row.layer_id,
        element_id: row.element_id,
        position: row.layer_position!,
        material_id: row.id,
        thickness: row.layer_thickness!,
        coverage: row.layer_coverage!,
        custom_lifespan: row.custom_lifespan,
        custom_transport_km: row.custom_transport_km,
        custom_eol_scenario: row.custom_eol_scenario,
        material
      });
    }
  });

  return {
    ...project,
    elements: Array.from(elementsMap.values())
  };
}
```

---

### 4. Update Function Signature

**Before:**
```typescript
export async function calculateProjectLCA(
  projectId: string,
  prisma: PrismaClient
): Promise<LCAResult>
```

**After:**
```typescript
export async function calculateProjectLCA(
  projectId: string
): Promise<LCAResult>
```

Remove the `prisma` parameter and use `getDbConnection()` internally.

---

### 5. Update Result Caching (Optional Optimization)

After calculating results, update the cached totals in the project record:

```typescript
// At the end of calculateProjectLCA, before returning result

const sql = getDbConnection();

await sql`
  UPDATE lca_projects
  SET
    total_gwp_a1_a3 = ${result.a1_a3},
    total_gwp_a4 = ${result.a4},
    total_gwp_a5 = ${result.a5},
    total_gwp_b4 = ${result.b4},
    total_gwp_c = ${result.c1_c2 + result.c3 + result.c4},
    total_gwp_d = ${result.d},
    total_gwp_sum = ${result.total_a_to_c},
    total_gwp_per_m2_year = ${normalizedResult.gwp_per_m2_per_year},
    operational_carbon = ${operationalCarbon},
    total_carbon = ${normalizedResult.gwp_per_m2_per_year + (operationalCarbon / studyPeriod)},
    mpg_reference_value = ${mpgReference},
    is_compliant = ${normalizedResult.gwp_per_m2_per_year <= mpgReference},
    updated_at = CURRENT_TIMESTAMP
  WHERE id = ${projectId}
`;

return result;
```

---

## Testing the Conversion

### 1. Create Test Data

First, insert a test project with elements and layers:

```sql
-- Insert test project
INSERT INTO lca_projects (
  id, name, gross_floor_area, building_type,
  construction_system, floors, study_period, user_id
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Houtskelet Woning',
  120.0,
  'vrijstaand',
  'houtskelet',
  2,
  75,
  1
);

-- Insert test element (exterior wall)
INSERT INTO lca_elements (
  id, project_id, name, category, quantity, quantity_unit
) VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Gevel Noord',
  'exterior_wall',
  30.0,
  'm2'
);

-- Insert test layers
-- (Use actual material IDs from your imported lca_materials)
INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000010',
  1,
  id,
  0.020,  -- 20mm
  1.0
FROM lca_materials
WHERE category = 'finishes'
  AND name_en LIKE '%plaster%'
LIMIT 1;

INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000010',
  2,
  id,
  0.200,  -- 200mm
  1.0
FROM lca_materials
WHERE category = 'insulation'
  AND name_en LIKE '%mineral wool%'
LIMIT 1;

INSERT INTO lca_layers (element_id, position, material_id, thickness, coverage)
SELECT
  '00000000-0000-0000-0000-000000000010',
  3,
  id,
  0.045,  -- 45mm
  0.15    -- 15% coverage (studs)
FROM lca_materials
WHERE category = 'timber'
  AND name_en LIKE '%structural timber%'
LIMIT 1;
```

### 2. Test the Calculation

Create a test file `scripts/test-lca-calculation.ts`:

```typescript
import { calculateProjectLCA } from '../src/features/lca/utils/lca-calculator';

async function testCalculation() {
  try {
    console.log('🧪 Testing LCA calculation...\n');

    const projectId = '00000000-0000-0000-0000-000000000001';
    const result = await calculateProjectLCA(projectId);

    console.log('✅ Calculation successful!\n');
    console.log('📊 Results:');
    console.log('----------------------------------------');
    console.log(`A1-A3 (Production):    ${result.a1_a3.toFixed(2)} kg CO₂-eq`);
    console.log(`A4 (Transport):        ${result.a4.toFixed(2)} kg CO₂-eq`);
    console.log(`A5 (Construction):     ${result.a5.toFixed(2)} kg CO₂-eq`);
    console.log(`B4 (Replacement):      ${result.b4.toFixed(2)} kg CO₂-eq`);
    console.log(`C1-C2 (Deconstruction):${result.c1_c2.toFixed(2)} kg CO₂-eq`);
    console.log(`C3 (Processing):       ${result.c3.toFixed(2)} kg CO₂-eq`);
    console.log(`C4 (Disposal):         ${result.c4.toFixed(2)} kg CO₂-eq`);
    console.log(`D (Benefits):          ${result.d.toFixed(2)} kg CO₂-eq`);
    console.log('----------------------------------------');
    console.log(`Total (A-C):           ${result.total_a_to_c.toFixed(2)} kg CO₂-eq`);
    console.log(`Total (with D):        ${result.total_with_d.toFixed(2)} kg CO₂-eq`);
    console.log('\n📈 Breakdown by element:');
    result.breakdown_by_element.forEach(el => {
      console.log(`  ${el.element_name}: ${el.total.toFixed(2)} kg CO₂-eq`);
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Test failed:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testCalculation()
  .then(() => {
    console.log('\n✨ Test complete');
    process.exit(0);
  })
  .catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 Test crashed:', errorMessage);
    process.exit(1);
  });
```

Run the test:
```bash
npx tsx scripts/test-lca-calculation.ts
```

---

## File Checklist

- [ ] Update `src/features/lca/utils/lca-calculator.ts`
  - [ ] Remove PrismaClient import/type
  - [ ] Add getDbConnection import
  - [ ] Convert data loading query
  - [ ] Add transformToNestedStructure helper
  - [ ] Update function signature
  - [ ] Add result caching query
- [ ] Create `scripts/test-lca-calculation.ts`
- [ ] Create test data in database
- [ ] Run test and verify results

---

## Expected Behavior After Conversion

1. **No Prisma dependency**: Calculator works with direct SQL
2. **Same API**: Function signature simplified (no prisma param)
3. **Same results**: Calculations produce identical output
4. **Cached results**: Project table updated with totals
5. **Performance**: Similar or better (fewer round trips)

---

## Next Steps After Conversion

Once the calculator is converted and tested:

1. **Create API endpoints** (Phase 1)
   - POST `/api/lca/calculate` - Trigger calculation
   - GET `/api/lca/projects/:id` - Get project results
   - POST `/api/lca/projects/quick-create` - Quick Start form

2. **Build frontend pages** (Phase 2)
   - Quick Start form
   - Results Dashboard with charts

3. **Add more test cases** (Phase 1)
   - Different building types
   - Different construction systems
   - Edge cases (missing data, zero values)

---

## Common Issues & Solutions

### Issue: "Cannot read property 'layers' of undefined"

**Cause**: SQL query returned no rows (project not found)

**Solution**: Check the WHERE clause and verify projectId exists:
```typescript
if (projectRows.length === 0) {
  throw new Error(`Project ${projectId} not found`);
}
```

### Issue: "TypeError: Cannot read property 'gwp_a1_a3' of null"

**Cause**: Material not found for a layer

**Solution**: Check LEFT JOIN and handle null materials:
```typescript
if (!row.id) {
  console.warn(`Layer ${row.layer_id} has no material - skipping`);
  return;
}
```

### Issue: Results don't match expected values

**Cause**: Incorrect data transformation or calculation logic

**Solution**: Add debug logging:
```typescript
console.log('Project:', project);
console.log('Elements:', project.elements.length);
project.elements.forEach(el => {
  console.log(`  Element: ${el.name}, Layers: ${el.layers.length}`);
  el.layers.forEach(layer => {
    console.log(`    Layer ${layer.position}: ${layer.material.name_en}, ${layer.thickness}m`);
  });
});
```

---

## Performance Considerations

### Current Approach: Single Large Query

**Pros:**
- Single database round trip
- All data loaded upfront
- Simpler error handling

**Cons:**
- Large result set for projects with many elements
- More complex data transformation

### Alternative: Multiple Queries

If performance becomes an issue with large projects:

```typescript
// Load project
const [project] = await sql`SELECT * FROM lca_projects WHERE id = ${projectId}`;

// Load elements
const elements = await sql`SELECT * FROM lca_elements WHERE project_id = ${projectId}`;

// Load layers with materials
const layers = await sql`
  SELECT l.*, m.*
  FROM lca_layers l
  JOIN lca_materials m ON m.id = l.material_id
  WHERE l.element_id = ANY(${elements.map(e => e.id)})
  ORDER BY l.element_id, l.position
`;

// Transform and combine
```

**Use the single query approach first** - only optimize if needed.

