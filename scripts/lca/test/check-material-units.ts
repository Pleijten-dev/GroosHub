// Check material units and conversion factors
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

async function checkUnits() {
  const sql = getDbConnection();

  const materials = await sql`
    SELECT id, name_en, declared_unit, conversion_to_kg, gwp_a1_a3, density
    FROM lca_materials
    WHERE id IN (
      'e51edde6-a353-4b1b-be94-d63118bca3b2',
      'fa081fea-9df6-4a4b-ba16-850895973ac1',
      '2550d0eb-ae35-49bb-b02f-7ba4c4ac5f5f',
      '13346b9a-2dea-4699-b356-666b25fb0a49'
    )
  `;

  console.log('\nMaterial Units and Conversion Factors:\n');
  console.log('='.repeat(80));

  materials.forEach(m => {
    console.log(`\nName: ${m.name_en}`);
    console.log(`  Declared Unit: ${m.declared_unit}`);
    console.log(`  Conversion to kg: ${m.conversion_to_kg}`);
    console.log(`  GWP A1-A3: ${m.gwp_a1_a3} kg CO₂-eq per ${m.declared_unit}`);
    console.log(`  Density: ${m.density} kg/m³`);

    // Calculate what the GWP should be per kg
    if (m.declared_unit && m.declared_unit.includes('m3') && m.density) {
      const gwpPerKg = m.gwp_a1_a3 / m.density;
      console.log(`  → GWP per kg: ${gwpPerKg.toFixed(4)} kg CO₂-eq/kg`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n');

  process.exit(0);
}

checkUnits().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
