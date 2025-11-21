const fs = require('fs');

const communal = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));

const allSpaces = [
  ...communal.nl.spaces.map(s => ({ ...s, file: 'communal' })),
  ...publicSpaces.nl.spaces.map(s => ({ ...s, file: 'public' }))
];

console.log('='.repeat(80));
console.log('BALANCE ADJUSTMENT: ADD WELVARENDE BOURGONDIËRS BACK');
console.log('='.repeat(80));
console.log('\nWelvarende Bourgondiërs needs 32 more connections = 8 amenity additions\n');

// Target personas to remove from (currently above 15 uses)
const removeFrom = [
  'Gezellige Nesthouders',      // 19 uses (can lose 4)
  'De Levensgenieters',         // 16 uses (can lose 1)
  'Succesvolle Singles'         // 16 uses (can lose 1)
];

// Find amenities Welvarende Bourgondiërs is NOT in
const notIn = allSpaces.filter(space => {
  const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');
  return groups.length === 5 && !groups.includes('Welvarende Bourgondiërs');
});

// Score amenities
const scored = notIn.map(space => {
  const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');

  let score = 0;
  let reasons = [];

  // Prefer spaces with personas we want to remove
  const targetsInSpace = groups.filter(g => removeFrom.includes(g));
  score += targetsInSpace.length * 30;
  if (targetsInSpace.length > 0) {
    reasons.push(`Has ${targetsInSpace.join(', ')}`);
  }

  // Prefer luxury/high-income spaces
  const luxuryCategories = ['sociaal_en_gastvrij', 'cultuur_en_educatie', 'ontspanning_en_vrije_tijd'];
  if (luxuryCategories.includes(space.category)) {
    score += 10;
    reasons.push('Luxury category');
  }

  return {
    space: space.name,
    file: space.file,
    category: space.category,
    currentPersonas: groups,
    targetsInSpace,
    score,
    reasons
  };
});

// Sort by score
scored.sort((a, b) => b.score - a.score);

// Select top 8
const recommendations = scored.slice(0, 8);

console.log('Recommended additions:\n');

recommendations.forEach((rec, i) => {
  console.log(`${i + 1}. ${rec.space} (${rec.file}, ${rec.category})`);
  console.log(`   Current: ${rec.currentPersonas.join(', ')}`);

  if (rec.targetsInSpace.length > 0) {
    // Prefer removing Gezellige Nesthouders first (has most uses)
    const removal = rec.targetsInSpace.includes('Gezellige Nesthouders')
      ? 'Gezellige Nesthouders'
      : rec.targetsInSpace[0];

    console.log(`   ⚠️  Remove: ${removal}`);
    console.log(`   ✅ Add: Welvarende Bourgondiërs`);
  } else {
    // Find least-used persona in this space
    console.log(`   ⚠️  Remove: ${rec.currentPersonas[0]} (choose manually)`);
    console.log(`   ✅ Add: Welvarende Bourgondiërs`);
  }

  if (rec.reasons.length > 0) {
    console.log(`   Reasoning: ${rec.reasons.join('; ')}`);
  }
  console.log(`   Score: ${rec.score}`);
  console.log('');
});

// Create implementation format
const swaps = recommendations.map(rec => {
  let removal;
  if (rec.targetsInSpace.length > 0) {
    removal = rec.targetsInSpace.includes('Gezellige Nesthouders')
      ? 'Gezellige Nesthouders'
      : rec.targetsInSpace[0];
  } else {
    removal = rec.currentPersonas[0];
  }

  return {
    file: rec.file,
    name: rec.space,
    remove: removal,
    add: 'Welvarende Bourgondiërs'
  };
});

fs.writeFileSync(
  '/home/user/GroosHub/welvarende-adjustment-swaps.json',
  JSON.stringify(swaps, null, 2)
);

console.log('='.repeat(80));
console.log('✅ Swaps saved to: welvarende-adjustment-swaps.json');
console.log('='.repeat(80));

// Expected impact
console.log('\n' + '='.repeat(80));
console.log('EXPECTED IMPACT');
console.log('='.repeat(80));

console.log('\nWelvarende Bourgondiërs: 20 → 52 connections (0.8 → 2.0 avg)');

const removalCounts = {};
swaps.forEach(swap => {
  removalCounts[swap.remove] = (removalCounts[swap.remove] || 0) + 1;
});

console.log('\nPersonas losing amenities:');
Object.entries(removalCounts).forEach(([persona, count]) => {
  console.log(`  ${persona}: -${count} amenities`);
});

console.log('\n' + '='.repeat(80));
