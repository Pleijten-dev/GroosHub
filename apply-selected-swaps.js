const fs = require('fs');

// Read files
const communalPath = '/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json';
const publicPath = '/home/user/GroosHub/src/features/location/data/sources/public-spaces.json';

const communal = JSON.parse(fs.readFileSync(communalPath, 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync(publicPath, 'utf8'));

// Define swaps - conflicting amenities (remove 2, add 2)
const swapsConflict = [
  {
    file: 'communal',
    id: 'swap_space',
    name: 'Ruilhoek',
    remove: ['Laat Bloeiers', 'Jonge Starters'],
    add: ['De Groeiers', 'Senioren met Thuiswonende Kinderen']
  },
  {
    file: 'communal',
    id: 'community_room',
    name: 'Gemeenschapsruimte',
    remove: ['Laat Bloeiers', 'De Zwitserlevers'],
    add: ['De Groeiers', 'Senioren met Thuiswonende Kinderen']
  },
  {
    file: 'communal',
    id: 'storage_pantry',
    name: 'Voorraadkast / bulkinkopen',
    remove: ['Vermogende Gezinnen', 'Actieve Jonge Gezinnen'],
    add: ['De Groeiers', 'De Doorzetter']
  },
  {
    file: 'communal',
    id: 'tiny_library',
    name: 'Tiny bibliotheek / boekenkast',
    remove: ['De Rentenier', 'Welvarende Bourgondiërs'],
    add: ['De Groeiers', 'De Doorzetter']
  },
  {
    file: 'communal',
    id: 'community_garden',
    name: 'Buurtmoestuin',
    remove: ['De Rentenier', 'Welvarende Bourgondiërs'],
    add: ['De Groeiers', 'De Doorzetter']
  },
  {
    file: 'communal',
    id: 'reading_room',
    name: 'Leeszaal',
    remove: ['De Levensgenieters', 'De Rentenier'],
    add: ['De Groeiers', 'Ambitieuze Singles']
  },
  {
    file: 'communal',
    id: 'community_cafe_tea_room',
    name: 'Gemeenschaps Café / Theekamer',
    remove: ['De Rentenier', 'Gezellige Nesthouders'],
    add: ['Senioren met Thuiswonende Kinderen', 'De Doorzetter']
  }
];

// Define simple swaps (remove 1, add 1)
const swapsSimple = [
  // De Groeiers
  {
    file: 'communal',
    id: 'game_room',
    name: 'Gamekamer met ook bordspellen',
    remove: 'Carrièrestarter',
    add: 'De Groeiers'
  },
  {
    file: 'communal',
    id: 'waste_recycling_hub',
    name: 'Afval/recycle hub',
    remove: 'Welvarende Bourgondiërs',
    add: 'De Groeiers'
  },
  // Ambitieuze Singles
  {
    file: 'communal',
    id: 'fitness_room',
    name: 'Fitnessruimte',
    remove: 'Gezellige Nesthouders',
    add: 'Ambitieuze Singles'
  },
  {
    file: 'communal',
    id: 'cooking_class_kitchen',
    name: 'Kookcursus Keuken',
    remove: 'Actieve Jonge Gezinnen',
    add: 'Ambitieuze Singles'
  },
  {
    file: 'public',
    id: 'cultural_facilities',
    name: 'Culturele voorzieningen',
    remove: 'De Groeigezinnen',
    add: 'Ambitieuze Singles'
  },
  {
    file: 'public',
    id: 'arthouse_cinema',
    name: 'Arthouse bioscoop',
    remove: 'De Groeigezinnen',
    add: 'Ambitieuze Singles'
  },
  {
    file: 'communal',
    id: 'meditation_mindfulness_room',
    name: 'Meditatie/Mindfulness Ruimte',
    remove: 'Samen Starters',
    add: 'Ambitieuze Singles'
  },
  // Senioren met Thuiswonende Kinderen
  {
    file: 'communal',
    id: 'guest_room',
    name: 'Logeerkamer',
    remove: 'De Rentenier',
    add: 'Senioren met Thuiswonende Kinderen'
  },
  {
    file: 'communal',
    id: 'family_game_night_room',
    name: 'Gezinsspelletjes Avond Ruimte',
    remove: 'Stabiele Gezinnen',
    add: 'Senioren met Thuiswonende Kinderen'
  },
  {
    file: 'communal',
    id: 'craft_room',
    name: 'Knutsel Ruimte',
    remove: 'De Levensgenieters',
    add: 'Senioren met Thuiswonende Kinderen'
  },
  // De Doorzetter
  {
    file: 'communal',
    id: 'small_terrace',
    name: 'Klein terras met zitplek',
    remove: 'Welvarende Bourgondiërs',
    add: 'De Doorzetter'
  }
];

function applySwap(spaces, swap, isConflict) {
  const space = spaces.find(s => s.id === swap.id);
  if (!space) {
    console.log(`⚠️  Space not found: ${swap.id} (${swap.name})`);
    return false;
  }

  if (isConflict) {
    // Remove 2, add 2
    let removed = 0;
    swap.remove.forEach(persona => {
      const idx = space.target_groups.indexOf(persona);
      if (idx !== -1) {
        space.target_groups.splice(idx, 1);
        removed++;
      }
    });

    swap.add.forEach(persona => {
      if (!space.target_groups.includes(persona)) {
        space.target_groups.push(persona);
      }
    });

    console.log(`✅ ${swap.name}: Removed ${removed}/2, Added ${swap.add.length}, Total: ${space.target_groups.length}`);
  } else {
    // Remove 1, add 1
    const idx = space.target_groups.indexOf(swap.remove);
    if (idx !== -1) {
      space.target_groups[idx] = swap.add;
      console.log(`✅ ${swap.name}: Swapped ${swap.remove} → ${swap.add}, Total: ${space.target_groups.length}`);
    } else {
      console.log(`⚠️  ${swap.name}: ${swap.remove} not found`);
      return false;
    }
  }

  return true;
}

console.log('='.repeat(80));
console.log('IMPLEMENTING PERSONA SWAPS');
console.log('='.repeat(80));

console.log('\n🔄 CONFLICT SWAPS (Remove 2, Add 2):');
swapsConflict.forEach(swap => {
  const spaces = swap.file === 'communal' ? communal.nl.spaces : publicSpaces.nl.spaces;
  applySwap(spaces, swap, true);
});

console.log('\n🔄 SIMPLE SWAPS (Remove 1, Add 1):');
swapsSimple.forEach(swap => {
  const spaces = swap.file === 'communal' ? communal.nl.spaces : publicSpaces.nl.spaces;
  applySwap(spaces, swap, false);
});

// Also apply to English versions
console.log('\n🔄 Applying to English versions...');
swapsConflict.forEach(swap => {
  const spaces = swap.file === 'communal' ? communal.en.spaces : publicSpaces.en.spaces;
  applySwap(spaces, swap, true);
});
swapsSimple.forEach(swap => {
  const spaces = swap.file === 'communal' ? communal.en.spaces : publicSpaces.en.spaces;
  applySwap(spaces, swap, false);
});

// Write back
fs.writeFileSync(communalPath, JSON.stringify(communal, null, 2));
fs.writeFileSync(publicPath, JSON.stringify(publicSpaces, null, 2));

console.log('\n✅ All swaps completed! Files saved.');
