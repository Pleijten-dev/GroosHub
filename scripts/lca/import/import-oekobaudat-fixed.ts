// Fixed Ökobaudat import script that properly groups modules by material
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'csv-parse/sync';

// Load .env.local
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

import { getDbConnection } from '../../src/lib/db/connection';

// Helper functions
function parseGermanFloat(value: string): number {
  if (!value || value.trim() === '') return 0;
  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

function checkDutchRelevance(record: Record<string, string>): boolean {
  const region = record.Laenderkennung;
  const excludedRegions = ['US', 'USA', 'CN', 'CHN', 'JP', 'JPN', 'BR', 'BRA', 'IN', 'IND', 'AU', 'AUS'];

  if (region && excludedRegions.includes(region)) {
    return false;
  }

  return true;
}

function translateToNL(englishName: string): string {
  if (!englishName) return '';
  const translations: Record<string, string> = {
    'Concrete': 'Beton',
    'Timber': 'Hout',
    'Brick': 'Baksteen',
    'Insulation': 'Isolatie',
    'Glass': 'Glas',
    'Steel': 'Staal',
    'Aluminum': 'Aluminium'
  };

  let result = englishName;
  for (const [en, nl] of Object.entries(translations)) {
    result = result.replace(new RegExp(en, 'gi'), nl);
  }
  return result;
}

function mapCategory(oekobaudatCategory: string): string {
  if (!oekobaudatCategory) return 'other';

  const lower = oekobaudatCategory.toLowerCase();

  if (lower.includes('concrete') || lower.includes('beton')) return 'concrete';
  if (lower.includes('brick') || lower.includes('masonry')) return 'masonry';
  if (lower.includes('timber') || lower.includes('wood') || lower.includes('holz')) return 'timber';
  if (lower.includes('insulation') || lower.includes('isolier') || lower.includes('dämmung')) return 'insulation';
  if (lower.includes('steel') || lower.includes('stahl')) return 'metal';
  if (lower.includes('glass') || lower.includes('glas')) return 'glass';
  if (lower.includes('gypsum') || lower.includes('gips')) return 'finishes';

  return 'other';
}

function assessQuality(materialData: any): number {
  let quality = 3; // Base quality

  if (materialData.type === 'specific') quality += 1;
  if (materialData.epd_validity) quality += 1;
  if (materialData.hasAllModules) quality += 1;

  return Math.min(5, quality);
}

async function importOekobaudat() {
  console.log('🔄 Starting Ökobaudat import (FIXED VERSION)...\n');

  const sql = getDbConnection();
  const csvPath = resolve(process.cwd(), 'data/oekobaudat_2023_II_a1-a3.csv');

  if (!existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  console.log('📂 Reading CSV file...');
  const csvContent = readFileSync(csvPath, 'utf-8');

  console.log('🔍 Parsing CSV...');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    relax_quotes: true,
    relax_column_count: true,
    escape: '"',
    quote: '"'
  });

  console.log(`✓ Parsed ${records.length} rows\n`);

  // GROUP BY UUID - This is the KEY FIX!
  console.log('🔄 Grouping materials by UUID...');
  const materialsByUUID = new Map<string, any>();

  for (const record of records) {
    const uuid = record.UUID;
    if (!uuid) continue;

    // Initialize material if not seen before
    if (!materialsByUUID.has(uuid)) {
      materialsByUUID.set(uuid, {
        uuid,
        version: record.Version,
        name_de: record['Name (de)'],
        name_en: record['Name (en)'],
        category_original: record['Kategorie (en)'],
        type: record.Typ,
        density: parseGermanFloat(record['Rohdichte (kg/m3)']),
        bulk_density: parseGermanFloat(record['Schuettdichte (kg/m3)']),
        reference_thickness: parseGermanFloat(record['Schichtdicke (m)']),
        declared_unit: record['Bezugseinheit'] || '1 kg',
        conversion_to_kg: parseGermanFloat(record['Umrechungsfaktor auf 1kg']) || 1,
        biogenic_carbon: parseGermanFloat(record['biogener Kohlenstoffgehalt in kg']),
        epd_url: record.URL,
        epd_owner: record['Declaration owner'],
        epd_validity: record['Gueltig bis'],
        region: record.Laenderkennung,

        // Impact values per module (populated below)
        modules: {}
      });
    }

    const material = materialsByUUID.get(uuid);
    const module = record.Modul;
    const gwp = parseGermanFloat(record.GWP);

    // Store GWP value for this module
    if (module && gwp !== null) {
      material.modules[module] = gwp;
    }
  }

  console.log(`✓ Found ${materialsByUUID.size} unique materials\n`);

  // Import to database
  console.log('💾 Importing to database...\n');

  let imported = 0;
  let skipped = 0;
  let skippedNoA1A3 = 0;
  let skippedNotDutch = 0;
  let errors = 0;

  for (const [uuid, material] of materialsByUUID) {
    try {
      // Must have A1-A3 value
      if (!material.modules['A1-A3'] || material.modules['A1-A3'] === 0) {
        skipped++;
        skippedNoA1A3++;
        continue;
      }

      // Check Dutch relevance
      if (!checkDutchRelevance({ Laenderkennung: material.region })) {
        skipped++;
        skippedNotDutch++;
        continue;
      }

      // Check if has C modules (for quality rating)
      const hasAllModules = !!(
        material.modules['A1-A3'] &&
        material.modules['C1'] &&
        material.modules['C2'] &&
        material.modules['C3'] &&
        material.modules['C4']
      );

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
          ${material.uuid},
          ${material.version},
          ${material.name_de},
          ${material.name_en || null},
          ${translateToNL(material.name_en || material.name_de)},
          ${mapCategory(material.category_original)},
          ${material.category_original?.substring(0, 100) || null},
          ${material.type === 'generic' ? 'generic' : 'specific'},
          ${material.density || null},
          ${material.bulk_density || null},
          ${material.reference_thickness || null},
          ${material.declared_unit},
          ${material.conversion_to_kg},
          ${material.modules['A1-A3']},
          ${material.modules['A4'] || 0},
          ${material.modules['A5'] || 0},
          ${material.modules['C1'] || 0},
          ${material.modules['C2'] || 0},
          ${material.modules['C3'] || 0},
          ${material.modules['C4'] || 0},
          ${material.modules['D'] || 0},
          ${material.biogenic_carbon || null},
          ${material.epd_url || null},
          ${material.epd_owner?.substring(0, 100) || null},
          ${material.epd_validity ? new Date(material.epd_validity).toISOString() : null},
          ${assessQuality({ ...material, hasAllModules })},
          ${true},
          ${material.type === 'generic'}
        )
      `;

      imported++;

      if (imported % 100 === 0) {
        console.log(`✅ Imported ${imported} materials...`);
      }

      // Show first material with C values as verification
      if (imported === 1 && hasAllModules) {
        console.log('\n📋 Sample material with C values:');
        console.log(`  Name: ${material.name_en || material.name_de}`);
        console.log(`  A1-A3: ${material.modules['A1-A3']}`);
        console.log(`  C1: ${material.modules['C1']}, C2: ${material.modules['C2']}, C3: ${material.modules['C3']}, C4: ${material.modules['C4']}`);
        console.log('');
      }

    } catch (error: unknown) {
      errors++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error importing ${uuid}:`, errorMessage);
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`✅ Imported: ${imported}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`   - No A1-A3 value: ${skippedNoA1A3}`);
  console.log(`   - Not Dutch-relevant: ${skippedNotDutch}`);
  console.log(`❌ Errors: ${errors}`);

  // Show C value statistics
  const cStats = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(gwp_c1) FILTER (WHERE gwp_c1 > 0) as has_c1,
      COUNT(gwp_c2) FILTER (WHERE gwp_c2 > 0) as has_c2,
      COUNT(gwp_c3) FILTER (WHERE gwp_c3 > 0) as has_c3,
      COUNT(gwp_c4) FILTER (WHERE gwp_c4 > 0) as has_c4,
      AVG(gwp_c1) as avg_c1,
      AVG(gwp_c2) as avg_c2,
      AVG(gwp_c3) as avg_c3,
      AVG(gwp_c4) as avg_c4
    FROM lca_materials
    WHERE gwp_a1_a3 > 0
  `;

  console.log('\n📊 C Phase Statistics:');
  console.table(cStats);

  process.exit(0);
}

importOekobaudat().catch(error => {
  console.error('\n❌ Import failed:', error);
  process.exit(1);
});
