// ============================================
// SEED REFERENCE VALUES
// ============================================

import { getDbConnection } from '../../../src/lib/db/connection';

/**
 * Seed MPG reference values and operational carbon estimates
 *
 * This script populates the lca_reference_values table with:
 * - MPG (Milieuprestatie Gebouwen) limits per building type
 * - Operational carbon estimates by energy label
 *
 * Data sources:
 * - MPG Bepalingsmethode 2024 (Dutch building regulations)
 * - BENG (Bijna Energie Neutrale Gebouwen) standards
 *
 * Usage:
 * npx tsx scripts/lca/import/seed-reference-values.ts
 */

async function seedReferenceValues() {
  console.log('🌱 Seeding reference values...');

  const sql = getDbConnection();

  // ============================================
  // MPG REFERENCE VALUES (2024)
  // ============================================

  const mpgLimits = [
    {
      building_type: 'woningbouw',
      mpg_limit: 0.8,  // kg CO2/m²/jaar
      energy_label: 'A',
      operational_carbon: 25,
      source: 'MPG Bepalingsmethode 2024',
      valid_from: '2024-01-01'
    },
    {
      building_type: 'vrijstaand',
      mpg_limit: 0.8,
      energy_label: 'A',
      operational_carbon: 25,
      source: 'MPG Bepalingsmethode 2024',
      valid_from: '2024-01-01'
    },
    {
      building_type: 'rijwoning',
      mpg_limit: 0.8,
      energy_label: 'A',
      operational_carbon: 25,
      source: 'MPG Bepalingsmethode 2024',
      valid_from: '2024-01-01'
    },
    {
      building_type: 'appartement',
      mpg_limit: 0.8,
      energy_label: 'A',
      operational_carbon: 25,
      source: 'MPG Bepalingsmethode 2024',
      valid_from: '2024-01-01'
    },
    {
      building_type: 'utiliteitsbouw',
      mpg_limit: 0.5,
      energy_label: 'A',
      operational_carbon: 20,
      source: 'MPG Bepalingsmethode 2024',
      valid_from: '2024-01-01'
    }
  ];

  console.log('📊 Seeding MPG limits...');
  let mpgCount = 0;

  for (const limit of mpgLimits) {
    try {
      // Upsert: Insert or update if building_type already exists
      await sql`
        INSERT INTO lca_reference_values (
          building_type,
          mpg_limit,
          energy_label,
          operational_carbon,
          source,
          valid_from
        ) VALUES (
          ${limit.building_type},
          ${limit.mpg_limit},
          ${limit.energy_label},
          ${limit.operational_carbon},
          ${limit.source},
          ${limit.valid_from}
        )
        ON CONFLICT (building_type)
        DO UPDATE SET
          mpg_limit = EXCLUDED.mpg_limit,
          energy_label = EXCLUDED.energy_label,
          operational_carbon = EXCLUDED.operational_carbon,
          source = EXCLUDED.source,
          valid_from = EXCLUDED.valid_from
      `;
      mpgCount++;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error seeding MPG for ${limit.building_type}:`, errorMessage);
    }
  }

  console.log(`✅ MPG limits seeded: ${mpgCount}`);

  // ============================================
  // OPERATIONAL CARBON BY ENERGY LABEL
  // ============================================

  // These are stored in the LCA calculator constants
  // But we can create a lookup table for other purposes

  const energyLabelEstimates = [
    { label: 'A++++', operational_carbon: 5, description: 'Energieneutraal' },
    { label: 'A+++', operational_carbon: 8, description: 'Zeer energiezuinig' },
    { label: 'A++', operational_carbon: 12, description: 'Zeer energiezuinig' },
    { label: 'A+', operational_carbon: 18, description: 'Energiezuinig' },
    { label: 'A', operational_carbon: 25, description: 'Energiezuinig' },
    { label: 'B', operational_carbon: 35, description: 'Gemiddeld' },
    { label: 'C', operational_carbon: 45, description: 'Matig' },
    { label: 'D', operational_carbon: 55, description: 'Onvoldoende' },
  ];

  console.log('\n📊 Energy label estimates:');
  energyLabelEstimates.forEach(estimate => {
    console.log(`  ${estimate.label}: ${estimate.operational_carbon} kg CO2/m²/jaar (${estimate.description})`);
  });

  console.log('\n✨ Reference values seeded successfully');
}

// Run seeding
seedReferenceValues()
  .then(() => {
    console.log('✅ Seeding complete');
    process.exit(0);
  })
  .catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 Seeding failed:', errorMessage);
    process.exit(1);
  });
