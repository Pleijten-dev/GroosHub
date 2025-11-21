const fs = require('fs');

const communal = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));
const personas = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/housing-personas.json', 'utf8'));

const allSpaces = [
  ...communal.nl.spaces.map(s => ({ ...s, file: 'communal' })),
  ...publicSpaces.nl.spaces.map(s => ({ ...s, file: 'public' }))
];

// Personas needing boosts (sorted by urgency)
const targetPersonas = [
  { name: 'Laat Bloeiers', current: 36, needed: 16, adds: 4 },
  { name: 'Carrièrestarter', current: 36, needed: 16, adds: 4 },
  { name: 'Samen Starters', current: 40, needed: 12, adds: 3 },
  { name: 'Stabiele Gezinnen', current: 40, needed: 12, adds: 3 },
  { name: 'Bescheiden Stellen', current: 44, needed: 8, adds: 2 },
  { name: 'Grenzeloos Duo', current: 44, needed: 8, adds: 2 },
  { name: 'Jonge Starters', current: 44, needed: 8, adds: 2 },
  { name: 'Knusse Gezinnen', current: 44, needed: 8, adds: 2 },
  { name: 'De Balanszoekers', current: 48, needed: 4, adds: 1 },
  { name: 'De Groeiers', current: 48, needed: 4, adds: 1 },
  { name: 'De Groeigezinnen', current: 48, needed: 4, adds: 1 },
  { name: 'De Zwitserlevers', current: 48, needed: 4, adds: 1 },
  { name: 'Zelfbewuste Solisten', current: 48, needed: 4, adds: 1 }
];

// Personas to potentially remove from (overconnected)
const overconnected = [
  'Welvarende Bourgondiërs',  // 84
  'Carrière Stampers',         // 76
  'De Levensgenieters',        // 76
  'Gezellige Nesthouders',     // 76
  'Actieve Jonge Gezinnen',    // 72
  'Succesvolle Singles',       // 64
  'Vermogende Gezinnen'        // 60
];

console.log('='.repeat(80));
console.log('TARGETED SWAP RECOMMENDATIONS TO REACH 2.0 AVERAGE');
console.log('='.repeat(80));
console.log('\nGoal: Get all 13 underconnected personas to 52+ total connections (2.0 avg)\n');

const recommendations = [];

