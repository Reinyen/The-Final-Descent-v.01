/**
 * Deterministic Roster Selection Module
 *
 * Provides deterministic roster selection and reroll logic using a seeded PRNG.
 * No DOM or Three.js dependencies - pure logic module.
 */

/**
 * Mulberry32 PRNG - simple, fast, and deterministic
 * Returns a function that generates numbers in [0, 1)
 */
function createPRNG(seed) {
  let state = seed >>> 0; // Ensure 32-bit unsigned integer

  return function() {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using seeded PRNG
 */
function shuffleSeeded(array, rng) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Validate partition invariants
 */
function validatePartition(livingIds, fallenIds, allCharacterIds) {
  if (livingIds.length !== 3) {
    throw new Error(`Living must have exactly 3 characters, got ${livingIds.length}`);
  }
  if (fallenIds.length !== 3) {
    throw new Error(`Fallen must have exactly 3 characters, got ${fallenIds.length}`);
  }

  // Check for duplicates within Living
  const livingSet = new Set(livingIds);
  if (livingSet.size !== 3) {
    throw new Error('Living contains duplicate IDs');
  }

  // Check for duplicates within Fallen
  const fallenSet = new Set(fallenIds);
  if (fallenSet.size !== 3) {
    throw new Error('Fallen contains duplicate IDs');
  }

  // Check for overlap between Living and Fallen
  const overlap = livingIds.filter(id => fallenIds.includes(id));
  if (overlap.length > 0) {
    throw new Error(`Living and Fallen overlap: ${overlap.join(', ')}`);
  }

  // Check that all IDs are valid
  const allIds = [...livingIds, ...fallenIds];
  const invalidIds = allIds.filter(id => !allCharacterIds.includes(id));
  if (invalidIds.length > 0) {
    throw new Error(`Invalid character IDs: ${invalidIds.join(', ')}`);
  }

  return true;
}

/**
 * Initialize roster selection
 *
 * @param {Object} payload - { rosterSeed: number, characters: Array<{id: string}> }
 * @returns {Object} - { livingIds: string[3], fallenIds: string[3], rngState: number }
 */
export function initSelection(payload) {
  if (!payload || typeof payload.rosterSeed !== 'number') {
    throw new Error('payload.rosterSeed must be a number');
  }
  if (!Array.isArray(payload.characters) || payload.characters.length !== 6) {
    throw new Error('payload.characters must be an array of exactly 6 characters');
  }

  const characterIds = payload.characters.map(c => c.id);
  const rng = createPRNG(payload.rosterSeed);

  // Shuffle and partition
  const shuffled = shuffleSeeded(characterIds, rng);
  const livingIds = shuffled.slice(0, 3);
  const fallenIds = shuffled.slice(3, 6);

  validatePartition(livingIds, fallenIds, characterIds);

  return {
    livingIds,
    fallenIds,
    rngState: payload.rosterSeed,
    rerollsRemaining: 3,
    selectedLivingId: null
  };
}

/**
 * Perform a single reroll - swap one Living character with a randomly chosen Fallen
 * Costs 2 rerolls. Throws if insufficient rerolls or invalid selection.
 *
 * @param {Object} state - Current roster state
 * @param {string} selectedLivingId - ID of the Living character to swap out
 * @returns {Object} - New state with updated partition
 */
export function singleReroll(state, selectedLivingId) {
  // Validate preconditions
  if (!state || !Array.isArray(state.livingIds) || !Array.isArray(state.fallenIds)) {
    throw new Error('Invalid state: missing livingIds or fallenIds');
  }
  if (state.rerollsRemaining < 2) {
    throw new Error('Insufficient rerolls for single reroll (requires 2)');
  }
  if (!selectedLivingId) {
    throw new Error('selectedLivingId is required for single reroll');
  }

  const livingIndex = state.livingIds.indexOf(selectedLivingId);
  if (livingIndex === -1) {
    throw new Error(`selectedLivingId "${selectedLivingId}" is not in Living set`);
  }

  // Create RNG from current state
  const rng = createPRNG(state.rngState);

  // Pick a random Fallen character
  const fallenIndex = Math.floor(rng() * state.fallenIds.length);
  const swappedInId = state.fallenIds[fallenIndex];

  // Perform the swap
  const newLivingIds = [...state.livingIds];
  const newFallenIds = [...state.fallenIds];

  newLivingIds[livingIndex] = swappedInId;
  newFallenIds[fallenIndex] = selectedLivingId;

  // Validate the new partition
  const allCharacterIds = [...state.livingIds, ...state.fallenIds];
  validatePartition(newLivingIds, newFallenIds, allCharacterIds);

  // Update RNG state for next operation
  const newRngState = (state.rngState * 1103515245 + 12345) >>> 0;

  return {
    livingIds: newLivingIds,
    fallenIds: newFallenIds,
    rngState: newRngState,
    rerollsRemaining: state.rerollsRemaining - 2,
    selectedLivingId: null // Clear selection after reroll
  };
}

/**
 * Perform a total reroll - resample the entire partition
 * Costs 1 reroll. Resamples up to 10 times to avoid identical Living set if possible.
 *
 * @param {Object} state - Current roster state
 * @returns {Object} - New state with new partition
 */
export function totalReroll(state) {
  // Validate preconditions
  if (!state || !Array.isArray(state.livingIds) || !Array.isArray(state.fallenIds)) {
    throw new Error('Invalid state: missing livingIds or fallenIds');
  }
  if (state.rerollsRemaining < 1) {
    throw new Error('Insufficient rerolls for total reroll (requires 1)');
  }

  const allCharacterIds = [...state.livingIds, ...state.fallenIds];
  const originalLivingSet = new Set(state.livingIds);

  let newLivingIds = null;
  let newFallenIds = null;
  let rngState = state.rngState;
  let attempts = 0;
  const maxAttempts = 10;

  // Try up to 10 times to get a different Living set
  while (attempts < maxAttempts) {
    const rng = createPRNG(rngState);
    const shuffled = shuffleSeeded(allCharacterIds, rng);

    const candidateLiving = shuffled.slice(0, 3);
    const candidateFallen = shuffled.slice(3, 6);

    // Check if this is different from original
    const isDifferent = candidateLiving.some(id => !originalLivingSet.has(id));

    if (isDifferent || attempts === maxAttempts - 1) {
      // Accept this result (either it's different or it's our last attempt)
      newLivingIds = candidateLiving;
      newFallenIds = candidateFallen;
      break;
    }

    // Update RNG state for next attempt
    rngState = (rngState * 1103515245 + 12345) >>> 0;
    attempts++;
  }

  validatePartition(newLivingIds, newFallenIds, allCharacterIds);

  // Update RNG state for next operation
  const nextRngState = (rngState * 1103515245 + 12345) >>> 0;

  return {
    livingIds: newLivingIds,
    fallenIds: newFallenIds,
    rngState: nextRngState,
    rerollsRemaining: state.rerollsRemaining - 1,
    selectedLivingId: null // Clear selection after reroll
  };
}

/**
 * Get current state summary (for debugging/dev panel)
 */
export function getStateSummary(state) {
  return {
    living: state.livingIds.join(', '),
    fallen: state.fallenIds.join(', '),
    rerollsRemaining: state.rerollsRemaining,
    selectedLivingId: state.selectedLivingId || 'none',
    rngState: state.rngState
  };
}
