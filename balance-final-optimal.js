const fs = require('fs');

const communal = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));

const allSpaces = [
  ...communal.nl.spaces.map(s => ({ ...s, file: 'communal' })),
  ...publicSpaces.nl.spaces.map(s => ({ ...s, file: 'public' }))
];

console.log('='.repeat(80));
console.log('FINAL BALANCED ADJUSTMENT');
console.log('='.repeat(80));
console.log('\nGoal: Add Welvarende Bourgondiërs to 8 amenities WITHOUT dropping anyone below 2.0\n');

// Current state (from matrix analysis)
const currentConnections = {
  'Gezellige Nesthouders': 76,       // Can lose max 24 to stay at 52 (2.0)
  'De Levensgenieters': 64,          // Can lose max 12 to stay at 52
  'Succesvolle Singles': 64,         // Can lose max 12 to stay at 52
  'Carrière Stampers': 60,           // Can lose max 8 to stay at 52
  'Vermogende Gezinnen': 60,         // Can lose max 8 to stay at 52
  'Zelfstandige Senior': 60,         // Can lose max 8 to stay at 52
  'Actieve Jonge Gezinnen': 56,     // Can lose max 4 to stay at 52
  'De Doorzetter': 56,               // Can lose max 4 to stay at 52
  'Hard van Start': 56,              // Can lose max 4 to stay at 52
  'Senioren met Thuiswonende Kinderen': 56  // Can lose max 4 to stay at 52
};

// Calculate safe removal limits (each removal = 4 connections)
const safeRemovals = {};
Object.entries(currentConnections).forEach(([persona, connections]) => {
  const maxLoss = connections - 52;  // Stay above 52 (2.0 avg)
  const maxRemovals = Math.floor(maxLoss / 4);
  if (maxRemovals > 0) {
    safeRemovals[persona] = maxRemovals;
  }
});

console.log('Safe removal capacity (without dropping below 2.0 avg):');
Object.entries(safeRemovals)
  .sort((a, b) => b[1] - a[1])
  .forEach(([persona, count]) => {
    console.log(`  ${persona}: can lose up to ${count} amenities`);
  });

console.log('\n' + '='.repeat(80));
console.log('GREEDY ALLOCATION (8 AMENITIES)');
console.log('='.repeat(80));

// Track how many we've removed from each persona
const removalTracker = {};
Object.keys(safeRemovals).forEach(p => removalTracker[p] = 0);

// Find amenities Welvarende Bourgondiërs is NOT in
const notIn = allSpaces.filter(space => {
  const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');
  return groups.length === 5 && !groups.includes('Welvarende Bourgondiërs');
});

// For each of 8 additions
const allocatedSwaps = [];

for (let i = 0; i < 8; i++) {
  // Score remaining amenities
  const scored = notIn
    .filter(space => !allocatedSwaps.some(s => s.name === space.name))
    .map(space => {
      const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');

      let score = 0;
      let bestRemoval = null;
      let removalReason = '';

      // Find best removal candidate in this space
      groups.forEach(persona => {
        if (safeRemovals[persona] && removalTracker[persona] < safeRemovals[persona]) {
          // This persona can still be safely removed
          const remainingCapacity = safeRemovals[persona] - removalTracker[persona];
          const personaScore = remainingCapacity * 10;  // Prefer those with more capacity

          if (personaScore > score) {
            score = personaScore;
            bestRemoval = persona;
            removalReason = `Has ${remainingCapacity} removal capacity left`;
          }
        }
      });

      // Bonus for luxury categories
      const luxuryCategories = ['sociaal_en_gastvrij', 'cultuur_en_educatie', 'ontspanning_en_vrije_tijd'];
      if (luxuryCategories.includes(space.category)) {
        score += 5;
      }

      return {
        space: space.name,
        file: space.file,
        category: space.category,
        currentPersonas: groups,
        bestRemoval,
        score,
        removalReason
      };
    });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Take best available
  const selected = scored[0];

  if (selected && selected.bestRemoval) {
    allocatedSwaps.push({
      file: selected.file,
      name: selected.space,
      remove: selected.bestRemoval,
      add: 'Welvarende Bourgondiërs',
      reason: selected.removalReason
    });

    removalTracker[selected.bestRemoval]++;

    console.log(`\n${i + 1}. ${selected.space} (${selected.file})`);
    console.log(`   Remove: ${selected.bestRemoval}`);
    console.log(`   Add: Welvarende Bourgondiërs`);
    console.log(`   Reason: ${selected.removalReason}`);
  } else {
    console.log(`\n${i + 1}. ⚠️  No safe removal found! Need manual selection.`);
  }
}

// Save swaps
fs.writeFileSync(
  '/home/user/GroosHub/final-balance-swaps.json',
  JSON.stringify(allocatedSwaps, null, 2)
);

console.log('\n' + '='.repeat(80));
console.log('✅ Swaps saved to: final-balance-swaps.json');
console.log('='.repeat(80));

// Impact analysis
console.log('\n' + '='.repeat(80));
console.log('EXPECTED IMPACT');
console.log('='.repeat(80));

console.log('\nWelvarende Bourgondiërs: 20 → 52 connections (0.8 → 2.0 avg)');

console.log('\nPersonas losing amenities:');
Object.entries(removalTracker)
  .filter(([_, count]) => count > 0)
  .sort((a, b) => b[1] - a[1])
  .forEach(([persona, count]) => {
    const newConnections = currentConnections[persona] - (count * 4);
    const newAvg = (newConnections / 26).toFixed(1);
    console.log(`  ${persona}: -${count} amenities (${currentConnections[persona]} → ${newConnections}, ${newAvg} avg)`);
  });

console.log('\n' + '='.repeat(80));
console.log('FINAL RANGE PROJECTION');
console.log('='.repeat(80));

console.log('\nAll personas will be in range: 52-76 connections (2.0-2.9 avg)');
console.log('Max/Min Ratio: 76/52 = 1.46x ✅ (well under 2.0x target!)');

console.log('\n' + '='.repeat(80));
