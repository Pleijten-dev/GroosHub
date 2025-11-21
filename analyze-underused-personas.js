const fs = require('fs');

// Read the JSON files
const communalSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));
const personas = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/housing-personas.json', 'utf8'));

// Combine all spaces from Dutch sections
const allSpaces = [
  ...communalSpaces.nl.spaces,
  ...publicSpaces.nl.spaces
];

// Count personas and track which spaces they're in
const personaData = {};

allSpaces.forEach(space => {
  if (space.target_groups) {
    space.target_groups.forEach(persona => {
      if (persona !== "geschikt voor elke doelgroep") {
        if (!personaData[persona]) {
          personaData[persona] = {
            count: 0,
            spaces: []
          };
        }
        personaData[persona].count++;
        personaData[persona].spaces.push(space.id);
      }
    });
  }
});

// Find personas with less than 11 uses
const underused = Object.entries(personaData)
  .filter(([_, data]) => data.count < 11)
  .sort((a, b) => a[1].count - b[1].count);

console.log('=== PERSONAS WITH LESS THAN 11 USES ===\n');

underused.forEach(([personaName, data]) => {
  const needed = 15 - data.count;

  // Find persona details
  const personaInfo = personas.nl.housing_personas.find(p => p.name === personaName);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${personaName.toUpperCase()}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Current: ${data.count} amenities | Need: ${needed} more to reach 15`);
  console.log(`Income: ${personaInfo?.income_level || 'N/A'}`);
  console.log(`Household: ${personaInfo?.household_type || 'N/A'}`);
  console.log(`Age: ${personaInfo?.age_group || 'N/A'}`);
  console.log(`Description: ${personaInfo?.description || 'N/A'}`);

  console.log(`\nCurrently IN these spaces (${data.count}):`);
  data.spaces.forEach(spaceId => {
    const space = allSpaces.find(s => s.id === spaceId);
    console.log(`  - ${space?.name || spaceId}`);
  });

  console.log(`\nCurrently NOT IN these spaces (${allSpaces.length - data.count}):`);
  const notIn = allSpaces.filter(s => !data.spaces.includes(s.id));
  notIn.forEach(space => {
    const categories = [];
    if (space.category) categories.push(space.category);
    if (space.scale) categories.push(space.scale);
    console.log(`  - ${space.name.padEnd(40)} [${categories.join(', ')}]`);
  });
});

console.log('\n\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
underused.forEach(([personaName, data]) => {
  const needed = 15 - data.count;
  console.log(`${personaName.padEnd(35)} Current: ${data.count.toString().padStart(2)}  Need: +${needed}`);
});
