const fs = require('fs');

const communal = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));

const allSpaces = [
  ...communal.nl.spaces,
  ...publicSpaces.nl.spaces
];

// Get all unique personas
const allPersonas = new Set();
allSpaces.forEach(space => {
  space.target_groups.forEach(persona => {
    if (persona !== 'geschikt voor elke doelgroep') {
      allPersonas.add(persona);
    }
  });
});

const personas = Array.from(allPersonas).sort();

// Build connection matrix
const matrix = {};
personas.forEach(p1 => {
  matrix[p1] = {};
  personas.forEach(p2 => {
    matrix[p1][p2] = 0;
  });
});

// Count connections
allSpaces.forEach(space => {
  const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const p1 = groups[i];
      const p2 = groups[j];
      if (matrix[p1] && matrix[p2]) {
        matrix[p1][p2]++;
        matrix[p2][p1]++;
      }
    }
  }
});

console.log('='.repeat(100));
console.log('PERSONA CONNECTION MATRIX');
console.log('='.repeat(100));
console.log('\nShows how many times each persona pair appears together in the same space.\n');

// Calculate column statistics
const columnStats = {};
personas.forEach(col => {
  const values = personas
    .filter(row => row !== col)
    .map(row => matrix[row][col]);

  columnStats[col] = {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    total: values.reduce((a, b) => a + b, 0)
  };
});

// Sort personas by total connections for better readability
const sortedPersonas = [...personas].sort((a, b) =>
  columnStats[b].total - columnStats[a].total
);

// Print matrix in chunks (too wide for one view)
const chunkSize = 10;
for (let chunk = 0; chunk < Math.ceil(sortedPersonas.length / chunkSize); chunk++) {
  const chunkPersonas = sortedPersonas.slice(chunk * chunkSize, (chunk + 1) * chunkSize);

  console.log('\n' + '='.repeat(100));
  console.log(`CHUNK ${chunk + 1}/${Math.ceil(sortedPersonas.length / chunkSize)}`);
  console.log('='.repeat(100));

  // Header row
  console.log('\n' + ' '.repeat(35) + chunkPersonas.map((p, i) => (i + 1).toString().padStart(4)).join(''));
  chunkPersonas.forEach((p, i) => {
    const shortName = p.length > 30 ? p.substring(0, 27) + '...' : p;
    console.log(`${(i + 1).toString().padStart(2)}. ${shortName.padEnd(32)}`);
  });

  console.log('\n' + '-'.repeat(100));

  // Data rows
  sortedPersonas.forEach(row => {
    const shortName = row.length > 30 ? row.substring(0, 27) + '...' : row;
    const values = chunkPersonas.map(col => {
      if (row === col) return '  - ';
      const val = matrix[row][col];
      return val.toString().padStart(4);
    }).join('');
    console.log(`${shortName.padEnd(32)} ${values}`);
  });

  // Column stats
  console.log('\n' + '-'.repeat(100));
  console.log('Min:'.padEnd(32) + chunkPersonas.map(col => columnStats[col].min.toString().padStart(4)).join(''));
  console.log('Max:'.padEnd(32) + chunkPersonas.map(col => columnStats[col].max.toString().padStart(4)).join(''));
  console.log('Avg:'.padEnd(32) + chunkPersonas.map(col => columnStats[col].avg.toFixed(1).padStart(4)).join(''));
  console.log('Total:'.padEnd(32) + chunkPersonas.map(col => columnStats[col].total.toString().padStart(4)).join(''));
}

// Summary statistics
console.log('\n\n' + '='.repeat(100));
console.log('SUMMARY STATISTICS');
console.log('='.repeat(100));

// Overall stats
const allConnections = [];
for (let i = 0; i < sortedPersonas.length; i++) {
  for (let j = i + 1; j < sortedPersonas.length; j++) {
    const count = matrix[sortedPersonas[i]][sortedPersonas[j]];
    allConnections.push({
      pair: `${sortedPersonas[i]} <-> ${sortedPersonas[j]}`,
      count
    });
  }
}

allConnections.sort((a, b) => b.count - a.count);

const connectionCounts = allConnections.map(c => c.count);
const avgConnection = connectionCounts.reduce((a, b) => a + b, 0) / connectionCounts.length;
const minConnection = Math.min(...connectionCounts);
const maxConnection = Math.max(...connectionCounts);

