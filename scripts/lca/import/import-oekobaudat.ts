// ============================================
// ÖKOBAUDAT DATA IMPORT SCRIPT
// ============================================

// Load environment variables from .env.local manually
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local file if it exists
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    if (line.startsWith('#') || !line.trim()) return;
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      const cleanValue = value.replace(/^["']|["']$/g, '');
      process.env[key.trim()] = cleanValue;
    }
  });
  console.log('✓ Loaded environment variables from .env.local\n');
}

import { getDbConnection } from '../../../src/lib/db/connection';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

/**
 * Import Ökobaudat EPD data from CSV export
 *
 * Prerequisites:
 * 1. Download Ökobaudat dataset from: https://www.oekobaudat.de
 * 2. Export as CSV and save to: data/lca/oekobaudat-export.csv
 * 3. Ensure CSV has headers matching the expected structure
 *
 * Usage:
 * npx tsx scripts/lca/import/import-oekobaudat.ts
 */

async function importOekobaudat() {
  console.log('🔄 Starting Ökobaudat data import...');

  const csvPath = path.join(process.cwd(), 'data', 'lca', 'oekobaudat-export.csv');

  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found at:', csvPath);
    console.log('📝 Please download Ökobaudat data and place it in data/lca/oekobaudat-export.csv');
    console.log('');
    console.log('Download from: https://www.oekobaudat.de');
    console.log('Export as CSV with all indicators');
    process.exit(1);
  }

  const sql = getDbConnection();

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',           // Semicolon-separated
    relax_quotes: true,       // Allow quotes inside fields
    relax_column_count: true, // Allow inconsistent column counts
    escape: '"',              // Escape character for quotes
    quote: '"'                // Quote character
  }) as Record<string, string>[];

  console.log(`📊 Found ${records.length} records in CSV`);

  // Debug: Show sample of module values
  const moduleSample = records.slice(0, 20).map(r => r.Modul).filter(Boolean);
  console.log(`📋 Sample module values: ${[...new Set(moduleSample)].join(', ')}`);

  // Debug: Show sample A1-A3 rows with GWP values
  const a1a3Rows = records.filter(r => r.Modul === 'A1-A3').slice(0, 5);
  console.log(`\n📊 Sample A1-A3 rows with GWP values:`);
  a1a3Rows.forEach(r => {
    console.log(`  - ${r['Name (en)'] || r['Name (de)']}: GWP=${r.GWP}, Category=${r['Kategorie (en)']}, Country=${r.Laenderkennung}`);
  });
  console.log('');

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let skippedNoGwp = 0;
  let skippedNotDutch = 0;

  for (const record of records) {
    try {
      // Only process A1-A3 module rows (each material has multiple rows)
      if (record.Modul !== 'A1-A3') {
        skipped++;
        continue;
      }

      // Filter: Only Dutch-relevant materials
      const isDutchRelevant = checkDutchRelevance(record);
      if (!isDutchRelevant) {
        skipped++;
        skippedNotDutch++;
        continue;
      }

      // Parse and transform
      const gwpA1A3 = extractModuleValue(record, 'A1-A3', 'GWP');

      // Skip materials without basic GWP data
      if (gwpA1A3 === 0 || isNaN(gwpA1A3)) {
        skipped++;
        skippedNoGwp++;
        // Debug: Show first few skipped materials
        if (skippedNoGwp <= 3) {
          console.log(`⚠️  Skipped (no GWP): ${record['Name (en)'] || record['Name (de)']} - GWP value: "${record.GWP}"`);
        }
        continue;
      }

      await sql`
        INSERT INTO lca_materials (
          oekobaudat_uuid,
          oekobaudat_version,
          name_de,
          name_en,
          name_nl,
          category,
          subcategory,
          material_type,
          density,
          bulk_density,
          reference_thickness,
          declared_unit,
          conversion_to_kg,
          gwp_a1_a3,
          gwp_a4,
          gwp_a5,
          gwp_c1,
          gwp_c2,
          gwp_c3,
          gwp_c4,
          gwp_d,
          biogenic_carbon,
          epd_url,
          epd_owner,
          epd_validity,
          quality_rating,
          dutch_availability,
          is_generic
        ) VALUES (
          ${record.UUID || null},
          ${record.Version || null},
          ${record['Name (de)']},
          ${record['Name (en)'] || null},
          ${translateToNL(record['Name (en)'])},
          ${mapCategory(record['Kategorie (en)'])},
          ${record['Kategorie (en)'] || null},
          ${record.Typ === 'generic' ? 'generic' : 'specific'},
          ${parseFloat(record['Rohdichte (kg/m3)']) || null},
          ${parseFloat(record['Schuettdichte (kg/m3)']) || null},
          ${parseFloat(record['Schichtdicke (m)']) || null},
          ${record['Bezugseinheit'] || '1 kg'},
          ${parseFloat(record['Umrechungsfaktor auf 1kg']) || 1},
          ${gwpA1A3},
          ${extractModuleValue(record, 'A4', 'GWP')},
          ${extractModuleValue(record, 'A5', 'GWP')},
          ${extractModuleValue(record, 'C1', 'GWP')},
          ${extractModuleValue(record, 'C2', 'GWP')},
          ${extractModuleValue(record, 'C3', 'GWP')},
          ${extractModuleValue(record, 'C4', 'GWP')},
          ${extractModuleValue(record, 'D', 'GWP')},
          ${parseFloat(record['biogener Kohlenstoffgehalt in kg']) || null},
          ${record.URL || null},
          ${record['Declaration owner'] || null},
          ${record['Gueltig bis'] ? new Date(record['Gueltig bis']).toISOString() : null},
          ${assessQuality(record)},
          ${true},
          ${record.Typ === 'generic'}
        )
      `;

      imported++;

      if (imported % 100 === 0) {
        console.log(`✅ Imported ${imported} materials...`);
      }
    } catch (error: unknown) {
      errors++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error importing record ${record.UUID}:`, errorMessage);
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`   - Not A1-A3 module: ${skipped - skippedNotDutch - skippedNoGwp}`);
  console.log(`   - Not Dutch-relevant: ${skippedNotDutch}`);
  console.log(`   - No GWP data: ${skippedNoGwp}`);
  console.log(`❌ Errors: ${errors}`);
}

function extractModuleValue(record: Record<string, string>, module: string, indicator: string): number {
  // The CSV has a "Modul" column that indicates which lifecycle phase this row represents
  // Each material (UUID) appears multiple times - once for each module

  // Check if this row is for the requested module
  if (record.Modul === module && record[indicator]) {
    const value = parseFloat(record[indicator]);
    return isNaN(value) ? 0 : value;
  }

  // For A2 module, there are specific columns like "GWPtotal (A2)"
  const a2ColumnName = `${indicator}total (A2)`;
  if (module === 'A2' && record[a2ColumnName]) {
    const value = parseFloat(record[a2ColumnName]);
    return isNaN(value) ? 0 : value;
  }

  return 0;
}

function checkDutchRelevance(record: Record<string, string>): boolean {
  // Filter logic for NL market
  const category = record['Kategorie (en)'];

  // Exclude categories not used in NL
  const excludedCategories = [
    'Tropical timber', // Not commonly used in NL
    // Add more exclusions as needed
  ];

  if (excludedCategories.some(cat => category?.includes(cat))) {
    return false;
  }

  // Include if within European context
  const region = record['Laenderkennung'];
  if (region && !['DE', 'NL', 'EU', 'EU-27', ''].includes(region)) {
    return false;
  }

  return true;
}

function mapCategory(oekobaudatCategory: string): string {
  // Map Ökobaudat categories to simplified categories
  const mapping: Record<string, string> = {
    'Mineral insulating materials': 'insulation',
    'Organic insulating materials': 'insulation',
    'Synthetic insulating materials': 'insulation',
    'Insulation materials': 'insulation',
    'Concrete': 'concrete',
    'Timber': 'timber',
    'Wood products': 'timber',
    'Bricks': 'masonry',
    'Masonry': 'masonry',
    'Glass': 'glass',
    'Metals': 'metal',
    'Steel': 'metal',
    'Aluminium': 'metal',
    'Roofing': 'roofing',
    'Finishes': 'finishes',
    'Paints and coatings': 'finishes',
    // Add more mappings as needed
  };

  // Try exact match first
  if (mapping[oekobaudatCategory]) {
    return mapping[oekobaudatCategory];
  }

  // Try partial match
  for (const [key, value] of Object.entries(mapping)) {
    if (oekobaudatCategory?.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return 'other';
}

function translateToNL(englishName: string): string {
  // TODO: Implement translation logic
  // For MVP, we can use the English name
  // Later, add a translation mapping or API
  return englishName;
}

function assessQuality(record: Record<string, string>): number {
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
  .catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 Import failed:', errorMessage);
    process.exit(1);
  });
