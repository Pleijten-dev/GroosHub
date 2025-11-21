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

// Calculate statistics per persona
const personaStats = {};

personas.forEach(persona => {
  const connections = [];
  personas.forEach(other => {
    if (other !== persona) {
      const count = matrix[persona][other];
      if (count > 0) {
        connections.push(count);
      }
    }
  });

  const totalConnections = connections.reduce((a, b) => a + b, 0);
  const uniqueConnections = connections.length;
  const avgConnection = uniqueConnections > 0 ? totalConnections / uniqueConnections : 0;

  personaStats[persona] = {
    totalConnections,
    uniqueConnections,
    avgConnection,
    minConnection: connections.length > 0 ? Math.min(...connections) : 0,
    maxConnection: connections.length > 0 ? Math.max(...connections) : 0,
    neverConnected: 26 - uniqueConnections
  };
});

// Sort by average connection
const sorted = Object.entries(personaStats)
  .sort((a, b) => a[1].avgConnection - b[1].avgConnection);

console.log('='.repeat(100));
console.log('PERSONA AVERAGE CONNECTION ANALYSIS');
console.log('='.repeat(100));
console.log('\nGoal: Every persona should have AVERAGE connection of 2.0 or more\n');

console.log('📊 CURRENT AVERAGE CONNECTIONS PER PERSONA:\n');
console.log('Persona'.padEnd(42) + 'Avg'.padStart(5) + ' Total'.padStart(6) + ' Unique'.padStart(7) + ' Status');
console.log('-'.repeat(100));

const belowTarget = [];
const atTarget = [];

sorted.forEach(([persona, stats]) => {
  const status = stats.avgConnection < 2.0 ? '❌ BELOW' : '✅ OK';
  if (stats.avgConnection < 2.0) {
    belowTarget.push([persona, stats]);
  } else {
    atTarget.push([persona, stats]);
  }

  console.log(
    `${persona.padEnd(42)}${stats.avgConnection.toFixed(2).padStart(5)}${stats.totalConnections.toString().padStart(6)}${stats.uniqueConnections.toString().padStart(7)}  ${status}`
  );
});

console.log('\n' + '='.repeat(100));
console.log('SUMMARY');
console.log('='.repeat(100));
console.log(`Below target (avg < 2.0): ${belowTarget.length} personas`);
console.log(`At target (avg >= 2.0):   ${atTarget.length} personas`);

const globalAvg = sorted.reduce((sum, [_, stats]) => sum + stats.avgConnection, 0) / sorted.length;
console.log(`\nGlobal average connection: ${globalAvg.toFixed(2)}`);

// Detailed analysis for below-target personas
console.log('\n\n' + '='.repeat(100));
console.log('DETAILED ANALYSIS: PERSONAS BELOW TARGET');
console.log('='.repeat(100));

belowTarget.forEach(([persona, stats]) => {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`${persona}`);
  console.log(`${'='.repeat(100)}`);
  console.log(`Current average: ${stats.avgConnection.toFixed(2)} | Target: 2.00 | Gap: ${(2.0 - stats.avgConnection).toFixed(2)}`);
  console.log(`Total connections: ${stats.totalConnections} | Unique partners: ${stats.uniqueConnections}`);
  console.log(`Never connected with: ${stats.neverConnected} personas`);

  // Find current appearances
  const appearances = allSpaces.filter(space =>
    space.target_groups.includes(persona)
  );

  console.log(`\nCurrently appears in: ${appearances.length} amenities`);

  // Calculate what's needed
  const currentTotal = stats.totalConnections;
  const currentUnique = stats.uniqueConnections;

  // To reach avg of 2.0: total / unique = 2.0
  // So total needed = unique * 2.0
  const targetTotal = currentUnique * 2.0;
  const additionalNeeded = Math.ceil(targetTotal - currentTotal);

  console.log(`\n📈 TO REACH 2.0 AVERAGE:`);
  console.log(`   Need ${additionalNeeded} additional connections`);
  console.log(`   This means: Add to ~${Math.ceil(additionalNeeded / 4)} more amenities (assuming 4 new connections per amenity)`);

  // Find best partners (personas they already connect with weakly)
  const weakConnections = [];
  personas.forEach(other => {
    if (other !== persona && matrix[persona][other] > 0 && matrix[persona][other] <= 2) {
      weakConnections.push({
        partner: other,
        count: matrix[persona][other]
      });
    }
  });

  if (weakConnections.length > 0) {
    console.log(`\n🔗 STRENGTHEN EXISTING WEAK CONNECTIONS (currently 1-2x):`);
    weakConnections.sort((a, b) => a.count - b.count).slice(0, 10).forEach(c => {
      console.log(`   ${c.partner.padEnd(40)} (currently ${c.count}x)`);
    });
  }

  // Find never-connected personas (new connection opportunities)
  const neverConnected = [];
  personas.forEach(other => {
    if (other !== persona && matrix[persona][other] === 0) {
      neverConnected.push(other);
    }
  });

  if (neverConnected.length > 0) {
    console.log(`\n🆕 NEVER-CONNECTED PERSONAS (${neverConnected.length} total):`);
    neverConnected.slice(0, 10).forEach(p => {
      console.log(`   ${p}`);
    });
  }
});

// Generate recommendations
console.log('\n\n' + '='.repeat(100));
console.log('STRATEGIC RECOMMENDATIONS');
console.log('='.repeat(100));

console.log(`\n🎯 PRIORITY ORDER (fix these first):\n`);

belowTarget.forEach(([persona, stats], index) => {
  const additionalNeeded = Math.ceil((stats.uniqueConnections * 2.0) - stats.totalConnections);
  const amenitiesNeeded = Math.ceil(additionalNeeded / 4);

  console.log(`${(index + 1).toString().padStart(2)}. ${persona.padEnd(42)} +${amenitiesNeeded} amenities needed`);
});

console.log(`\n\n💡 TWO STRATEGIES TO BOOST AVERAGE CONNECTIONS:\n`);

console.log(`STRATEGY 1: Strengthen Existing Connections`);
console.log(`   - Add persona to amenities with personas they already connect with (but weakly)`);
console.log(`   - This deepens existing relationships`);
console.log(`   - Faster to implement (fewer new combinations)`);
console.log(`   - Better for creating "familiar clusters"`);

console.log(`\nSTRATEGY 2: Create New Connections`);
console.log(`   - Add persona to amenities with never-connected personas`);
console.log(`   - This increases network diversity`);
console.log(`   - Creates cross-cluster mixing`);
console.log(`   - Better for overall graph balance`);

console.log(`\n📊 RECOMMENDED MIX: 70% Strategy 1 + 30% Strategy 2`);
console.log(`   - Most additions strengthen existing weak connections (1→3 or 2→4)`);
console.log(`   - Some additions create new bridges across clusters`);

// Calculate total work needed
const totalAdditionalAmenities = belowTarget.reduce((sum, [_, stats]) => {
  const additionalNeeded = Math.ceil((stats.uniqueConnections * 2.0) - stats.totalConnections);
  return sum + Math.ceil(additionalNeeded / 4);
}, 0);

console.log(`\n\n📋 TOTAL WORK ESTIMATE:`);
console.log(`   ${belowTarget.length} personas need boosting`);
console.log(`   ~${totalAdditionalAmenities} total amenity additions/swaps needed`);
console.log(`   Average: ${(totalAdditionalAmenities / belowTarget.length).toFixed(1)} amenities per persona`);
