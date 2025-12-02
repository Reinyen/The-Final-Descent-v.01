/**
 * Roster Logic
 * Handles deterministic randomness, partition rules, and reroll logic.
 *
 * Per GDD §4.2 and §4.3:
 * - Game logic owns all random draws and returns explicit IDs
 * - ALWAYS maintains strict partition: Living ∪ Fallen = all 6, Living ∩ Fallen = ∅
 * - Single reroll = swap semantics (swap out selected, swap in random Fallen)
 * - Total reroll = full re-partition (avoid identical Living set)
 */

/**
 * Simple deterministic pseudo-random number generator
 * Based on mulberry32 algorithm
 */
class SeededRandom {
  constructor(seed) {
    this.state = this.hashSeed(seed);
  }

  /**
   * Hash a seed string/number into a 32-bit integer
   */
  hashSeed(seed) {
    let h = 0;
    const str = String(seed);
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return h >>> 0; // Convert to unsigned 32-bit integer
  }

  /**
   * Generate next random number [0, 1)
   */
  next() {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  /**
   * Get random integer in range [min, max)
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /**
   * Shuffle array in place using Fisher-Yates
   */
  shuffle(array) {
    const arr = [...array]; // Create copy
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export class RosterLogic {
  constructor(allCharacterIds) {
    if (allCharacterIds.length !== 6) {
      throw new Error('[RosterLogic] Expected exactly 6 character IDs');
    }

    this.allCharacterIds = allCharacterIds;
    this.rosterSeed = null;
    this.rerollCount = 0; // Tracks number of rerolls for seed variation
  }

  /**
   * Initialize with a roster seed
   * @param {string|number} seed - Deterministic seed for this roster session
   */
  setSeed(seed) {
    this.rosterSeed = seed;
    this.rerollCount = 0;
    console.log('[RosterLogic] Seed set:', seed);
  }

  /**
   * Get initial partition: 3 Living, 3 Fallen
   * Per GDD §4.2: randomly select exactly 3 as Living, remaining 3 as Fallen
   *
   * @param {string|number} seed - Roster seed
   * @returns {{ livingIds: string[], fallenIds: string[] }}
   */
  getInitialPartition(seed) {
    this.setSeed(seed);

    const rng = new SeededRandom(seed);
    const shuffled = rng.shuffle(this.allCharacterIds);

    const livingIds = shuffled.slice(0, 3);
    const fallenIds = shuffled.slice(3, 6);

    console.log('[RosterLogic] Initial partition:', { livingIds, fallenIds });

    // Verify partition integrity
    this._verifyPartition(livingIds, fallenIds);

    return { livingIds, fallenIds };
  }

  /**
   * Apply single reroll (swap semantics)
   * Per GDD §4.3:
   * - Swap OUT the selected Living character
   * - Swap IN one randomly chosen character from current Fallen set
   * - Costs 2 rerolls
   *
   * @param {string|number} seed - Roster seed
   * @param {string[]} currentLivingIds - Current 3 Living IDs
   * @param {string} selectedLivingId - The Living ID to swap out
   * @returns {{ newLivingIds: string[], newFallenIds: string[], replacedOutId: string, swappedInId: string }}
   */
  applySingleReroll(seed, currentLivingIds, selectedLivingId) {
    if (currentLivingIds.length !== 3) {
      throw new Error('[RosterLogic] currentLivingIds must have exactly 3 IDs');
    }

    if (!currentLivingIds.includes(selectedLivingId)) {
      throw new Error('[RosterLogic] selectedLivingId must be in currentLivingIds');
    }

    // Calculate current Fallen (complement of Living)
    const currentFallenIds = this.allCharacterIds.filter(id => !currentLivingIds.includes(id));

    if (currentFallenIds.length !== 3) {
      throw new Error('[RosterLogic] Partition violation: Fallen must have exactly 3 IDs');
    }

    // Use seed + reroll count for determinism with variation
    this.rerollCount++;
    const rng = new SeededRandom(`${seed}_single_${this.rerollCount}`);

    // Randomly select one from Fallen
    const swappedInIndex = rng.nextInt(0, currentFallenIds.length);
    const swappedInId = currentFallenIds[swappedInIndex];

    // Build new Living: replace selected with swapped-in
    const newLivingIds = currentLivingIds.map(id =>
      id === selectedLivingId ? swappedInId : id
    );

    // Build new Fallen: complement of new Living
    const newFallenIds = this.allCharacterIds.filter(id => !newLivingIds.includes(id));

    console.log('[RosterLogic] Single reroll:', {
      replacedOutId: selectedLivingId,
      swappedInId,
      newLivingIds,
      newFallenIds
    });

    // Verify partition integrity
    this._verifyPartition(newLivingIds, newFallenIds);

    return {
      newLivingIds,
      newFallenIds,
      replacedOutId: selectedLivingId,
      swappedInId
    };
  }

  /**
   * Apply total reroll (full re-partition)
   * Per GDD §4.3:
   * - Choose 3 distinct Living from the 6; remaining 3 become Fallen
   * - Avoid producing identical Living set if possible (up to 10 re-samples)
   * - Costs 1 reroll
   *
   * @param {string|number} seed - Roster seed
   * @param {string[]} currentLivingIds - Current 3 Living IDs (to avoid duplicating)
   * @returns {{ newLivingIds: string[], newFallenIds: string[] }}
   */
  applyTotalReroll(seed, currentLivingIds) {
    if (currentLivingIds.length !== 3) {
      throw new Error('[RosterLogic] currentLivingIds must have exactly 3 IDs');
    }

    this.rerollCount++;
    const rng = new SeededRandom(`${seed}_total_${this.rerollCount}`);

    let newLivingIds = null;
    let attempts = 0;
    const maxAttempts = 10;

    // Try to avoid identical set
    while (attempts < maxAttempts) {
      const shuffled = rng.shuffle(this.allCharacterIds);
      const candidate = shuffled.slice(0, 3).sort(); // Sort for comparison

      // Check if identical to current (when sorted)
      const currentSorted = [...currentLivingIds].sort();
      const isIdentical = candidate.every((id, idx) => id === currentSorted[idx]);

      if (!isIdentical) {
        newLivingIds = candidate;
        break;
      }

      attempts++;
    }

    // If all attempts failed, accept the last one
    if (!newLivingIds) {
      const shuffled = rng.shuffle(this.allCharacterIds);
      newLivingIds = shuffled.slice(0, 3);
      console.warn('[RosterLogic] Total reroll produced identical set after 10 attempts');
    }

    // Build new Fallen: complement of new Living
    const newFallenIds = this.allCharacterIds.filter(id => !newLivingIds.includes(id));

    console.log('[RosterLogic] Total reroll:', {
      newLivingIds,
      newFallenIds,
      attempts
    });

    // Verify partition integrity
    this._verifyPartition(newLivingIds, newFallenIds);

    return { newLivingIds, newFallenIds };
  }

  /**
   * Verify partition integrity (for testing and safety)
   * Per GDD §15.2: Living and Fallen must be strict 3/3 partition
   */
  _verifyPartition(livingIds, fallenIds) {
    // Check lengths
    if (livingIds.length !== 3) {
      throw new Error('[RosterLogic] Partition violation: Living must have exactly 3 IDs');
    }
    if (fallenIds.length !== 3) {
      throw new Error('[RosterLogic] Partition violation: Fallen must have exactly 3 IDs');
    }

    // Check no duplicates within Living
    const livingSet = new Set(livingIds);
    if (livingSet.size !== 3) {
      throw new Error('[RosterLogic] Partition violation: Duplicates in Living');
    }

    // Check no duplicates within Fallen
    const fallenSet = new Set(fallenIds);
    if (fallenSet.size !== 3) {
      throw new Error('[RosterLogic] Partition violation: Duplicates in Fallen');
    }

    // Check no overlap between Living and Fallen
    const overlap = livingIds.filter(id => fallenIds.includes(id));
    if (overlap.length > 0) {
      throw new Error('[RosterLogic] Partition violation: Overlap between Living and Fallen');
    }

    // Check union equals all 6
    const union = new Set([...livingIds, ...fallenIds]);
    if (union.size !== 6) {
      throw new Error('[RosterLogic] Partition violation: Union does not equal 6 characters');
    }

    // Check all IDs are valid
    const allValid = [...livingIds, ...fallenIds].every(id => this.allCharacterIds.includes(id));
    if (!allValid) {
      throw new Error('[RosterLogic] Partition violation: Invalid character ID');
    }

    return true;
  }
}
