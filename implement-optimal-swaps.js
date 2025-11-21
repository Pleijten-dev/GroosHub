const fs = require('fs');

// Read current state
const communal = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));

// Read swaps to implement
const swaps = JSON.parse(fs.readFileSync('/home/user/GroosHub/swaps-to-implement.json', 'utf8'));

console.log('='.repeat(80));
console.log('IMPLEMENTING 27 SWAPS');
console.log('='.repeat(80));

let communalSwaps = 0;
let publicSwaps = 0;

swaps.forEach((swap, i) => {
  console.log(`\n${i + 1}. ${swap.name}`);
  console.log(`   Remove: ${swap.remove} → Add: ${swap.add}`);

  const spaces = swap.file === 'communal' ? communal.nl.spaces : publicSpaces.nl.spaces;
  const space = spaces.find(s => s.name === swap.name);

  if (!space) {
    console.log(`   ❌ ERROR: Space not found!`);
    return;
  }

  // Filter out universal target group for processing
  const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');

  // Check current state
  const hasRemove = groups.includes(swap.remove);
  const hasAdd = groups.includes(swap.add);

  if (hasAdd) {
    console.log(`   ⚠️  Already has ${swap.add} - skipping add`);
  }
  if (!hasRemove) {
    console.log(`   ⚠️  Does not have ${swap.remove} - skipping remove`);
  }

  // Perform swap
  if (hasRemove && !hasAdd) {
    const removeIdx = space.target_groups.indexOf(swap.remove);
    space.target_groups.splice(removeIdx, 1);
    space.target_groups.push(swap.add);
    console.log(`   ✅ Swap completed`);

    if (swap.file === 'communal') {
      communalSwaps++;
    } else {
      publicSwaps++;
    }
  }

  // Verify count
  const finalGroups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');
  if (finalGroups.length !== 5) {
    console.log(`   ⚠️  WARNING: Space now has ${finalGroups.length} personas (expected 5)`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('SAVING CHANGES');
console.log('='.repeat(80));

// Save communal spaces
fs.writeFileSync(
  '/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json',
  JSON.stringify(communal, null, 2)
);
console.log(`✅ Saved communal-spaces.json (${communalSwaps} swaps)`);

// Save public spaces
fs.writeFileSync(
  '/home/user/GroosHub/src/features/location/data/sources/public-spaces.json',
  JSON.stringify(publicSpaces, null, 2)
);
console.log(`✅ Saved public-spaces.json (${publicSwaps} swaps)`);

console.log('\n' + '='.repeat(80));
console.log(`TOTAL SWAPS APPLIED: ${communalSwaps + publicSwaps}`);
console.log('='.repeat(80));

// Verify all spaces have exactly 5 personas
console.log('\nVERIFYING PERSONA COUNTS...\n');

let issues = 0;
const allSpaces = [...communal.nl.spaces, ...publicSpaces.nl.spaces];

allSpaces.forEach(space => {
  const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');
  if (groups.length !== 5) {
    console.log(`❌ ${space.name}: ${groups.length} personas`);
    console.log(`   Current: ${groups.join(', ')}`);
    issues++;
  }
});

if (issues === 0) {
  console.log('✅ All spaces have exactly 5 personas');
} else {
  console.log(`\n⚠️  Found ${issues} spaces with incorrect persona count`);
}

console.log('\n' + '='.repeat(80));
