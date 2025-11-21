const fs = require('fs');

// Read current state
const communal = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));

// Read swaps
const swaps = JSON.parse(fs.readFileSync('/home/user/GroosHub/final-balance-swaps.json', 'utf8'));

console.log('='.repeat(80));
console.log('APPLYING FINAL BALANCE ADJUSTMENT (8 SWAPS)');
console.log('='.repeat(80));

let swapsApplied = 0;

swaps.forEach((swap, i) => {
  console.log(`\n${i + 1}. ${swap.name}`);
  console.log(`   Remove: ${swap.remove} → Add: ${swap.add}`);

  const spaces = swap.file === 'communal' ? communal.nl.spaces : publicSpaces.nl.spaces;
  const space = spaces.find(s => s.name === swap.name);

  if (!space) {
    console.log(`   ❌ ERROR: Space not found!`);
    return;
  }

  const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');

  const hasRemove = groups.includes(swap.remove);
  const hasAdd = groups.includes(swap.add);

  if (hasAdd) {
    console.log(`   ⚠️  Already has ${swap.add}`);
  }
  if (!hasRemove) {
    console.log(`   ⚠️  Does not have ${swap.remove}`);
  }

  if (hasRemove && !hasAdd) {
    const removeIdx = space.target_groups.indexOf(swap.remove);
    space.target_groups.splice(removeIdx, 1);
    space.target_groups.push(swap.add);
    console.log(`   ✅ Swap completed`);
    swapsApplied++;
  }

  const finalGroups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');
  if (finalGroups.length !== 5) {
    console.log(`   ⚠️  WARNING: Space now has ${finalGroups.length} personas`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('SAVING CHANGES');
console.log('='.repeat(80));

// Save
fs.writeFileSync(
  '/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json',
  JSON.stringify(communal, null, 2)
);

fs.writeFileSync(
  '/home/user/GroosHub/src/features/location/data/sources/public-spaces.json',
  JSON.stringify(publicSpaces, null, 2)
);

console.log(`✅ Saved all files (${swapsApplied} swaps applied)`);

console.log('\n' + '='.repeat(80));
console.log('ALL DONE! 🎉');
console.log('='.repeat(80));
console.log('\nTotal swaps in this session: 27 + 8 = 35 swaps');
console.log('\nExpected final state:');
console.log('  - All 27 personas: 52-76 connections (2.0-2.9 avg)');
console.log('  - Connection ratio: 1.46x (well under 2.0x target)');
console.log('  - No persona below 2.0 average ✅');
console.log('\n' + '='.repeat(80));
