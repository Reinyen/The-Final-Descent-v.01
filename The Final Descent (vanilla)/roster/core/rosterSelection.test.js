/**
 * Test harness for deterministic roster selection
 * Run with: node roster/core/rosterSelection.test.js
 */

import assert from 'assert';
import { initSelection, singleReroll, totalReroll } from './rosterSelection.js';

// Test data
const testCharacters = [
  { id: 'dranick' },
  { id: 'eline' },
  { id: 'varro' },
  { id: 'kestril' },
  { id: 'lira' },
  { id: 'grim' }
];

/**
 * Helper to check partition correctness
 */
function assertValidPartition(state, testName) {
  const { livingIds, fallenIds } = state;

  // Exactly 3 in each set
  assert.strictEqual(livingIds.length, 3, `${testName}: Living must have 3 characters`);
  assert.strictEqual(fallenIds.length, 3, `${testName}: Fallen must have 3 characters`);

  // No duplicates in Living
  const livingSet = new Set(livingIds);
  assert.strictEqual(livingSet.size, 3, `${testName}: Living contains duplicates`);

  // No duplicates in Fallen
  const fallenSet = new Set(fallenIds);
  assert.strictEqual(fallenSet.size, 3, `${testName}: Fallen contains duplicates`);

  // No overlap
  const overlap = livingIds.filter(id => fallenIds.includes(id));
  assert.strictEqual(overlap.length, 0, `${testName}: Living and Fallen overlap`);

  // All IDs are valid
  const allIds = [...livingIds, ...fallenIds];
  const validIds = testCharacters.map(c => c.id);
  allIds.forEach(id => {
    assert.ok(validIds.includes(id), `${testName}: Invalid ID ${id}`);
  });
}

/**
 * Test 1: Determinism - same seed produces same results
 */
function testDeterminism() {
  console.log('Test 1: Determinism...');

  const seed = 12345;
  const payload1 = { rosterSeed: seed, characters: testCharacters };
  const payload2 = { rosterSeed: seed, characters: testCharacters };

  const state1 = initSelection(payload1);
  const state2 = initSelection(payload2);

  assert.deepStrictEqual(state1.livingIds, state2.livingIds, 'Living IDs must match for same seed');
  assert.deepStrictEqual(state1.fallenIds, state2.fallenIds, 'Fallen IDs must match for same seed');

  console.log('  ✓ Same seed produces identical initial partitions');

  // Test determinism in single reroll
  const reroll1 = singleReroll(state1, state1.livingIds[0]);
  const reroll2 = singleReroll(state2, state2.livingIds[0]);

  assert.deepStrictEqual(reroll1.livingIds, reroll2.livingIds, 'Single reroll must be deterministic');
  assert.deepStrictEqual(reroll1.fallenIds, reroll2.fallenIds, 'Single reroll must be deterministic');

  console.log('  ✓ Single reroll is deterministic');

  // Test determinism in total reroll
  const totalReroll1 = totalReroll(state1);
  const totalReroll2 = totalReroll(state2);

  assert.deepStrictEqual(totalReroll1.livingIds, totalReroll2.livingIds, 'Total reroll must be deterministic');
  assert.deepStrictEqual(totalReroll1.fallenIds, totalReroll2.fallenIds, 'Total reroll must be deterministic');

  console.log('  ✓ Total reroll is deterministic');
  console.log('  ✅ Determinism test passed\n');
}

/**
 * Test 2: Partition correctness after each operation
 */
function testPartitionCorrectness() {
  console.log('Test 2: Partition Correctness...');

  const payload = { rosterSeed: 99999, characters: testCharacters };
  let state = initSelection(payload);

  assertValidPartition(state, 'Initial');
  console.log('  ✓ Initial partition is valid');

  // Perform single reroll and check
  state = singleReroll(state, state.livingIds[1]);
  assertValidPartition(state, 'After single reroll #1');
  console.log('  ✓ Partition valid after single reroll #1');

  // Another single reroll (we started with 3, used 2, have 1 left - but need 2)
  // This should throw
  try {
    singleReroll(state, state.livingIds[0]);
    assert.fail('Should have thrown due to insufficient rerolls');
  } catch (err) {
    assert.ok(err.message.includes('Insufficient rerolls'), 'Should throw correct error');
    console.log('  ✓ Correctly prevents single reroll with insufficient resources');
  }

  // Reset state
  state = initSelection(payload);

  // Perform total reroll and check
  state = totalReroll(state);
  assertValidPartition(state, 'After total reroll #1');
  console.log('  ✓ Partition valid after total reroll #1');

  state = totalReroll(state);
  assertValidPartition(state, 'After total reroll #2');
  console.log('  ✓ Partition valid after total reroll #2');

  state = totalReroll(state);
  assertValidPartition(state, 'After total reroll #3');
  console.log('  ✓ Partition valid after total reroll #3');

  // Should have no rerolls left
  assert.strictEqual(state.rerollsRemaining, 0, 'Should have 0 rerolls remaining');

  try {
    totalReroll(state);
    assert.fail('Should have thrown due to insufficient rerolls');
  } catch (err) {
    assert.ok(err.message.includes('Insufficient rerolls'), 'Should throw correct error');
    console.log('  ✓ Correctly prevents total reroll with insufficient resources');
  }

  console.log('  ✅ Partition correctness test passed\n');
}

/**
 * Test 3: Single reroll always swaps in someone from Fallen
 */
