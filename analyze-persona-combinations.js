const fs = require('fs');

const communal = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));

const allSpaces = [
  ...communal.nl.spaces,
  ...publicSpaces.nl.spaces
];

// Function to generate all combinations of size k from array
function getCombinations(arr, k) {
  if (k > arr.length || k <= 0) return [];
  if (k === arr.length) return [arr];
  if (k === 1) return arr.map(el => [el]);

  const result = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr.slice(i, i + 1);
    const tailCombinations = getCombinations(arr.slice(i + 1), k - 1);
    tailCombinations.forEach(combination => {
      result.push([...head, ...combination]);
    });
  }
  return result;
}

// Count combinations
const combinations4 = {};
const combinations5 = {};

allSpaces.forEach(space => {
  const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');

  if (groups.length === 5) {
    // Store exact 5-persona combination
    const key5 = groups.slice().sort().join(' | ');
    combinations5[key5] = (combinations5[key5] || 0) + 1;

    // Get all 4-persona sub-combinations
    const combos4 = getCombinations(groups, 4);
    combos4.forEach(combo => {
      const key4 = combo.sort().join(' | ');
      combinations4[key4] = (combinations4[key4] || 0) + 1;
    });
  }
});

console.log('='.repeat(80));
console.log('PERSONA COMBINATION ANALYSIS');
console.log('='.repeat(80));

// Count repeated combinations
const repeated5 = Object.entries(combinations5).filter(([_, count]) => count > 1);
const repeated4 = Object.entries(combinations4).filter(([_, count]) => count > 1);

console.log(`\n📊 STATISTICS:`);
console.log(`Total spaces: ${allSpaces.length}`);
console.log(`Spaces with 5 personas: ${Object.values(combinations5).reduce((a,b) => a+b, 0)}`);
console.log(`Unique 5-persona combinations: ${Object.keys(combinations5).length}`);
console.log(`Repeated 5-persona combinations: ${repeated5.length}`);
console.log(`Unique 4-persona combinations: ${Object.keys(combinations4).length}`);
console.log(`Repeated 4-persona combinations (2+ times): ${repeated4.length}`);

if (repeated5.length > 0) {
  console.log(`\n\n🔁 REPEATED 5-PERSONA COMBINATIONS:`);
  console.log('='.repeat(80));
  repeated5.sort((a, b) => b[1] - a[1]).forEach(([combo, count]) => {
    console.log(`\n${count}x: ${combo}`);
    const spaces = allSpaces.filter(s => {
      const groups = s.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');
      return groups.slice().sort().join(' | ') === combo;
    });
    spaces.forEach(s => console.log(`    - ${s.name}`));
  });
} else {
  console.log(`\n✅ No repeated 5-persona combinations! All spaces have unique combinations.`);
}

if (repeated4.length > 0) {
  console.log(`\n\n🔁 MOST REPEATED 4-PERSONA COMBINATIONS (Top 20):`);
  console.log('='.repeat(80));
  repeated4.sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([combo, count]) => {
    console.log(`\n${count}x: ${combo}`);
  });
}

// Network connectivity analysis
console.log(`\n\n🌐 NETWORK CONNECTIVITY:`);
console.log('='.repeat(80));

const personaConnections = {};

allSpaces.forEach(space => {
  const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');
  groups.forEach(persona => {
    if (!personaConnections[persona]) {
      personaConnections[persona] = new Set();
    }
    groups.forEach(other => {
      if (other !== persona) {
        personaConnections[persona].add(other);
      }
    });
  });
});

const connectionCounts = Object.entries(personaConnections).map(([persona, connections]) => ({
  persona,
  connections: connections.size
})).sort((a, b) => b.connections - a.connections);

console.log(`\nPersona network connections (how many other personas they share spaces with):\n`);
connectionCounts.forEach(({ persona, connections }) => {
  console.log(`${persona.padEnd(40)} ${connections}/26 connections`);
});

const avgConnections = connectionCounts.reduce((sum, p) => sum + p.connections, 0) / connectionCounts.length;
console.log(`\nAverage connections: ${avgConnections.toFixed(1)}/26`);
console.log(`Min connections: ${connectionCounts[connectionCounts.length - 1].connections}`);
console.log(`Max connections: ${connectionCounts[0].connections}`);

if (connectionCounts[connectionCounts.length - 1].connections < 10) {
  console.log(`\n⚠️  Warning: Some personas have few connections (isolated clusters)`);
}
