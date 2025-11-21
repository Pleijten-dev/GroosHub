const fs = require('fs');

// Read files
const communalPath = '/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json';
const publicPath = '/home/user/GroosHub/src/features/location/data/sources/public-spaces.json';

const communal = JSON.parse(fs.readFileSync(communalPath, 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync(publicPath, 'utf8'));

// Define all swaps with exact space names
const swaps = [
  // Conflict swaps
  {
    file: 'communal',
    name: 'Ruilhoek',
    remove: ['Laat Bloeiers', 'Jonge Starters'],
    add: ['De Groeiers', 'Senioren met Thuiswonende Kinderen']
  },
  {
    file: 'communal',
    name: 'Gemeenschapsruimte',
    remove: ['Laat Bloeiers', 'De Zwitserlevers'],
    add: ['De Groeiers', 'Senioren met Thuiswonende Kinderen']
  },
  {
    file: 'communal',
    name: 'Voorraadkast / bulkinkopen',
    remove: ['Vermogende Gezinnen', 'Actieve Jonge Gezinnen'],
    add: ['De Groeiers', 'De Doorzetter']
  },
  {
    file: 'communal',
    name: 'Tiny bibliotheek / boekenkast',
    remove: ['De Rentenier', 'Welvarende Bourgondiërs'],
    add: ['De Groeiers', 'De Doorzetter']
  },
  {
    file: 'communal',
    name: 'Buurtmoestuin',
    remove: ['De Rentenier', 'Welvarende Bourgondiërs'],
    add: ['De Groeiers', 'De Doorzetter']
  },
  {
    file: 'communal',
    name: 'Leeszaal',
    remove: ['De Levensgenieters', 'De Rentenier'],
    add: ['De Groeiers', 'Ambitieuze Singles']
  },
  {
    file: 'communal',
    name: 'Gemeenschaps Café / Theekamer',
    remove: ['De Rentenier', 'Gezellige Nesthouders'],
    add: ['Senioren met Thuiswonende Kinderen', 'De Doorzetter']
  },
  // Simple swaps
  {
    file: 'communal',
    name: 'Gamekamer met ook bordspellen',
    remove: ['Carrièrestarter'],
    add: ['De Groeiers']
  },
  {
    file: 'communal',
    name: 'Afval/recycle hub',
    remove: ['Welvarende Bourgondiërs'],
    add: ['De Groeiers']
  },
  {
    file: 'communal',
    name: 'Fitnessruimte',
    remove: ['Gezellige Nesthouders'],
    add: ['Ambitieuze Singles']
  },
  {
    file: 'communal',
    name: 'Kookcursus Keuken',
    remove: ['Actieve Jonge Gezinnen'],
    add: ['Ambitieuze Singles']
  },
  {
    file: 'public',
    name: 'Culturele voorzieningen',
    remove: ['De Groeigezinnen'],
    add: ['Ambitieuze Singles']
  },
  {
    file: 'public',
    name: 'Arthouse bioscoop',
    remove: ['De Groeigezinnen'],
    add: ['Ambitieuze Singles']
  },
  {
    file: 'communal',
    name: 'Meditatie/Mindfulness Ruimte',
    remove: ['Samen Starters'],
    add: ['Ambitieuze Singles']
  },
  {
    file: 'communal',
    name: 'Logeerkamer',
    remove: ['De Rentenier'],
    add: ['Senioren met Thuiswonende Kinderen']
  },
  {
    file: 'communal',
    name: 'Gezinsspelletjes Avond Ruimte',
    remove: ['Stabiele Gezinnen'],
    add: ['Senioren met Thuiswonende Kinderen']
  },
  {
    file: 'communal',
    name: 'Knutsel Ruimte',
    remove: ['De Levensgenieters'],
    add: ['Senioren met Thuiswonende Kinderen']
  },
  {
    file: 'communal',
    name: 'Klein terras met zitplek',
    remove: ['Welvarende Bourgondiërs'],
    add: ['De Doorzetter']
  }
];

function applySwap(spaces, swap) {
  const space = spaces.find(s => s.name === swap.name);
  if (!space) {
    console.log(`⚠️  Space not found: ${swap.name}`);
    return false;
  }

  console.log(`\n📍 ${swap.name}`);
  console.log(`   Before: [${space.target_groups.join(', ')}]`);

  // Remove personas
  swap.remove.forEach(persona => {
    const idx = space.target_groups.indexOf(persona);
    if (idx !== -1) {
      space.target_groups.splice(idx, 1);
      console.log(`   ❌ Removed: ${persona}`);
    } else {
      console.log(`   ⚠️  Not found to remove: ${persona}`);
    }
  });

  // Add personas
  swap.add.forEach(persona => {
    if (!space.target_groups.includes(persona)) {
      space.target_groups.push(persona);
      console.log(`   ✅ Added: ${persona}`);
    } else {
      console.log(`   ⚠️  Already has: ${persona}`);
    }
  });

  console.log(`   After: [${space.target_groups.join(', ')}] (${space.target_groups.length} total)`);

  if (space.target_groups.length !== 5) {
    console.log(`   ⚠️  WARNING: Space has ${space.target_groups.length} personas (should be 5)!`);
  }

  return true;
}

console.log('='.repeat(80));
console.log('IMPLEMENTING PERSONA SWAPS - DUTCH VERSION');
console.log('='.repeat(80));

swaps.forEach(swap => {
  const spaces = swap.file === 'communal' ? communal.nl.spaces : publicSpaces.nl.spaces;
  applySwap(spaces, swap);
});

// Write back
fs.writeFileSync(communalPath, JSON.stringify(communal, null, 2));
fs.writeFileSync(publicPath, JSON.stringify(publicSpaces, null, 2));

console.log('\n' + '='.repeat(80));
console.log('✅ All swaps completed for Dutch version! Files saved.');
console.log('='.repeat(80));
