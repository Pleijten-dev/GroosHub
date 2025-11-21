const fs = require('fs');

// Read the JSON files
const communalSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));
const personas = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/housing-personas.json', 'utf8'));

// Combine all spaces
const allSpaces = [
  ...communalSpaces.nl.spaces,
  ...publicSpaces.nl.spaces
];

// Create persona lookup
const personaLookup = {};
personas.nl.housing_personas.forEach(p => {
  personaLookup[p.name] = p;
});

// Underused personas (less than 11)
const underused = {
  'De Groeiers': {
    count: 5,
    profile: personaLookup['De Groeiers'],
    targetCount: 15,
    recommendations: []
  },
  'Ambitieuze Singles': {
    count: 7,
    profile: personaLookup['Ambitieuze Singles'],
    targetCount: 15,
    recommendations: []
  },
  'Senioren met Thuiswonende Kinderen': {
    count: 8,
    profile: personaLookup['Senioren met Thuiswonende Kinderen'],
    targetCount: 15,
    recommendations: []
  },
  'De Doorzetter': {
    count: 10,
    profile: personaLookup['De Doorzetter'],
    targetCount: 15,
    recommendations: []
  }
};

// Function to analyze fit and suggest removal
function analyzeSwap(space, personaToAdd, personaInfo) {
  const currentPersonas = space.target_groups || [];

  // Skip if already has this persona or is universal
  if (currentPersonas.includes(personaToAdd) || currentPersonas.includes('geschikt voor elke doelgroep')) {
    return null;
  }

  // Analyze each current persona for removal suitability
  const removalCandidates = currentPersonas.map(currentPersona => {
    const currentInfo = personaLookup[currentPersona];
    let unsuitabilityScore = 0;
    let reasons = [];

    if (!currentInfo) return { persona: currentPersona, score: 0, reasons: ['Unknown persona'] };

    // Category-based analysis
    const category = space.category;

    // Income mismatch
    if (personaInfo.income_level === 'Laag inkomen' && currentInfo.income_level === 'Hoog inkomen') {
      unsuitabilityScore += 2;
      reasons.push('High income less suitable for budget-focused space');
    }

    // Age group analysis
    if (category === 'gezin_en_kindvriendelijk' || category === 'family_and_child_friendly') {
      if (currentInfo.household_type === '1-persoonshuishouden' && personaInfo.household_type === 'met kinderen') {
        unsuitabilityScore += 3;
        reasons.push('Single person vs family-focused space');
      }
    }

    // Senior spaces
    if (space.name.toLowerCase().includes('senior') || space.name.toLowerCase().includes('zorg')) {
      if (currentInfo.age_group === '20-35 jaar' && personaInfo.age_group === '55+ jaar') {
        unsuitabilityScore += 3;
        reasons.push('Young adult less suitable than senior');
      }
    }

    // Work/career spaces
    if (category === 'werken_en_creeren' || category === 'work_and_create') {
      if (currentInfo.age_group === '55+ jaar' && !currentInfo.description.includes('actief')) {
        unsuitabilityScore += 2;
        reasons.push('Retired/older less likely to use workspace');
      }
    }

    // Social/luxury spaces
    if (space.name.includes('Cocktail') || space.name.includes('Champagne') || space.name.includes('Privé')) {
      if (currentInfo.income_level === 'Laag inkomen') {
        unsuitabilityScore += 2;
        reasons.push('Low income less suitable for luxury space');
      }
    }

    // Budget-focused spaces
    if (space.name.includes('Ruilhoek') || space.name.includes('bulkinkopen') || space.name.includes('Budget')) {
      if (currentInfo.income_level === 'Hoog inkomen') {
        unsuitabilityScore += 3;
        reasons.push('High income less likely to use budget/swap space');
      }
    }

    // Fitness/wellness
    if (category === 'sport_en_beweging' || category === 'gezondheid') {
      if (currentInfo.age_group === '55+ jaar' && space.scale === 'grotere_schaal') {
        unsuitabilityScore += 1;
        reasons.push('Large fitness facility may not suit older adults');
      }
    }

    return {
      persona: currentPersona,
      score: unsuitabilityScore,
      reasons: reasons.length > 0 ? reasons : ['General lower priority for removal']
    };
  });

  // Sort by unsuitability score (highest = best to remove)
  removalCandidates.sort((a, b) => b.score - a.score);

  return {
    space: space,
    currentPersonas: currentPersonas,
    removalOptions: removalCandidates.slice(0, 2) // Top 2 candidates for removal
  };
}

// Generate recommendations for each underused persona
console.log('='.repeat(80));
console.log('PERSONA SWAP RECOMMENDATIONS WITH REMOVAL CANDIDATES');
console.log('='.repeat(80));

Object.entries(underused).forEach(([personaName, data]) => {
  const needed = data.targetCount - data.count;

  console.log(`\n\n${'█'.repeat(80)}`);
  console.log(`${personaName.toUpperCase()}`);
  console.log(`${'█'.repeat(80)}`);
  console.log(`Current: ${data.count} | Target: ${data.targetCount} | Need: +${needed}`);
  console.log(`Income: ${data.profile.income_level} | Household: ${data.profile.household_type} | Age: ${data.profile.age_group}`);
  console.log(`\nDescription: ${data.profile.description}\n`);

  // Analyze each space
  const recommendations = [];

  allSpaces.forEach(space => {
    const analysis = analyzeSwap(space, personaName, data.profile);
    if (analysis) {
      recommendations.push(analysis);
    }
  });

  // Sort by best removal candidate score
  recommendations.sort((a, b) => {
    const scoreA = a.removalOptions[0]?.score || 0;
    const scoreB = b.removalOptions[0]?.score || 0;
    return scoreB - scoreA;
  });

  // Show top recommendations
  console.log(`\n📋 TOP ${Math.min(needed + 3, 15)} RECOMMENDED SWAPS:\n`);

  recommendations.slice(0, needed + 3).forEach((rec, index) => {
    console.log(`\n${index + 1}. ${rec.space.name}`);
    console.log(`   Category: ${rec.space.category} | Scale: ${rec.space.scale}`);
    console.log(`   Current personas: ${rec.currentPersonas.join(', ')}`);
    console.log(`\n   ✅ ADD: ${personaName}`);
    console.log(`   ❌ REMOVE OPTIONS (ranked by suitability):`);

    rec.removalOptions.forEach((option, i) => {
      console.log(`      ${i + 1}. ${option.persona} (score: ${option.score})`);
      option.reasons.forEach(reason => {
        console.log(`         → ${reason}`);
      });
    });
  });
});

console.log('\n\n' + '='.repeat(80));
console.log('IMPLEMENTATION SUMMARY');
console.log('='.repeat(80));

Object.entries(underused).forEach(([personaName, data]) => {
  const needed = data.targetCount - data.count;
  console.log(`\n${personaName}: Select ${needed} swaps from recommendations above`);
});

console.log('\n');
