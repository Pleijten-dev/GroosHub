const fs = require('fs');

// Read the JSON files
const communalSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));

// Combine all spaces from Dutch sections
const allSpaces = [
  ...communalSpaces.nl.spaces,
  ...publicSpaces.nl.spaces
];

// Count personas
const personaCounts = {};

allSpaces.forEach(space => {
  if (space.target_groups) {
    space.target_groups.forEach(persona => {
      if (persona !== "geschikt voor elke doelgroep") {
        personaCounts[persona] = (personaCounts[persona] || 0) + 1;
      }
    });
  }
});

// Sort by count
const sorted = Object.entries(personaCounts)
  .sort((a, b) => a[1] - b[1]);

console.log('=== FINAL PERSONA USAGE ANALYSIS ===\n');
console.log(`Total spaces analyzed: ${allSpaces.length}`);
console.log(`Total unique personas: ${sorted.length}\n`);

console.log('Persona usage (sorted by count):');
console.log('='.repeat(50));
sorted.forEach(([persona, count]) => {
  const bar = '█'.repeat(count);
  console.log(`${persona.padEnd(30)} ${count.toString().padStart(3)} ${bar}`);
});

const counts = sorted.map(([_, count]) => count);
const min = Math.min(...counts);
const max = Math.max(...counts);
const avg = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(2);
const range = max - min;
const ratio = (max / min).toFixed(2);

console.log('\n=== STATISTICS ===');
console.log(`Minimum: ${min} uses`);
console.log(`Maximum: ${max} uses`);
console.log(`Average: ${avg} uses`);
console.log(`Range: ${range} (from ${min} to ${max})`);
console.log(`Max/Min Ratio: ${ratio}x`);

// Check if within target range (10-15)
const withinTarget = sorted.filter(([_, count]) => count >= 10 && count <= 15).length;
const belowTarget = sorted.filter(([_, count]) => count < 10).length;
const aboveTarget = sorted.filter(([_, count]) => count > 15).length;

console.log('\n=== TARGET RANGE (10-15 uses) ===');
console.log(`Within target: ${withinTarget} personas (${((withinTarget/sorted.length)*100).toFixed(1)}%)`);
console.log(`Below target: ${belowTarget} personas (${((belowTarget/sorted.length)*100).toFixed(1)}%)`);
console.log(`Above target: ${aboveTarget} personas (${((aboveTarget/sorted.length)*100).toFixed(1)}%)`);

if (belowTarget > 0) {
  console.log('\nPersonas BELOW target (<10 uses):');
  sorted.filter(([_, count]) => count < 10).forEach(([persona, count]) => {
    console.log(`  - ${persona}: ${count} uses`);
  });
}

if (aboveTarget > 0) {
  console.log('\nPersonas ABOVE target (>15 uses):');
  sorted.filter(([_, count]) => count > 15).forEach(([persona, count]) => {
    console.log(`  - ${persona}: ${count} uses`);
  });
}

console.log('\n=== IMPROVEMENT ===');
console.log('Before rebalancing: 4-20 uses (5.0x ratio)');
console.log(`After rebalancing: ${min}-${max} uses (${ratio}x ratio)`);
console.log(`Improvement: ${(5.0 - parseFloat(ratio)).toFixed(2)}x reduction in inequality`);
