// Query materials for test data
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local file
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

async function queryMaterials() {
  const sql = getDbConnection();

  // Find concrete materials
  console.log('\n=== CONCRETE MATERIALS ===');
  const concrete = await sql`
    SELECT id, name_en, name_de, gwp_a1_a3, density
    FROM lca_materials
    WHERE category = 'concrete'
    AND gwp_a1_a3 > 0
    ORDER BY gwp_a1_a3
    LIMIT 5
  `;
  concrete.forEach(m => {
    console.log(`ID: ${m.id}`);
    console.log(`  Name: ${m.name_en || m.name_de}`);
    console.log(`  GWP: ${m.gwp_a1_a3}, Density: ${m.density}`);
    console.log('');
  });

  // Find timber materials
  console.log('\n=== TIMBER MATERIALS ===');
  const timber = await sql`
    SELECT id, name_en, name_de, gwp_a1_a3, density
    FROM lca_materials
    WHERE category = 'timber'
    AND gwp_a1_a3 > 0
    ORDER BY gwp_a1_a3
    LIMIT 10
  `;
  timber.forEach(m => {
    console.log(`ID: ${m.id}`);
    console.log(`  Name: ${m.name_en || m.name_de}`);
    console.log(`  GWP: ${m.gwp_a1_a3}, Density: ${m.density}`);
    console.log('');
  });

  // Find insulation materials (polystyrene/EPS for floor)
  console.log('\n=== FLOOR INSULATION (Polystyrene/EPS) ===');
  const insulation = await sql`
    SELECT id, name_en, name_de, gwp_a1_a3, density
    FROM lca_materials
    WHERE category = 'insulation'
    AND (name_en ILIKE '%polystyrene%' OR name_en ILIKE '%EPS%' OR name_de ILIKE '%Polystyrol%')
    AND gwp_a1_a3 > 0
    ORDER BY gwp_a1_a3
    LIMIT 5
  `;
  insulation.forEach(m => {
    console.log(`ID: ${m.id}`);
    console.log(`  Name: ${m.name_en || m.name_de}`);
    console.log(`  GWP: ${m.gwp_a1_a3}, Density: ${m.density}`);
    console.log('');
  });

  process.exit(0);
}

queryMaterials().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
