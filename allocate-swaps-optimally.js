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
  'Welvarende Bourgondiërs',  // 84 (can afford to lose 16+ connections)
  'Carrière Stampers',         // 76 (can lose 12+ connections)
  'De Levensgenieters',        // 76 (can lose 12+ connections)
  'Gezellige Nesthouders',     // 76 (can lose 12+ connections)
  'Actieve Jonge Gezinnen',    // 72 (can lose 10+ connections)
  'Succesvolle Singles',       // 64 (can lose 6+ connections)
  'Vermogende Gezinnen'        // 60 (can lose 4+ connections)
];

console.log('='.repeat(80));
console.log('OPTIMAL SWAP ALLOCATION');
console.log('='.repeat(80));
console.log('\nUsing greedy allocation to ensure each amenity is used only once\n');

const allocatedSwaps = [];
const usedAmenities = new Set();

// For each persona (in priority order)
targetPersonas.forEach(target => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${target.name}: needs ${target.adds} amenities`);
  console.log('='.repeat(80));

  // Find amenities this persona is NOT in
  const candidateSpaces = allSpaces.filter(space => {
    const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');
    return !groups.includes(target.name) && !usedAmenities.has(space.name);
  });

  // Score each candidate
  const scored = candidateSpaces.map(space => {
    const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');

    let score = 0;
    let reasons = [];

    // Prefer spaces with overconnected personas to remove
    const overconnectedInSpace = groups.filter(g => overconnected.includes(g));
    score += overconnectedInSpace.length * 20;
    if (overconnectedInSpace.length > 0) {
      reasons.push(`${overconnectedInSpace.length} overconnected personas`);
    }

    // Get persona info
    const targetInfo = personas.nl.housing_personas.find(p => p.name === target.name);
    const targetIncome = targetInfo.income_level;
    const targetAge = targetInfo.age_group;
    const targetHousehold = targetInfo.household_type;

    // Income fit
    if (space.category === 'praktisch' && targetIncome === 'Laag inkomen') {
      score += 10;
      reasons.push('Budget space for low income');
    }
    if (space.category === 'cultuur' && targetIncome === 'Hoog inkomen') {
      score += 10;
      reasons.push('Cultural space for high income');
    }

    // Age fit
    if (targetAge && targetAge.includes('55+') && space.category === 'gezondheid') {
      score += 10;
      reasons.push('Health space for seniors');
    }
    if (targetAge && targetAge.includes('18-35') && space.category === 'werk') {
      score += 10;
      reasons.push('Work space for young professionals');
    }

    // Household fit
    if (targetHousehold && targetHousehold.includes('kinderen') && space.category === 'kinderen') {
      score += 10;
      reasons.push('Family space for households with children');
    }

    // Prefer communal over public (more flexibility)
    if (space.file === 'communal') {
      score += 5;
    }

    return {
      space: space.name,
      file: space.file,
      category: space.category,
      currentPersonas: groups,
      overconnectedInSpace,
      score,
      reasons
    };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Allocate top N amenities for this persona
  const allocated = scored.slice(0, target.adds);

  allocated.forEach((rec, i) => {
    // Mark amenity as used
    usedAmenities.add(rec.space);

    // Choose best removal candidate
    let removalCandidate;
    if (rec.overconnectedInSpace.length > 0) {
      // Remove most overconnected
      removalCandidate = rec.overconnectedInSpace.sort((a, b) => {
        const aIdx = overconnected.indexOf(a);
        const bIdx = overconnected.indexOf(b);
        return aIdx - bIdx; // Earlier in list = more overconnected
      })[0];
    } else {
      // Remove first persona (arbitrary - could improve)
      removalCandidate = rec.currentPersonas[0];
    }

    allocatedSwaps.push({
      persona: target.name,
      space: rec.space,
      file: rec.file,
      category: rec.category,
      remove: removalCandidate,
      score: rec.score,
      reasons: rec.reasons
    });

    console.log(`\n✅ Swap ${i + 1}/${target.adds}:`);
    console.log(`   Amenity: ${rec.space} (${rec.file}, ${rec.category})`);
    console.log(`   Remove: ${removalCandidate}`);
    console.log(`   Add: ${target.name}`);
    if (rec.reasons.length > 0) {
      console.log(`   Fit: ${rec.reasons.join(', ')}`);
    }
    console.log(`   Score: ${rec.score}`);
  });
});

// Summary
console.log('\n\n' + '='.repeat(80));
console.log('COMPLETE SWAP LIST (27 SWAPS)');
console.log('='.repeat(80));
console.log('\nCopy-paste ready format:\n');

allocatedSwaps.forEach((swap, i) => {
  console.log(`${i + 1}. ${swap.space} (${swap.file})`);
  console.log(`   Remove: ${swap.remove}`);
  console.log(`   Add: ${swap.persona}`);
  console.log('');
});

// Export for implementation script
const implementationScript = allocatedSwaps.map(swap => ({
  file: swap.file,
  name: swap.space,
  remove: swap.remove,
  add: swap.persona
}));

fs.writeFileSync(
  '/home/user/GroosHub/swaps-to-implement.json',
  JSON.stringify(implementationScript, null, 2)
);

console.log('='.repeat(80));
console.log('✅ Swaps saved to: swaps-to-implement.json');
console.log('='.repeat(80));

// Impact analysis
console.log('\n\n' + '='.repeat(80));
console.log('EXPECTED IMPACT');
console.log('='.repeat(80));

const impactByPersona = {};

// Calculate expected connections for added personas
allocatedSwaps.forEach(swap => {
  if (!impactByPersona[swap.persona]) {
    const target = targetPersonas.find(p => p.name === swap.persona);
    impactByPersona[swap.persona] = {
      before: target.current,
      swaps: 0,
      after: target.current
    };
  }
  impactByPersona[swap.persona].swaps++;
  impactByPersona[swap.persona].after += 4; // Each amenity adds 4 connections
});

// Calculate expected connections for removed personas
allocatedSwaps.forEach(swap => {
  if (!impactByPersona[swap.remove]) {
    impactByPersona[swap.remove] = {
      before: 'TBD',
      swaps: 0,
      after: 'TBD'
    };
  }
  if (typeof impactByPersona[swap.remove].before === 'number') {
    impactByPersona[swap.remove].after -= 4;
  }
  impactByPersona[swap.remove].swaps--;
});

console.log('\nPersonas GAINING connections:');
Object.entries(impactByPersona)
  .filter(([_, data]) => data.swaps > 0)
  .sort((a, b) => b[1].swaps - a[1].swaps)
  .forEach(([persona, data]) => {
    const avgBefore = (data.before / 26).toFixed(1);
    const avgAfter = (data.after / 26).toFixed(1);
    console.log(`  ${persona}: ${data.before} → ${data.after} (${avgBefore} → ${avgAfter} avg) [+${data.swaps} amenities]`);
  });

console.log('\nPersonas LOSING connections:');
Object.entries(impactByPersona)
  .filter(([_, data]) => data.swaps < 0)
  .sort((a, b) => a[1].swaps - b[1].swaps)
  .forEach(([persona, data]) => {
    console.log(`  ${persona}: ${data.swaps} amenities removed`);
  });

console.log('\n' + '='.repeat(80));
