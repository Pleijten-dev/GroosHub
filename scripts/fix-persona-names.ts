#!/usr/bin/env tsx
/**
 * Fix persona names in communal-spaces.json and public-spaces.json
 * to match the master list in housing-personas.json
 */

import fs from 'fs';
import path from 'path';

const SOURCES_DIR = path.join(__dirname, '../src/features/location/data/sources');

// Dutch name corrections (singular → plural, remove "De" prefix)
const nlNameFixes: Record<string, string> = {
  'Jonge Starter': 'Jonge Starters',
  'De Carriërestarter': 'Carrièrestarter',
  'Zelfbewuste Solist': 'Zelfbewuste Solisten',
};

// Dutch to English translations
const nlToEnTranslations: Record<string, string> = {
  'De Groeiers': 'The Growers',
  'Jonge Starters': 'Young Starters',
  'De Doorzetter': 'The Perseverer',
  'Bescheiden Stellen': 'Modest Couples',
  'Zelfstandige Senior': 'Independent Senior',
  'Ambitieuze Singles': 'Ambitious Singles',
  'De Rentenier': 'The Person of Independent Means',
  'Samen Starters': 'Starting Together',
  'Carrière Stampers': 'Career Stampers',
  'Grenzeloos Duo': 'Limitless Duo',
  'Actieve Jonge Gezinnen': 'Active Young Families',
  'Vermogende Gezinnen': 'Wealthy Families',
  'Succesvolle Singles': 'Successful Singles',
  'Welvarende Bourgondiërs': 'Affluent Bon Vivants',
  'Carrièrestarter': 'Career Starter',
  'Stabiele Gezinnen': 'Stable Families',
  'Zelfbewuste Solisten': 'Self-Assured Soloists',
  'Senior op Budget': 'Senior on a Budget',
  'Hard van Start': 'Fast Starters',
  'De Zwitserlevers': 'The Comfortable Livers',
  'Knusse Gezinnen': 'Cozy Families',
  'De Groeigezinnen': 'Growing Families',
  'Senioren met Thuiswonende Kinderen': 'Seniors with Children at Home',
  'De Levensgenieters': 'The Life Enjoyers',
  'Gezellige Nesthouders': 'Cozy Nesters',
  'Laat Bloeiers': 'Late Bloomers',
  'De Balanszoekers': 'The Balance Seekers',
};

function fixTargetGroups(targetGroups: string[], locale: 'nl' | 'en'): string[] {
  return targetGroups.map(name => {
    if (locale === 'nl') {
      // Fix Dutch names
      return nlNameFixes[name] || name;
    } else {
      // First fix any Dutch name issues, then translate to English
      const fixedNlName = nlNameFixes[name] || name;
      return nlToEnTranslations[fixedNlName] || name;
    }
  });
}

function processFile(filename: string) {
  const filePath = path.join(SOURCES_DIR, filename);
  console.log(`\nProcessing ${filename}...`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  let changesNl = 0;
  let changesEn = 0;

  // Process Dutch section
  if (data.nl && data.nl.spaces) {
    data.nl.spaces.forEach((space: any) => {
      const original = JSON.stringify(space.target_groups);
      space.target_groups = fixTargetGroups(space.target_groups, 'nl');
      const fixed = JSON.stringify(space.target_groups);
      if (original !== fixed) changesNl++;
    });
  }

  // Process English section
  if (data.en && data.en.spaces) {
    data.en.spaces.forEach((space: any) => {
      const original = JSON.stringify(space.target_groups);
      space.target_groups = fixTargetGroups(space.target_groups, 'en');
      const fixed = JSON.stringify(space.target_groups);
      if (original !== fixed) changesEn++;
    });
  }

  // Write back
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');

  console.log(`  ✓ Fixed ${changesNl} Dutch target_groups`);
  console.log(`  ✓ Fixed ${changesEn} English target_groups`);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  Fixing Persona Names in Space Files');
console.log('═══════════════════════════════════════════════════════════');

processFile('communal-spaces.json');
processFile('public-spaces.json');

console.log('\n✓ All files processed successfully!');
console.log('\nRun `npm run validate:data` to verify the fixes.');