console.log(`\nTotal persona pairs: ${allConnections.length}`);
console.log(`Average connections per pair: ${avgConnection.toFixed(1)}`);
console.log(`Min connection: ${minConnection}`);
console.log(`Max connection: ${maxConnection}`);
console.log(`Range: ${maxConnection - minConnection}`);
console.log(`Max/Min Ratio: ${(maxConnection / minConnection).toFixed(2)}x`);

// Distribution
const neverConnected = allConnections.filter(c => c.count === 0).length;
const weaklyConnected = allConnections.filter(c => c.count >= 1 && c.count <= 2).length;
const moderatelyConnected = allConnections.filter(c => c.count >= 3 && c.count <= 5).length;
const stronglyConnected = allConnections.filter(c => c.count >= 6 && c.count <= 10).length;
const veryStronglyConnected = allConnections.filter(c => c.count > 10).length;

console.log(`\n📊 CONNECTION DISTRIBUTION:`);
console.log(`Never connected (0):       ${neverConnected.toString().padStart(3)} pairs (${((neverConnected/allConnections.length)*100).toFixed(1)}%)`);
console.log(`Weakly (1-2):              ${weaklyConnected.toString().padStart(3)} pairs (${((weaklyConnected/allConnections.length)*100).toFixed(1)}%)`);
console.log(`Moderately (3-5):          ${moderatelyConnected.toString().padStart(3)} pairs (${((moderatelyConnected/allConnections.length)*100).toFixed(1)}%)`);
console.log(`Strongly (6-10):           ${stronglyConnected.toString().padStart(3)} pairs (${((stronglyConnected/allConnections.length)*100).toFixed(1)}%)`);
console.log(`Very strongly (11+):       ${veryStronglyConnected.toString().padStart(3)} pairs (${((veryStronglyConnected/allConnections.length)*100).toFixed(1)}%)`);

// Top 20 strongest connections
console.log(`\n🔗 TOP 20 STRONGEST CONNECTIONS:`);
allConnections.slice(0, 20).forEach((c, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${c.count.toString().padStart(2)}x: ${c.pair}`);
});

// Bottom 20 weakest (non-zero) connections
const nonZeroConnections = allConnections.filter(c => c.count > 0);
console.log(`\n🔗 BOTTOM 20 WEAKEST (NON-ZERO) CONNECTIONS:`);
nonZeroConnections.slice(-20).reverse().forEach((c, i) => {
  console.log(`${(i+1).toString().padStart(2)}. ${c.count.toString().padStart(2)}x: ${c.pair}`);
});

// Never connected pairs
if (neverConnected > 0) {
  console.log(`\n❌ NEVER CONNECTED PAIRS (${neverConnected}):`);
  allConnections.filter(c => c.count === 0).forEach(c => {
    console.log(`    ${c.pair}`);
  });
}

// Per-persona statistics (sorted by total connections)
console.log(`\n\n📊 PER-PERSONA CONNECTION STATISTICS:`);
console.log('='.repeat(100));
console.log(`${'Persona'.padEnd(40)} ${'Total'.padStart(5)} ${'Min'.padStart(4)} ${'Max'.padStart(4)} ${'Avg'.padStart(5)}`);
console.log('-'.repeat(100));

sortedPersonas.forEach(persona => {
  const stats = columnStats[persona];
  console.log(`${persona.padEnd(40)} ${stats.total.toString().padStart(5)} ${stats.min.toString().padStart(4)} ${stats.max.toString().padStart(4)} ${stats.avg.toFixed(1).padStart(5)}`);
});

// Identify problematic personas
console.log(`\n\n⚠️  BALANCE ISSUES:`);
const problematicPersonas = sortedPersonas.filter(p => {
  const stats = columnStats[p];
  return stats.max > avgConnection * 3; // If max connection is 3x average
});

if (problematicPersonas.length > 0) {
  console.log(`\nPersonas with very strong connections to specific others:`);
  problematicPersonas.forEach(p => {
    const stats = columnStats[p];
    console.log(`  ${p}: max=${stats.max} (${(stats.max/avgConnection).toFixed(1)}x average)`);
  });
} else {
  console.log(`\n✅ No personas have overly dominant connections`);
}
