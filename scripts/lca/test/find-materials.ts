// Find suitable materials for test
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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
}

import { getDbConnection } from '../../../src/lib/db/connection';

async function findMaterials() {
  const sql = getDbConnection();

  console.log('\n🔍 Finding suitable materials for test...\n');

  // Find mineral wool insulation
  console.log('1. Mineral Wool Insulation:');
  const mineralWool = await sql`
    SELECT id, name_en, name_de, gwp_a1_a3, gwp_c1, gwp_c2, gwp_c3, gwp_c4, density, declared_unit
    FROM lca_materials
    WHERE category = 'insulation'
      AND (name_en ILIKE '%mineral wool%' OR name_de ILIKE '%mineralwolle%')
      AND density > 0
    ORDER BY gwp_a1_a3
    LIMIT 3
  `;
  mineralWool.forEach((m: any) => {
    console.log(`  ${m.id}`);
    console.log(`    Name: ${m.name_en || m.name_de}`);
    console.log(`    A1-A3: ${m.gwp_a1_a3}, C: ${m.gwp_c1}+${m.gwp_c2}+${m.gwp_c3}+${m.gwp_c4}, Unit: ${m.declared_unit}`);
  });

  // Find timber/wood materials
  console.log('\n2. Timber/Wood Materials:');
  const timber = await sql`
    SELECT id, name_en, name_de, gwp_a1_a3, gwp_c1, gwp_c2, gwp_c3, gwp_c4, density, declared_unit
    FROM lca_materials
    WHERE category = 'timber'
      AND density > 0
    ORDER BY gwp_a1_a3
    LIMIT 3
  `;
  timber.forEach((m: any) => {
    console.log(`  ${m.id}`);
    console.log(`    Name: ${m.name_en || m.name_de}`);
    console.log(`    A1-A3: ${m.gwp_a1_a3}, C: ${m.gwp_c1}+${m.gwp_c2}+${m.gwp_c3}+${m.gwp_c4}, Unit: ${m.declared_unit}`);
  });

  // Find gypsum/plaster
  console.log('\n3. Gypsum/Plasterboard:');
  const gypsum = await sql`
    SELECT id, name_en, name_de, gwp_a1_a3, gwp_c1, gwp_c2, gwp_c3, gwp_c4, density, declared_unit
    FROM lca_materials
    WHERE (category = 'finishes' OR category = 'other')
      AND (name_en ILIKE '%gypsum%' OR name_en ILIKE '%plaster%' OR name_de ILIKE '%gips%')
      AND density > 0
    ORDER BY gwp_a1_a3
    LIMIT 3
  `;
  gypsum.forEach((m: any) => {
    console.log(`  ${m.id}`);
    console.log(`    Name: ${m.name_en || m.name_de}`);
    console.log(`    A1-A3: ${m.gwp_a1_a3}, C: ${m.gwp_c1}+${m.gwp_c2}+${m.gwp_c3}+${m.gwp_c4}, Unit: ${m.declared_unit}`);
  });

  process.exit(0);
}

findMaterials().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
