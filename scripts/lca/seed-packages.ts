/**
 * Seed LCA Packages
 *
 * This script populates the lca_packages table with system templates
 * based on common Dutch construction systems.
 *
 * Run with: npx ts-node scripts/lca/seed-packages.ts
 */

import { getDbConnection } from '../../src/lib/db/connection';

interface LayerTemplate {
  position: number;
  materialCategory: string;
  materialSearch: string;
  thickness: number;  // meters
  coverage: number;
  layerFunction?: string;
}

interface PackageTemplate {
  name: string;
  description: string;
  category: string;
  constructionSystem?: string;
  insulationLevel?: string;
  tags: string[];
  layers: LayerTemplate[];
}

async function main() {
  console.log('🌱 Seeding LCA Packages...\n');

  const sql = getDbConnection();

  try {
    // Check if packages already exist
    const existing = await sql`SELECT COUNT(*) as count FROM lca_packages WHERE is_template = true`;
    if (parseInt(existing[0].count) > 0) {
      console.log(`⚠️  Found ${existing[0].count} existing template packages.`);
      console.log('Delete them first if you want to re-seed.\n');
      process.exit(0);
    }

    // Define all package templates
    const packages: PackageTemplate[] = [
      // ============================================
      // EXTERIOR WALLS - Houtskelet
      // ============================================
      {
        name: 'Houtskelet RC 5.0 - Houten gevelbekleding',
        description: 'Houtskeletbouw wand met houten gevelbekleding, RC 5.0 isolatie (20cm mineraalwol)',
        category: 'exterior_wall',
        constructionSystem: 'houtskelet',
        insulationLevel: 'rc_5.0',
        tags: ['hout', 'duurzaam', 'standaard'],
        layers: [
          { position: 1, materialCategory: 'timber', materialSearch: '%hout%gevelbekleding%', thickness: 0.018, coverage: 1.0, layerFunction: 'finish' },
          { position: 2, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.012, coverage: 1.0, layerFunction: 'structural' },
          { position: 3, materialCategory: 'insulation', materialSearch: '%mineraalwol%', thickness: 0.200, coverage: 1.0, layerFunction: 'insulation' },
          { position: 4, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.012, coverage: 0.075, layerFunction: 'structural' },
          { position: 5, materialCategory: 'finishes', materialSearch: '%gips%', thickness: 0.0125, coverage: 1.0, layerFunction: 'finish' }
        ]
      },
      {
        name: 'Houtskelet RC 5.0 - Vezelcement',
        description: 'Houtskeletbouw wand met vezelcement platen, RC 5.0 isolatie',
        category: 'exterior_wall',
        constructionSystem: 'houtskelet',
        insulationLevel: 'rc_5.0',
        tags: ['vezelcement', 'onderhoudsarm'],
        layers: [
          { position: 1, materialCategory: 'finishes', materialSearch: '%vezelcement%', thickness: 0.010, coverage: 1.0, layerFunction: 'finish' },
          { position: 2, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.012, coverage: 1.0, layerFunction: 'structural' },
          { position: 3, materialCategory: 'insulation', materialSearch: '%mineraalwol%', thickness: 0.200, coverage: 1.0, layerFunction: 'insulation' },
          { position: 4, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.012, coverage: 0.075, layerFunction: 'structural' },
          { position: 5, materialCategory: 'finishes', materialSearch: '%gips%', thickness: 0.0125, coverage: 1.0, layerFunction: 'finish' }
        ]
      },
      {
        name: 'Houtskelet RC 5.0 - Metselwerk voorgevel',
        description: 'Houtskeletbouw wand met bakstenen voorgevel, RC 5.0 isolatie',
        category: 'exterior_wall',
        constructionSystem: 'houtskelet',
        insulationLevel: 'rc_5.0',
        tags: ['baksteen', 'traditioneel'],
        layers: [
          { position: 1, materialCategory: 'masonry', materialSearch: '%baksteen%', thickness: 0.100, coverage: 1.0, layerFunction: 'finish' },
          { position: 2, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.012, coverage: 1.0, layerFunction: 'structural' },
          { position: 3, materialCategory: 'insulation', materialSearch: '%mineraalwol%', thickness: 0.200, coverage: 1.0, layerFunction: 'insulation' },
          { position: 4, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.012, coverage: 0.075, layerFunction: 'structural' },
          { position: 5, materialCategory: 'finishes', materialSearch: '%gips%', thickness: 0.0125, coverage: 1.0, layerFunction: 'finish' }
        ]
      },

      // ============================================
      // EXTERIOR WALLS - Metselwerk
      // ============================================
      {
        name: 'Metselwerk RC 5.0 - Spouwmuur',
        description: 'Traditionele spouwmuur met bakstenen buitenblad en kalkzandsteen binnenblad, RC 5.0 spouwisolatie',
        category: 'exterior_wall',
        constructionSystem: 'metselwerk',
        insulationLevel: 'rc_5.0',
        tags: ['traditioneel', 'duurzaam', 'spouwmuur'],
        layers: [
          { position: 1, materialCategory: 'masonry', materialSearch: '%baksteen%', thickness: 0.100, coverage: 1.0, layerFunction: 'finish' },
          { position: 2, materialCategory: 'insulation', materialSearch: '%EPS%', thickness: 0.200, coverage: 1.0, layerFunction: 'insulation' },
          { position: 3, materialCategory: 'masonry', materialSearch: '%kalkzandsteen%', thickness: 0.100, coverage: 1.0, layerFunction: 'structural' },
          { position: 4, materialCategory: 'finishes', materialSearch: '%gips%', thickness: 0.010, coverage: 1.0, layerFunction: 'finish' }
        ]
      },

      // ============================================
      // EXTERIOR WALLS - Beton
      // ============================================
      {
        name: 'Beton RC 5.0 - Geïsoleerd',
        description: 'Betonnen draagwand met buitenisolatie (ETICS), RC 5.0',
        category: 'exterior_wall',
        constructionSystem: 'beton',
        insulationLevel: 'rc_5.0',
        tags: ['beton', 'modern'],
        layers: [
          { position: 1, materialCategory: 'finishes', materialSearch: '%stuc%', thickness: 0.015, coverage: 1.0, layerFunction: 'finish' },
          { position: 2, materialCategory: 'insulation', materialSearch: '%EPS%', thickness: 0.200, coverage: 1.0, layerFunction: 'insulation' },
          { position: 3, materialCategory: 'concrete', materialSearch: '%beton%', thickness: 0.150, coverage: 1.0, layerFunction: 'structural' },
          { position: 4, materialCategory: 'finishes', materialSearch: '%gips%', thickness: 0.010, coverage: 1.0, layerFunction: 'finish' }
        ]
      },

      // ============================================
      // EXTERIOR WALLS - CLT
      // ============================================
      {
        name: 'CLT RC 5.0 - Houtvezelisolatie',
        description: 'CLT massief hout wand met houtvezelisolatie, RC 5.0',
        category: 'exterior_wall',
        constructionSystem: 'clt',
        insulationLevel: 'rc_5.0',
        tags: ['clt', 'biobased', 'circulair'],
        layers: [
          { position: 1, materialCategory: 'timber', materialSearch: '%hout%gevelbekleding%', thickness: 0.018, coverage: 1.0, layerFunction: 'finish' },
          { position: 2, materialCategory: 'insulation', materialSearch: '%houtvezel%', thickness: 0.200, coverage: 1.0, layerFunction: 'insulation' },
          { position: 3, materialCategory: 'timber', materialSearch: '%CLT%', thickness: 0.100, coverage: 1.0, layerFunction: 'structural' },
          { position: 4, materialCategory: 'finishes', materialSearch: '%gips%', thickness: 0.0125, coverage: 1.0, layerFunction: 'finish' }
        ]
      },

      // ============================================
      // ROOFS
      // ============================================
      {
        name: 'Hellend dak - Dakpannen RC 5.0',
        description: 'Hellend dak met dakpannen en mineraalwol isolatie, RC 5.0',
        category: 'roof',
        constructionSystem: 'houtskelet',
        insulationLevel: 'rc_5.0',
        tags: ['traditioneel', 'dakpannen'],
        layers: [
          { position: 1, materialCategory: 'roofing', materialSearch: '%dakpan%', thickness: 0.015, coverage: 1.0, layerFunction: 'weatherproofing' },
          { position: 2, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.018, coverage: 1.0, layerFunction: 'structural' },
          { position: 3, materialCategory: 'insulation', materialSearch: '%mineraalwol%', thickness: 0.200, coverage: 1.0, layerFunction: 'insulation' },
          { position: 4, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.018, coverage: 0.08, layerFunction: 'structural' }
        ]
      },
      {
        name: 'Plat dak - Bitumen RC 5.0',
        description: 'Plat dak met bitumen dakbedekking en EPS isolatie, RC 5.0',
        category: 'roof',
        insulationLevel: 'rc_5.0',
        tags: ['modern', 'bitumen', 'plat'],
        layers: [
          { position: 1, materialCategory: 'roofing', materialSearch: '%bitumen%', thickness: 0.005, coverage: 1.0, layerFunction: 'weatherproofing' },
          { position: 2, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.018, coverage: 1.0, layerFunction: 'structural' },
          { position: 3, materialCategory: 'insulation', materialSearch: '%EPS%', thickness: 0.200, coverage: 1.0, layerFunction: 'insulation' }
        ]
      },
      {
        name: 'Groendak - Extensief RC 5.0',
        description: 'Extensief groendak met sedum, EPDM en EPS isolatie, RC 5.0',
        category: 'roof',
        insulationLevel: 'rc_5.0',
        tags: ['duurzaam', 'groen', 'biodiversiteit'],
        layers: [
          { position: 1, materialCategory: 'other', materialSearch: '%groen%', thickness: 0.150, coverage: 1.0, layerFunction: 'finish' },
          { position: 2, materialCategory: 'roofing', materialSearch: '%EPDM%', thickness: 0.005, coverage: 1.0, layerFunction: 'weatherproofing' },
          { position: 3, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.018, coverage: 1.0, layerFunction: 'structural' },
          { position: 4, materialCategory: 'insulation', materialSearch: '%EPS%', thickness: 0.200, coverage: 1.0, layerFunction: 'insulation' }
        ]
      },

      // ============================================
      // FLOORS
      // ============================================
      {
        name: 'Begane grond - Kruipruimte RC 3.5',
        description: 'Houten begane grondvloer boven kruipruimte, RC 3.5 isolatie',
        category: 'floor',
        insulationLevel: 'rc_3.5',
        tags: ['hout', 'kruipruimte'],
        layers: [
          { position: 1, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.022, coverage: 1.0, layerFunction: 'structural' },
          { position: 2, materialCategory: 'insulation', materialSearch: '%mineraalwol%', thickness: 0.140, coverage: 1.0, layerFunction: 'insulation' }
        ]
      },
      {
        name: 'Begane grond - Betonplaat RC 3.5',
        description: 'Betonnen begane grondvloer op isolatie, RC 3.5',
        category: 'floor',
        insulationLevel: 'rc_3.5',
        tags: ['beton', 'modern'],
        layers: [
          { position: 1, materialCategory: 'concrete', materialSearch: '%beton%', thickness: 0.150, coverage: 1.0, layerFunction: 'structural' },
          { position: 2, materialCategory: 'insulation', materialSearch: '%EPS%', thickness: 0.140, coverage: 1.0, layerFunction: 'insulation' }
        ]
      },
      {
        name: 'Tussenvloer - Houten balkenvloer',
        description: 'Houten tussenvloer met OSB en mineraalwol geluidsisolatie',
        category: 'floor',
        tags: ['hout', 'tussenverdieping'],
        layers: [
          { position: 1, materialCategory: 'timber', materialSearch: '%OSB%', thickness: 0.022, coverage: 1.0, layerFunction: 'structural' },
          { position: 2, materialCategory: 'timber', materialSearch: '%hout%', thickness: 0.200, coverage: 0.10, layerFunction: 'structural' },
          { position: 3, materialCategory: 'insulation', materialSearch: '%mineraalwol%', thickness: 0.200, coverage: 0.90, layerFunction: 'insulation' }
        ]
      },

      // ============================================
      // WINDOWS
      // ============================================
      {
        name: 'Kozijnen - PVC HR+++',
        description: 'Kunststof kozijnen met triple glas HR+++',
        category: 'windows',
        tags: ['pvc', 'hr+++', 'onderhoudsarm'],
        layers: [
          { position: 1, materialCategory: 'glass', materialSearch: '%glas%', thickness: 0.040, coverage: 0.85, layerFunction: 'weatherproofing' },
          { position: 2, materialCategory: 'other', materialSearch: '%PVC%', thickness: 0.080, coverage: 0.15, layerFunction: 'structural' }
        ]
      },
      {
        name: 'Kozijnen - Hout HR+++',
        description: 'Houten kozijnen met triple glas HR+++',
        category: 'windows',
        tags: ['hout', 'hr+++', 'biobased'],
        layers: [
          { position: 1, materialCategory: 'glass', materialSearch: '%glas%', thickness: 0.040, coverage: 0.85, layerFunction: 'weatherproofing' },
          { position: 2, materialCategory: 'timber', materialSearch: '%hout%', thickness: 0.080, coverage: 0.15, layerFunction: 'structural' }
        ]
      },
      {
        name: 'Kozijnen - Aluminium HR+++',
        description: 'Aluminium kozijnen met triple glas HR+++',
        category: 'windows',
        tags: ['aluminium', 'hr+++', 'modern'],
        layers: [
          { position: 1, materialCategory: 'glass', materialSearch: '%glas%', thickness: 0.040, coverage: 0.85, layerFunction: 'weatherproofing' },
          { position: 2, materialCategory: 'metal', materialSearch: '%aluminium%', thickness: 0.080, coverage: 0.15, layerFunction: 'structural' }
        ]
      },

      // ============================================
      // FOUNDATION
      // ============================================
      {
        name: 'Fundering - Betonnen strokenfundering',
        description: 'Traditionele betonnen strokenfundering',
        category: 'foundation',
        tags: ['traditioneel', 'beton'],
        layers: [
          { position: 1, materialCategory: 'concrete', materialSearch: '%beton%', thickness: 0.300, coverage: 1.0, layerFunction: 'structural' }
        ]
      }
    ];

    console.log(`📦 Creating ${packages.length} package templates...\n`);

    let created = 0;
    let skipped = 0;

    for (const pkg of packages) {
      console.log(`  Processing: ${pkg.name}`);

      try {
        // Resolve material IDs for layers
        const resolvedLayers = [];

        for (const layer of pkg.layers) {
          // Find material
          const materialResult = await sql`
            SELECT id FROM lca_materials
            WHERE category = ${layer.materialCategory}
              AND (
                name_nl ILIKE ${layer.materialSearch}
                OR name_en ILIKE ${layer.materialSearch}
                OR name_de ILIKE ${layer.materialSearch}
              )
              AND dutch_availability = true
            ORDER BY quality_rating DESC, is_generic ASC
            LIMIT 1
          `;

          if (materialResult.length === 0) {
            console.log(`    ⚠️  Could not find material for: ${layer.materialSearch} in category ${layer.materialCategory}`);
            throw new Error(`Material not found: ${layer.materialSearch}`);
          }

          resolvedLayers.push({
            position: layer.position,
            material_id: materialResult[0].id,
            thickness: layer.thickness,
            coverage: layer.coverage,
            layer_function: layer.layerFunction || null
          });
        }

        // Calculate total thickness
        const totalThickness = resolvedLayers.reduce((sum, l) => sum + l.thickness, 0);

        // Create package
        const packageResult = await sql`
          INSERT INTO lca_packages (
            name, description, category,
            construction_system, insulation_level,
            total_thickness,
            is_template, is_public, user_id, tags
          ) VALUES (
            ${pkg.name},
            ${pkg.description},
            ${pkg.category},
            ${pkg.constructionSystem || null},
            ${pkg.insulationLevel || null},
            ${totalThickness},
            true,
            true,
            NULL,
            ${pkg.tags}
          )
          RETURNING id
        `;

        const packageId = packageResult[0].id;

        // Create layers
        for (const layer of resolvedLayers) {
          await sql`
            INSERT INTO lca_package_layers (
              package_id, position, material_id,
              thickness, coverage, layer_function
            ) VALUES (
              ${packageId},
              ${layer.position},
              ${layer.material_id},
              ${layer.thickness},
              ${layer.coverage},
              ${layer.layer_function}
            )
          `;
        }

        console.log(`    ✅ Created with ${resolvedLayers.length} layers`);
        created++;

      } catch (error) {
        console.log(`    ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        skipped++;
      }

      console.log('');
    }

    console.log('━'.repeat(50));
    console.log(`✅ Seeding complete!`);
    console.log(`   Created: ${created} packages`);
    console.log(`   Skipped: ${skipped} packages`);
    console.log('━'.repeat(50));

  } catch (error) {
    console.error('❌ Error seeding packages:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
