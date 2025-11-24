// ============================================
// ÖKOBAUDAT DATA IMPORT SCRIPT
// ============================================

import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Import Ökobaudat EPD data from CSV export
 *
 * Prerequisites:
 * 1. Download Ökobaudat dataset from: https://www.oekobaudat.de
 * 2. Export as CSV and save to: data/lca/oekobaudat-export.csv
 * 3. Ensure CSV has headers matching the expected structure
 *
 * Usage:
 * npx ts-node scripts/lca/import/import-oekobaudat.ts
 */

async function importOekobaudat() {
  console.log('🔄 Starting Ökobaudat data import...');

  const csvPath = path.join(process.cwd(), 'data', 'lca', 'oekobaudat-export.csv');

  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found at:', csvPath);
    console.log('📝 Please download Ökobaudat data and place it in data/lca/oekobaudat-export.csv');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';'
  });

  console.log(`📊 Found ${records.length} records in CSV`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of records) {
    try {
      // Filter: Only Dutch-relevant materials
      const isDutchRelevant = checkDutchRelevance(record);
      if (!isDutchRelevant) {
        skipped++;
        continue;
      }

      // Parse and transform
      const material = {
        oekobaudat_uuid: record.UUID,
        oekobaudat_version: record.Version,
        name_de: record['Name (de)'],
        name_en: record['Name (en)'],
        name_nl: translateToNL(record['Name (en)']), // TODO: Add translation logic

        category: mapCategory(record['Kategorie (en)']),
        subcategory: record['Kategorie (en)'],

        density: parseFloat(record['Rohdichte (kg/m3)']) || null,
        bulk_density: parseFloat(record['Schuettdichte (kg/m3)']) || null,
        reference_thickness: parseFloat(record['Schichtdicke (m)']) || null,

        declared_unit: record['Bezugseinheit'],
        conversion_to_kg: parseFloat(record['Umrechungsfaktor auf 1kg']) || 1,

        // Extract module-specific impacts
        gwp_a1_a3: extractModuleValue(record, 'A1-A3', 'GWP'),
        gwp_a4: extractModuleValue(record, 'A4', 'GWP'),
        gwp_a5: extractModuleValue(record, 'A5', 'GWP'),
        gwp_c1: extractModuleValue(record, 'C1', 'GWP'),
        gwp_c2: extractModuleValue(record, 'C2', 'GWP'),
        gwp_c3: extractModuleValue(record, 'C3', 'GWP'),
        gwp_c4: extractModuleValue(record, 'C4', 'GWP'),
        gwp_d: extractModuleValue(record, 'D', 'GWP'),

        biogenic_carbon: parseFloat(record['biogener Kohlenstoffgehalt in kg']) || null,

        epd_url: record.URL,
        epd_owner: record['Declaration owner'],
        epd_validity: record['Gueltig bis'] ? new Date(record['Gueltig bis']) : null,

        quality_rating: assessQuality(record),
        dutch_availability: true,
        is_generic: record.Typ === 'generic',
      };

      await prisma.material.create({ data: material });
      imported++;

      if (imported % 100 === 0) {
        console.log(`✅ Imported ${imported} materials...`);
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error importing record ${record.UUID}:`, error.message);
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
}

function extractModuleValue(record: any, module: string, indicator: string): number {
  // TODO: Implement based on actual Ökobaudat CSV structure
  // The structure varies depending on the export format
  const moduleName = record.Modul;
  if (moduleName === module) {
    return parseFloat(record[indicator]) || 0;
  }
  return 0;
}

function checkDutchRelevance(record: any): boolean {
  // Filter logic for NL market
  const category = record['Kategorie (en)'];

  // Exclude categories not used in NL
  const excludedCategories = [
    'Tropical timber', // Not commonly used in NL
    // Add more exclusions
  ];

  if (excludedCategories.some(cat => category?.includes(cat))) {
    return false;
  }

  // Include if within European context
  const region = record['Laenderkennung'];
  if (region && !['DE', 'NL', 'EU', 'EU-27'].includes(region)) {
    return false;
  }

  return true;
}

function mapCategory(oekobaudatCategory: string): string {
  // Map Ökobaudat categories to simplified categories
  const mapping: Record<string, string> = {
    'Mineral insulating materials': 'insulation',
    'Organic insulating materials': 'insulation',
    'Concrete': 'concrete',
    'Timber': 'timber',
    'Bricks': 'masonry',
    'Glass': 'glass',
    'Metals': 'metal',
    // TODO: Add complete mapping
  };

  return mapping[oekobaudatCategory] || 'other';
}

function translateToNL(englishName: string): string {
  // TODO: Implement translation logic
  // For now, return English name
  return englishName;
}

function assessQuality(record: any): number {
  // Rate EPD quality 1-5
  let score = 3; // Default

  if (record.Konformitaet === 'verified') score += 1;
  if (record.Typ === 'specific') score += 1;
  if (!record['Gueltig bis'] || new Date(record['Gueltig bis']) < new Date()) score -= 2;

  return Math.max(1, Math.min(5, score));
}

// Run import
importOekobaudat()
  .then(() => {
    console.log('✨ Import complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
