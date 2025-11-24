// ============================================
// NMD SERVICE LIFE DATA IMPORT SCRIPT
// ============================================

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

/**
 * Import NMD (Nationale Milieudatabase) service life data
 *
 * Prerequisites:
 * 1. Register at: https://www.nmd.nl
 * 2. Download Reference Service Life data (Excel format)
 * 3. Save to: data/lca/nmd-service-lives.xlsx
 *
 * If NMD data is not available, this script will seed default lifespans
 * based on ISO 15686 and SBK (Stichting Bouwkwaliteit) estimates
 *
 * Usage:
 * npx ts-node scripts/lca/import/import-nmd-lifespans.ts
 */

async function importNMDLifespans() {
  console.log('🔄 Starting NMD service life data import...');

  const xlsxPath = path.join(process.cwd(), 'data', 'lca', 'nmd-service-lives.xlsx');

  if (!fs.existsSync(xlsxPath)) {
    console.log('⚠️  NMD data not found, using default lifespans...');
    await seedDefaultLifespans();
    return;
  }

  // Parse NMD Excel file
  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`📊 Found ${data.length} records in NMD file`);

  let imported = 0;

  for (const row of data as any[]) {
    try {
      await prisma.serviceLife.create({
        data: {
          category: mapNMDCategory(row['Material Category']),
          subcategory: row['Subcategory'],
          material_name: row['Material Name'],
          reference_service_life: row['RSL (years)'],
          min_lifespan: row['Min RSL'],
          max_lifespan: row['Max RSL'],
          source: 'NMD',
          confidence_level: row['Confidence'] || 'medium',
          region: 'NL',
          notes: row['Notes']
        }
      });
      imported++;
    } catch (error) {
      console.error(`❌ Error importing ${row['Material Name']}:`, error.message);
    }
  }

  console.log(`✅ NMD lifespans imported: ${imported}`);
}

function mapNMDCategory(nmdCategory: string): string {
  // TODO: Map NMD categories to our category system
  return nmdCategory?.toLowerCase() || 'other';
}

// If NMD data not available, seed with defaults
async function seedDefaultLifespans() {
  console.log('🌱 Seeding default service lifespans...');

  const defaults = [
    // Structure
    { category: 'concrete', subcategory: 'structure', material_name: 'Concrete structure', rsl: 100, source: 'ISO15686', confidence: 'high' },
    { category: 'timber', subcategory: 'structure', material_name: 'Timber frame structure', rsl: 75, source: 'ISO15686', confidence: 'high' },
    { category: 'masonry', subcategory: 'structure', material_name: 'Masonry structure', rsl: 100, source: 'ISO15686', confidence: 'high' },
    { category: 'metal', subcategory: 'structure', material_name: 'Steel structure', rsl: 75, source: 'ISO15686', confidence: 'high' },

    // Insulation
    { category: 'insulation', subcategory: 'mineral_wool', material_name: 'Mineral wool insulation', rsl: 75, source: 'expert_estimate', confidence: 'medium' },
    { category: 'insulation', subcategory: 'eps', material_name: 'EPS/XPS insulation', rsl: 50, source: 'expert_estimate', confidence: 'medium' },
    { category: 'insulation', subcategory: 'pir', material_name: 'PIR/PUR insulation', rsl: 50, source: 'expert_estimate', confidence: 'medium' },
    { category: 'insulation', subcategory: 'wood_fiber', material_name: 'Wood fiber insulation', rsl: 60, source: 'expert_estimate', confidence: 'medium' },

    // Facade
    { category: 'facade', subcategory: 'timber_cladding', material_name: 'Timber facade cladding', rsl: 30, source: 'SBK', confidence: 'high' },
    { category: 'facade', subcategory: 'fiber_cement', material_name: 'Fiber cement boards', rsl: 40, source: 'SBK', confidence: 'high' },
    { category: 'facade', subcategory: 'brick', material_name: 'Brick facade', rsl: 100, source: 'SBK', confidence: 'high' },
    { category: 'facade', subcategory: 'render', material_name: 'Exterior render/plaster', rsl: 25, source: 'SBK', confidence: 'medium' },

    // Roof
    { category: 'roof', subcategory: 'tiles', material_name: 'Clay roof tiles', rsl: 50, source: 'SBK', confidence: 'high' },
    { category: 'roof', subcategory: 'concrete_tiles', material_name: 'Concrete roof tiles', rsl: 40, source: 'SBK', confidence: 'high' },
    { category: 'roof', subcategory: 'bitumen', material_name: 'Bitumen roofing', rsl: 30, source: 'SBK', confidence: 'high' },
    { category: 'roof', subcategory: 'epdm', material_name: 'EPDM roofing membrane', rsl: 35, source: 'manufacturer_avg', confidence: 'medium' },

    // Windows & Doors
    { category: 'windows', subcategory: 'frame', material_name: 'Window frames (any)', rsl: 30, source: 'SBK', confidence: 'high' },
    { category: 'windows', subcategory: 'glazing', material_name: 'Double/triple glazing', rsl: 30, source: 'SBK', confidence: 'high' },
    { category: 'doors', subcategory: 'exterior', material_name: 'Exterior doors', rsl: 30, source: 'SBK', confidence: 'high' },
    { category: 'doors', subcategory: 'interior', material_name: 'Interior doors', rsl: 40, source: 'SBK', confidence: 'medium' },

    // HVAC
    { category: 'hvac', subcategory: 'heat_pump', material_name: 'Air-water heat pump', rsl: 20, source: 'manufacturer_avg', confidence: 'high' },
    { category: 'hvac', subcategory: 'boiler', material_name: 'Gas boiler', rsl: 15, source: 'manufacturer_avg', confidence: 'high' },
    { category: 'hvac', subcategory: 'ventilation', material_name: 'Mechanical ventilation system', rsl: 20, source: 'manufacturer_avg', confidence: 'high' },
    { category: 'hvac', subcategory: 'solar_panels', material_name: 'PV solar panels', rsl: 30, source: 'manufacturer_avg', confidence: 'high' },

    // Finishes
    { category: 'finishes', subcategory: 'paint_exterior', material_name: 'Exterior paint', rsl: 10, source: 'SBK', confidence: 'high' },
    { category: 'finishes', subcategory: 'paint_interior', material_name: 'Interior paint', rsl: 15, source: 'SBK', confidence: 'medium' },
    { category: 'finishes', subcategory: 'flooring_timber', material_name: 'Timber flooring', rsl: 50, source: 'SBK', confidence: 'high' },
    { category: 'finishes', subcategory: 'flooring_tiles', material_name: 'Ceramic tiles', rsl: 50, source: 'SBK', confidence: 'high' },
    { category: 'finishes', subcategory: 'carpet', material_name: 'Carpet', rsl: 10, source: 'SBK', confidence: 'high' },
  ];

  let imported = 0;

  for (const item of defaults) {
    try {
      await prisma.serviceLife.create({
        data: {
          category: item.category,
          subcategory: item.subcategory,
          material_name: item.material_name,
          reference_service_life: item.rsl,
          source: item.source,
          confidence_level: item.confidence,
          region: 'NL'
        }
      });
      imported++;
    } catch (error) {
      console.error(`❌ Error seeding ${item.material_name}:`, error.message);
    }
  }

  console.log(`✅ Default lifespans seeded: ${imported}`);
}

// Run import
importNMDLifespans()
  .then(() => {
    console.log('✨ Import complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
