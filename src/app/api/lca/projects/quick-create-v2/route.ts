import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDbConnection } from '@/lib/db/connection';

/**
 * POST /api/lca/projects/quick-create-v2
 *
 * Quick Start form with package selections - Creates a project using selected packages
 *
 * Request body:
 * {
 *   "name": "string",
 *   "gross_floor_area": number,
 *   "floors": number,
 *   "dwelling_count": number,
 *   "location": "string" (optional),
 *   "construction_system": "houtskelet" | "clt" | "metselwerk" | "beton",
 *   "study_period": number (default: 75),
 *   "packages": {
 *     "exterior_wall": "package_id",
 *     "roof": "package_id",
 *     "floor": "package_id",
 *     "windows": "package_id",
 *     "foundation": "package_id"
 *   }
 * }
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
      floors,
      dwelling_count,
      location,
      construction_system,
      study_period = 75,
      packages
    } = body;

    // 3. Validate required fields
    if (!name || !gross_floor_area || !floors || !dwelling_count || !construction_system || !packages) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          required: ['name', 'gross_floor_area', 'floors', 'dwelling_count', 'construction_system', 'packages']
        },
        { status: 400 }
      );
    }

    // Validate package selections
    if (!packages.exterior_wall || !packages.roof || !packages.floor ||
        !packages.windows || !packages.foundation) {
      return NextResponse.json(
        {
          success: false,
          error: 'All package selections are required',
          required: ['exterior_wall', 'roof', 'floor', 'windows', 'foundation']
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
        floors,
        dwelling_count,
        construction_system,
        study_period,
        location,
        user_id,
        is_template,
        is_public
      ) VALUES (
        ${name},
        ${gross_floor_area},
        ${floors},
        ${dwelling_count},
        ${construction_system},
        ${study_period},
        ${location || null},
        ${session.user.id},
        false,
        false
      )
      RETURNING *
    `;

    const project = projectResult[0];

    // 5. Calculate building dimensions for element quantities
    const floorArea = gross_floor_area / floors;
    const footprint = floorArea;

    // Estimate perimeter (assuming rectangular shape with aspect ratio ~1.5)
    const width = Math.sqrt(footprint / 1.5);
    const length = width * 1.5;
    const perimeter = 2 * (width + length);

    // Estimate wall height
    const wallHeight = 2.6; // Typical Dutch residential
    const exteriorWallArea = perimeter * wallHeight * floors;
    const roofArea = footprint * 1.1; // +10% for slope
    const floorArea1 = footprint; // Ground floor

    // 6. Apply packages to create elements
    let elementsCreated = 0;
    let layersCreated = 0;

    // Helper function to apply a package
    const applyPackage = async (
      packageId: string,
      elementName: string,
      quantity: number,
      unit: string = 'm2'
    ) => {
      // Get package details
      const packageDetails = await sql`
        SELECT * FROM lca_packages WHERE id = ${packageId}
      `;

      if (packageDetails.length === 0) {
        throw new Error(`Package not found: ${packageId}`);
      }

      const pkg = packageDetails[0];

      // Create element
      const elementResult = await sql`
        INSERT INTO lca_elements (
          project_id,
          package_id,
          name,
          category,
          quantity,
          quantity_unit,
          description
        ) VALUES (
          ${project.id},
          ${packageId},
          ${elementName},
          ${pkg.category},
          ${quantity},
          ${unit},
          ${pkg.description || null}
        )
        RETURNING *
      `;

      const element = elementResult[0];
      elementsCreated++;

      // Get package layers
      const packageLayers = await sql`
        SELECT * FROM lca_package_layers
        WHERE package_id = ${packageId}
        ORDER BY position ASC
      `;

      // Copy layers to element
      for (const layer of packageLayers) {
        await sql`
          INSERT INTO lca_layers (
            element_id,
            position,
            material_id,
            thickness,
            coverage
          ) VALUES (
            ${element.id},
            ${layer.position},
            ${layer.material_id},
            ${layer.thickness},
            ${layer.coverage}
          )
        `;
        layersCreated++;
      }

      // Increment package usage count
      await sql`
        UPDATE lca_packages
        SET usage_count = usage_count + 1
        WHERE id = ${packageId}
      `;
    };

    // Apply each package
    await applyPackage(
      packages.exterior_wall,
      'Gevel (buitenmuur)',
      Math.round(exteriorWallArea),
      'm2'
    );

    await applyPackage(
      packages.roof,
      'Dak',
      Math.round(roofArea),
      'm2'
    );

    await applyPackage(
      packages.floor,
      'Begane grond vloer',
      Math.round(floorArea1),
      'm2'
    );

    // Add intermediate floors if multi-story
    if (floors > 1) {
      const floorAreaN = footprint * (floors - 1);
      await applyPackage(
        packages.floor,
        'Tussenvloer',
        Math.round(floorAreaN),
        'm2'
      );
    }

    // Windows (estimate based on typical window-to-wall ratio)
    const windowToWallRatio = 0.20; // 20% typical
    const windowArea = exteriorWallArea * windowToWallRatio;
    await applyPackage(
      packages.windows,
      'Kozijnen en beglazing',
      Math.round(windowArea),
      'm2'
    );

    // Foundation (by perimeter length)
    await applyPackage(
      packages.foundation,
      'Fundering',
      Math.round(perimeter),
      'm'
    );

    // 7. Return created project
    return NextResponse.json(
      {
        success: true,
        data: {
          project,
          elements_created: elementsCreated,
          layers_created: layersCreated
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
