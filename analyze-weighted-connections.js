const fs = require('fs');

const communal = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));

const allSpaces = [
  ...communal.nl.spaces,
  ...publicSpaces.nl.spaces
];

// Count weighted connections (how many times personas appear together)
const personaConnections = {};
const connectionPairs = {};

allSpaces.forEach(space => {
  const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');

  // For each persona in this space
  groups.forEach(persona => {
    if (!personaConnections[persona]) {
      personaConnections[persona] = 0;
    }

    // Count all OTHER personas in the same space as connections
    groups.forEach(other => {
      if (other !== persona) {
        personaConnections[persona]++;

        // Also track individual pairs
        const pairKey = [persona, other].sort().join(' <-> ');
        connectionPairs[pairKey] = (connectionPairs[pairKey] || 0) + 1;
      }
    });
  });
});

console.log('='.repeat(80));
console.log('WEIGHTED PERSONA CONNECTION ANALYSIS');
console.log('='.repeat(80));
console.log('\nThis counts TOTAL connections: if two personas appear together in');
console.log('6 different spaces, that counts as 6 connections (not just 1).\n');

// Sort by total connections
const connectionList = Object.entries(personaConnections)
  .sort((a, b) => b[1] - a[1]);

console.log('📊 TOTAL WEIGHTED CONNECTIONS PER PERSONA:\n');
connectionList.forEach(([persona, connections]) => {
  const bar = '█'.repeat(Math.floor(connections / 5));
  console.log(`${persona.padEnd(40)} ${connections.toString().padStart(3)} connections ${bar}`);
});

const totalConnections = connectionList.reduce((sum, [_, count]) => sum + count, 0);
const avgConnections = totalConnections / connectionList.length;
const minConnections = connectionList[connectionList.length - 1][1];
const maxConnections = connectionList[0][1];
const median = connectionList[Math.floor(connectionList.length / 2)][1];

console.log('\n' + '='.repeat(80));
console.log('STATISTICS:');
console.log('='.repeat(80));
console.log(`Total connections in graph: ${totalConnections / 2} (each connection counted twice)`);
console.log(`Average connections per persona: ${avgConnections.toFixed(1)}`);
console.log(`Median connections: ${median}`);
console.log(`Min connections: ${minConnections} (${connectionList[connectionList.length - 1][0]})`);
console.log(`Max connections: ${maxConnections} (${connectionList[0][0]})`);
console.log(`Range: ${maxConnections - minConnections}`);
console.log(`Max/Min Ratio: ${(maxConnections / minConnections).toFixed(2)}x`);

// Check balance
const topQuartile = connectionList.slice(0, Math.floor(connectionList.length / 4));
const bottomQuartile = connectionList.slice(-Math.floor(connectionList.length / 4));
const topAvg = topQuartile.reduce((sum, [_, count]) => sum + count, 0) / topQuartile.length;
const bottomAvg = bottomQuartile.reduce((sum, [_, count]) => sum + count, 0) / bottomQuartile.length;

console.log(`\nTop 25% average: ${topAvg.toFixed(1)} connections`);
console.log(`Bottom 25% average: ${bottomAvg.toFixed(1)} connections`);
console.log(`Top/Bottom Ratio: ${(topAvg / bottomAvg).toFixed(2)}x`);

if ((maxConnections / minConnections) > 2.0) {
  console.log('\n⚠️  WARNING: Graph is skewed - max is more than 2x the min!');
} else {
  console.log('\n✅ Graph balance is good - within 2x range');
}

// Find most connected pairs
console.log('\n' + '='.repeat(80));
console.log('🔗 STRONGEST PERSONA CONNECTIONS (Top 20 Pairs):');
console.log('='.repeat(80));
console.log('\nThese persona pairs appear together most frequently:\n');

const topPairs = Object.entries(connectionPairs)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

topPairs.forEach(([pair, count]) => {
  console.log(`${count.toString().padStart(2)}x: ${pair}`);
});

// Find personas that might need more/fewer connections
console.log('\n' + '='.repeat(80));
console.log('RECOMMENDATIONS:');
console.log('='.repeat(80));

const underconnected = connectionList.filter(([_, count]) => count < avgConnections * 0.7);
const overconnected = connectionList.filter(([_, count]) => count > avgConnections * 1.3);

if (underconnected.length > 0) {
  console.log(`\n⬇️  UNDERCONNECTED PERSONAS (less than 70% of average):`);
  underconnected.forEach(([persona, connections]) => {
    console.log(`   ${persona}: ${connections} connections (${((connections/avgConnections)*100).toFixed(0)}% of average)`);
  });
  console.log('\n   → These personas could benefit from more diverse amenity placement');
}

if (overconnected.length > 0) {
  console.log(`\n⬆️  OVERCONNECTED PERSONAS (more than 130% of average):`);
  overconnected.forEach(([persona, connections]) => {
    console.log(`   ${persona}: ${connections} connections (${((connections/avgConnections)*100).toFixed(0)}% of average)`);
  });
  console.log('\n   → These personas might dominate the connection graph');
}

if (underconnected.length === 0 && overconnected.length === 0) {
  console.log('\n✅ All personas are within 30% of average - excellent balance!');
}

// Calculate network density
const maxPossibleConnections = connectionList.length * (connectionList.length - 1) / 2;
const actualUniquePairs = Object.keys(connectionPairs).length;
const networkDensity = (actualUniquePairs / maxPossibleConnections) * 100;

console.log('\n' + '='.repeat(80));
console.log('NETWORK METRICS:');
console.log('='.repeat(80));
console.log(`Possible persona pairs: ${maxPossibleConnections}`);
console.log(`Actual connected pairs: ${actualUniquePairs}`);
console.log(`Network density: ${networkDensity.toFixed(1)}%`);

if (networkDensity > 80) {
  console.log('✅ Very high density - almost all personas connect with each other');
} else if (networkDensity > 60) {
  console.log('✅ Good density - personas are well-mixed');
} else if (networkDensity > 40) {
  console.log('⚠️  Moderate density - some personas may be isolated');
} else {
  console.log('⚠️  Low density - many personas don\'t connect');
}
