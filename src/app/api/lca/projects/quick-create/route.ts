import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * POST /api/lca/projects/quick-create
 *
 * Quick Start form - Creates a project with pre-configured construction template
 *
 * Request body:
 * {
 *   "name": "string",
 *   "gross_floor_area": number,
 *   "building_type": "vrijstaand" | "rijwoning" | "appartement" | "tussenwoning" | "hoekwoning",
 *   "construction_system": "houtskelet" | "metselwerk" | "beton" | "clt",
 *   "insulation_level": "RC 3.5" | "RC 5.0" | "RC 6.0" | "RC 8.0" | "passief",
 *   "floors": number,
 *   "location": "string" (optional)
 * }
 *
 * Creates project with typical elements based on construction system and insulation level
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "project": { ...project },
 *     "elements_created": number,
 *     "layers_created": number
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      name,
      gross_floor_area,
      building_type,
      construction_system,
      insulation_level,
      floors,
      location
    } = body;

    // 3. Validate required fields
    if (!name || !gross_floor_area || !building_type || !construction_system || !insulation_level || !floors) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: ['name', 'gross_floor_area', 'building_type', 'construction_system', 'insulation_level', 'floors']
        },
        { status: 400 }
      );
    }

    const sql = getDbConnection();

    // 4. Create project
    const projectResult = await sql`
      INSERT INTO lca_projects (
        name,
        gross_floor_area,
        building_type,
        construction_system,
        floors,
        study_period,
        location,
        user_id,
        is_template,
        is_public
      ) VALUES (
        ${name},
        ${gross_floor_area},
        ${building_type},
        ${construction_system},
        ${floors},
        75,
        ${location || null},
        ${session.user.id},
        false,
        false
      )
      RETURNING *
    `;

    const project = projectResult[0];

    // 5. Apply construction template
    // TODO: Load template based on construction_system and insulation_level
    // For now, create basic elements structure

    const elementTemplates = getElementTemplates(
      construction_system,
      insulation_level,
      gross_floor_area,
      floors
    );

    let elementsCreated = 0;
    let layersCreated = 0;

    for (const elementTemplate of elementTemplates) {
      // Create element
      const elementResult = await sql`
        INSERT INTO lca_elements (
          project_id,
          name,
          category,
          quantity,
          quantity_unit,
          description
        ) VALUES (
          ${project.id},
          ${elementTemplate.name},
          ${elementTemplate.category},
          ${elementTemplate.quantity},
          ${elementTemplate.unit},
          ${elementTemplate.description || null}
        )
        RETURNING *
      `;

      const element = elementResult[0];
      elementsCreated++;

      // Create layers for this element
      // TODO: Query lca_materials for appropriate materials
      // For now, create placeholder structure
      console.log(`Element created: ${element.name} - Layers to be added based on material database`);

      // Example: Create layers (requires materials to be imported first)
      // const layers = elementTemplate.layers;
      // for (const layerTemplate of layers) {
      //   const materialResult = await sql`
      //     SELECT id FROM lca_materials
      //     WHERE category = ${layerTemplate.material_category}
      //       AND name_nl LIKE ${layerTemplate.material_search}
      //     LIMIT 1
      //   `;
      //
      //   if (materialResult.length > 0) {
      //     await sql`
      //       INSERT INTO lca_layers (
      //         element_id, position, material_id, thickness, coverage
      //       ) VALUES (
      //         ${element.id}, ${layerTemplate.position},
      //         ${materialResult[0].id}, ${layerTemplate.thickness}, ${layerTemplate.coverage}
      //       )
      //     `;
      //     layersCreated++;
      //   }
      // }
    }

    // 6. Return created project
    return NextResponse.json(
      {
        success: true,
        data: {
          project,
          elements_created: elementsCreated,
          layers_created: layersCreated,
          note: 'Template structure created. Material layers require imported EPD data.'
        }
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error('LCA Quick Create Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * Get element templates based on construction system and insulation level
 *
 * Returns typical building elements with quantities based on:
 * - Construction system (houtskelet, metselwerk, beton, clt)
 * - Insulation level (RC 3.5, RC 5.0, RC 6.0, RC 8.0, passief)
 * - Building dimensions (GFA, floors)
 */
function getElementTemplates(
  constructionSystem: string,
  insulationLevel: string,
  gfa: number,
  floors: number
): Array<{
  name: string;
  category: string;
  quantity: number;
  unit: string;
  description?: string;
}> {
  // Estimate typical areas for a Dutch residential building
  const floorArea = gfa / floors; // Area per floor
  const footprint = floorArea; // Ground floor footprint

  // Estimate perimeter (assuming rectangular shape with aspect ratio ~1.5)
  const width = Math.sqrt(footprint / 1.5);
  const length = width * 1.5;
  const perimeter = 2 * (width + length);

  // Estimate wall height
  const wallHeight = 2.6; // Typical Dutch residential
  const exteriorWallArea = perimeter * wallHeight * floors;
  const roofArea = footprint * 1.1; // +10% for slope
  const floorArea1 = footprint; // Ground floor
  const floorAreaN = (floors > 1) ? footprint * (floors - 1) : 0; // Upper floors

  const templates = [
    {
      name: 'Gevel (buitenmuur)',
      category: 'exterior_wall',
      quantity: Math.round(exteriorWallArea),
      unit: 'm2',
      description: `${constructionSystem} constructie, ${insulationLevel}`
    },
    {
      name: 'Dak',
      category: 'roof',
      quantity: Math.round(roofArea),
      unit: 'm2',
      description: `${constructionSystem} dak, ${insulationLevel}`
    },
    {
      name: 'Begane grond vloer',
      category: 'floor',
      quantity: Math.round(floorArea1),
      unit: 'm2',
      description: `Vloer op grond, ${insulationLevel}`
    }
  ];

  // Add intermediate floors if multi-story
  if (floors > 1) {
    templates.push({
      name: 'Tussenvloer',
      category: 'floor',
      quantity: Math.round(floorAreaN),
      unit: 'm2',
      description: `Houten balkenvloer (${floors - 1} verdieping${floors > 2 ? 'en' : ''})`
    });
  }

  // Add windows (typical 20% of wall area)
  templates.push({
    name: 'Kozijnen en beglazing',
    category: 'windows',
    quantity: Math.round(exteriorWallArea * 0.2),
    unit: 'm2',
    description: 'Triple glas, HR++'
  });

  // Add foundation (simplified)
  templates.push({
    name: 'Fundering',
    category: 'foundation',
    quantity: Math.round(perimeter),
    unit: 'm',
    description: 'Strook- of paalfundering'
  });

  return templates;
}