targetPersonas.forEach(target => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${target.name.toUpperCase()}`);
  console.log(`Current: ${target.current} connections (${(target.current/26).toFixed(1)} avg)`);
  console.log(`Target: 52 connections (2.0 avg)`);
  console.log(`Needs: ${target.needed} more connections = ${target.adds} amenity additions`);
  console.log('='.repeat(80));

  // Find amenities this persona is NOT in
  const notInSpaces = allSpaces.filter(space => {
    const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');
    return !groups.includes(target.name);
  });

  // Score each potential addition
  const scored = notInSpaces.map(space => {
    const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');

    let score = 0;
    let reasons = [];

    // Prefer spaces with overconnected personas to remove
    const overconnectedCount = groups.filter(g => overconnected.includes(g)).length;
    score += overconnectedCount * 10;
    if (overconnectedCount > 0) {
      reasons.push(`${overconnectedCount} overconnected personas available for removal`);
    }

    // Get persona info
    const targetInfo = personas.nl.housing_personas.find(p => p.name === target.name);

    // Check fit with space
    const categoryFit = {
      'praktisch': ['Laag inkomen', 'Middeninkomen'],
      'sociaal': ['all'],
      'gezondheid': ['Senior', '55+', '65+'],
      'werk': ['Werkend', 'Carrière', 'Ambitieus'],
      'kinderen': ['met kinderen', 'Jonge gezinnen'],
      'cultuur': ['Hoog inkomen', 'Welvarend'],
      'recreatie': ['all']
    };

    const targetIncome = targetInfo.income_level;
    const targetAge = targetInfo.age_group;
    const targetHousehold = targetInfo.household_type;

    // Income fit
    if (space.category === 'praktisch' && targetIncome === 'Laag inkomen') {
      score += 5;
      reasons.push('Budget-focused space matches low income');
    }
    if (space.category === 'cultuur' && targetIncome === 'Hoog inkomen') {
      score += 5;
      reasons.push('Cultural space matches high income');
    }

    // Age fit
    if (space.category === 'gezondheid' && targetAge.includes('55+')) {
      score += 5;
      reasons.push('Health space matches senior age');
    }
    if (space.category === 'kinderen' && targetHousehold.includes('kinderen')) {
      score += 5;
      reasons.push('Family space matches household with children');
    }

    // Work fit
    if (space.category === 'werk' && (target.name.includes('Carrière') || target.name.includes('Starter'))) {
      score += 5;
      reasons.push('Work space matches career-focused persona');
    }

    return {
      space: space.name,
      file: space.file,
      category: space.category,
      currentPersonas: groups,
      score,
      reasons
    };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Show top recommendations
  console.log(`\nTop ${target.adds} Recommended Additions:\n`);

  scored.slice(0, target.adds * 2).forEach((rec, i) => {
    if (i < target.adds) {
      console.log(`✅ PRIORITY ${i + 1}:`);
    } else {
      console.log(`\n📋 ALTERNATIVE ${i - target.adds + 1}:`);
    }

    console.log(`   Space: ${rec.space} (${rec.file}, ${rec.category})`);
    console.log(`   Current personas: ${rec.currentPersonas.join(', ')}`);

    // Suggest removal candidates
    const removalCandidates = rec.currentPersonas
      .filter(p => overconnected.includes(p))
      .sort((a, b) => {
        const aConn = getConnectionCount(a);
        const bConn = getConnectionCount(b);
        return bConn - aConn;
      });

    if (removalCandidates.length > 0) {
      console.log(`   ⚠️  Suggest removing: ${removalCandidates[0]} (overconnected)`);
      recommendations.push({
        persona: target.name,
        space: rec.space,
        file: rec.file,
        remove: removalCandidates[0],
        priority: i < target.adds ? 'HIGH' : 'MEDIUM'
      });
    } else {
      console.log(`   ⚠️  Suggest removing: ${rec.currentPersonas[0]} (least connections in group)`);
      recommendations.push({
        persona: target.name,
        space: rec.space,
        file: rec.file,
        remove: rec.currentPersonas[0],
        priority: i < target.adds ? 'HIGH' : 'MEDIUM'
      });
    }

    if (rec.reasons.length > 0) {
      console.log(`   Reasoning: ${rec.reasons.join('; ')}`);
    }
    console.log(`   Match score: ${rec.score}`);
  });
});

function getConnectionCount(personaName) {
  const connections = allSpaces.reduce((count, space) => {
    const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');
    if (groups.includes(personaName)) {
      return count + (groups.length - 1);
    }
    return count;
  }, 0);
  return connections;
}

// Summary
console.log('\n\n' + '='.repeat(80));
console.log('SUMMARY - SWAPS TO IMPLEMENT');
console.log('='.repeat(80));

const highPriority = recommendations.filter(r => r.priority === 'HIGH');
console.log(`\nTotal high-priority swaps: ${highPriority.length}`);
console.log(`Total recommendations: ${recommendations.length}\n`);

// Group by persona
targetPersonas.forEach(target => {
  const personaSwaps = recommendations.filter(r => r.persona === target.name && r.priority === 'HIGH');
  if (personaSwaps.length > 0) {
    console.log(`\n${target.name}: ${personaSwaps.length} swaps`);
    personaSwaps.forEach((swap, i) => {
      console.log(`  ${i + 1}. ${swap.space}: Remove ${swap.remove}, Add ${swap.persona}`);
    });
  }
});

console.log('\n' + '='.repeat(80));
