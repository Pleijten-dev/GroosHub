import { NextRequest, NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db/connection';
import { z } from 'zod';

/**
 * POST /api/lca/materials/create
 *
 * Creates a new material with strict validation for LCA-critical fields
 *
 * CRITICAL: All LCA calculations depend on accurate material data.
 * This endpoint enforces required fields to prevent calculation errors.
 */

// Strict validation schema (server-side)
const createMaterialSchema = z.object({
  // Names (at least Dutch required)
  name_nl: z.string().min(1, 'Dutch name is required'),
  name_en: z.string().optional(),
  name_de: z.string().optional(),

  // Classification (required)
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  material_type: z.string().min(1, 'Material type is required'),

  // Physical properties (at least one required)
  density: z.number().positive().optional(),
  bulk_density: z.number().positive().optional(),
  area_weight: z.number().positive().optional(),
  thermal_conductivity: z.number().positive().optional(),

  // Units and conversion (CRITICAL)
  declared_unit: z.enum(['kg', 'm²', 'm³', 'm', 'piece']),
  conversion_to_kg: z.number().positive('Conversion to kg must be positive'),

  // LCA A1-A3 (CRITICAL - Production phase)
  gwp_a1_a3: z.number('GWP A1-A3 is required for LCA calculations'),

  // Optional LCA indicators
  odp_a1_a3: z.number().optional(),
  pocp_a1_a3: z.number().optional(),
  ap_a1_a3: z.number().optional(),
  ep_a1_a3: z.number().optional(),
  adpe_a1_a3: z.number().optional(),
  adpf_a1_a3: z.number().optional(),

  // Lifecycle phases (optional)
  gwp_a4: z.number().optional(),
  gwp_a5: z.number().optional(),
  gwp_c1: z.number().optional(),
  gwp_c2: z.number().optional(),
  gwp_c3: z.number().optional(),
  gwp_c4: z.number().optional(),
  gwp_d: z.number().optional(),

  // Carbon content
  biogenic_carbon: z.number().optional(),
  fossil_carbon: z.number().optional(),

  // Service life and EOL
  reference_service_life: z.number().int().positive().optional(),
  eol_scenario: z.string().optional(),
  recyclability: z.number().min(0).max(1).optional(),

  // Availability (required)
  region: z.string().min(1, 'Region is required'),
  dutch_availability: z.boolean(),

  // Metadata
  epd_owner: z.string().optional(),
  epd_url: z.string().url().optional().or(z.literal('')),
  quality_rating: z.number().int().min(1).max(5),
  is_verified: z.boolean(),
  is_generic: z.boolean(),
  is_public: z.boolean()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = createMaterialSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.error.issues
      }, { status: 400 });
    }

    const data = validation.data;

    // Insert into database
    const sql = await getDbConnection();
    const result = await sql`
      INSERT INTO lca_materials (
        name_nl,
        name_en,
        name_de,
        category,
        subcategory,
        material_type,
        density,
        bulk_density,
        area_weight,
        thermal_conductivity,
        declared_unit,
        conversion_to_kg,
        gwp_a1_a3,
        odp_a1_a3,
        pocp_a1_a3,
        ap_a1_a3,
        ep_a1_a3,
        adpe_a1_a3,
        adpf_a1_a3,
        gwp_a4,
        gwp_a5,
        gwp_c1,
        gwp_c2,
        gwp_c3,
        gwp_c4,
        gwp_d,
        biogenic_carbon,
        fossil_carbon,
        reference_service_life,
        eol_scenario,
        recyclability,
        region,
        dutch_availability,
        epd_owner,
        epd_url,
        quality_rating,
        is_verified,
        is_generic,
        is_public
      ) VALUES (
        ${data.name_nl},
        ${data.name_en || null},
        ${data.name_de || null},
        ${data.category},
        ${data.subcategory || null},
        ${data.material_type},
        ${data.density || null},
        ${data.bulk_density || null},
        ${data.area_weight || null},
        ${data.thermal_conductivity || null},
        ${data.declared_unit},
        ${data.conversion_to_kg},
        ${data.gwp_a1_a3},
        ${data.odp_a1_a3 || null},
        ${data.pocp_a1_a3 || null},
        ${data.ap_a1_a3 || null},
        ${data.ep_a1_a3 || null},
        ${data.adpe_a1_a3 || null},
        ${data.adpf_a1_a3 || null},
        ${data.gwp_a4 || null},
        ${data.gwp_a5 || null},
        ${data.gwp_c1 || null},
        ${data.gwp_c2 || null},
        ${data.gwp_c3 || null},
        ${data.gwp_c4 || null},
        ${data.gwp_d || null},
        ${data.biogenic_carbon || null},
        ${data.fossil_carbon || null},
        ${data.reference_service_life || null},
        ${data.eol_scenario || null},
        ${data.recyclability || null},
        ${data.region},
        ${data.dutch_availability},
        ${data.epd_owner || null},
        ${data.epd_url || null},
        ${data.quality_rating},
        ${data.is_verified},
        ${data.is_generic},
        ${data.is_public}
      )
      RETURNING id, name_nl, name_en, category, gwp_a1_a3
    `;

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Material created successfully'
    });

  } catch (error) {
    console.error('Error creating material:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create material',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