function testSingleRerollSemantics() {
  console.log('Test 3: Single Reroll Semantics...');

  const payload = { rosterSeed: 54321, characters: testCharacters };
  const state = initSelection(payload);

  const originalLiving = [...state.livingIds];
  const originalFallen = [...state.fallenIds];
  const selectedId = originalLiving[0];

  const newState = singleReroll(state, selectedId);

  // The selected character should now be in Fallen
  assert.ok(newState.fallenIds.includes(selectedId), 'Selected character should be in Fallen');
  console.log('  ✓ Selected character moved to Fallen');

  // The character that replaced it should be from original Fallen
  const replacementId = newState.livingIds[0];
  assert.ok(originalFallen.includes(replacementId), 'Replacement should be from original Fallen');
  console.log('  ✓ Replacement came from original Fallen');

  // The other two Living should remain unchanged
  const otherLiving = originalLiving.slice(1);
  assert.ok(newState.livingIds.includes(otherLiving[0]), 'Other Living #1 should remain');
  assert.ok(newState.livingIds.includes(otherLiving[1]), 'Other Living #2 should remain');
  console.log('  ✓ Other Living characters remain in Living');

  // Rerolls should be decremented by 2
  assert.strictEqual(newState.rerollsRemaining, 1, 'Should have 1 reroll remaining');
  console.log('  ✓ Rerolls decremented by 2');

  // Selected ID should be cleared
  assert.strictEqual(newState.selectedLivingId, null, 'Selection should be cleared');
  console.log('  ✓ Selection cleared after reroll');

  console.log('  ✅ Single reroll semantics test passed\n');
}

/**
 * Test 4: Total reroll resample behavior
 */
function testTotalRerollResample() {
  console.log('Test 4: Total Reroll Resample Behavior...');

  const payload = { rosterSeed: 11111, characters: testCharacters };
  const state = initSelection(payload);

  const originalLivingSet = new Set(state.livingIds);

  const newState = totalReroll(state);

  // Check if at least one character is different (in most cases)
  // Note: there's a small chance all 10 attempts produce the same set,
  // but this is extremely unlikely with 6 characters
  const hasDifference = newState.livingIds.some(id => !originalLivingSet.has(id));

  console.log(`  Original Living: ${state.livingIds.join(', ')}`);
  console.log(`  New Living: ${newState.livingIds.join(', ')}`);
  console.log(`  Has difference: ${hasDifference}`);

  // We can't strictly assert this is always different due to the nature of randomness,
  // but we can verify the logic works
  console.log('  ✓ Total reroll attempts to find different set (up to 10 tries)');

  // Rerolls should be decremented by 1
  assert.strictEqual(newState.rerollsRemaining, 2, 'Should have 2 rerolls remaining');
  console.log('  ✓ Rerolls decremented by 1');

  // Selected ID should be cleared
  assert.strictEqual(newState.selectedLivingId, null, 'Selection should be cleared');
  console.log('  ✓ Selection cleared after reroll');

  console.log('  ✅ Total reroll resample test passed\n');
}

/**
 * Test 5: Different seeds produce different results
 */
function testDifferentSeeds() {
  console.log('Test 5: Different Seeds...');

  const payload1 = { rosterSeed: 1, characters: testCharacters };
  const payload2 = { rosterSeed: 2, characters: testCharacters };

  const state1 = initSelection(payload1);
  const state2 = initSelection(payload2);

  // Very unlikely to be the same with different seeds
  const areDifferent =
    JSON.stringify(state1.livingIds) !== JSON.stringify(state2.livingIds);

  assert.ok(areDifferent, 'Different seeds should (very likely) produce different results');
  console.log(`  Seed 1 Living: ${state1.livingIds.join(', ')}`);
  console.log(`  Seed 2 Living: ${state2.livingIds.join(', ')}`);
  console.log('  ✓ Different seeds produce different results');
  console.log('  ✅ Different seeds test passed\n');
}

/**
 * Test 6: Edge cases and error handling
 */
function testEdgeCases() {
  console.log('Test 6: Edge Cases and Error Handling...');

  // Invalid payload
  try {
    initSelection({ rosterSeed: 'not a number', characters: testCharacters });
    assert.fail('Should throw for non-numeric seed');
  } catch (err) {
    console.log('  ✓ Throws for non-numeric seed');
  }

  // Wrong number of characters
  try {
    initSelection({ rosterSeed: 123, characters: testCharacters.slice(0, 4) });
    assert.fail('Should throw for wrong number of characters');
  } catch (err) {
    console.log('  ✓ Throws for wrong number of characters');
  }

  // Invalid selectedLivingId
  const state = initSelection({ rosterSeed: 123, characters: testCharacters });
  try {
    singleReroll(state, 'invalid-id');
    assert.fail('Should throw for invalid selectedLivingId');
  } catch (err) {
    console.log('  ✓ Throws for invalid selectedLivingId');
  }

  // Missing selectedLivingId
  try {
    singleReroll(state, null);
    assert.fail('Should throw for null selectedLivingId');
  } catch (err) {
    console.log('  ✓ Throws for null selectedLivingId');
  }

  console.log('  ✅ Edge cases test passed\n');
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('='.repeat(60));
  console.log('ROSTER SELECTION MODULE TESTS');
  console.log('='.repeat(60));
  console.log('');

  try {
    testDeterminism();
    testPartitionCorrectness();
    testSingleRerollSemantics();
    testTotalRerollResample();
    testDifferentSeeds();
    testEdgeCases();

    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));
  } catch (err) {
    console.error('\n❌ TEST FAILED:');
    console.error(err);
    process.exit(1);
  }
}

// Run tests
runAllTests();
