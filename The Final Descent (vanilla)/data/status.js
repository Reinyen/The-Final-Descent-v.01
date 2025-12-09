/**
 * Status Effects & Mutations Database
 * The Final Descent - All status conditions and mutation tiers
 */

import { STATUS_ID, MODIFIER, MUTATION_THRESHOLD, COLOR } from './constants.js';

// ============================================================================
// STATUS EFFECTS
// ============================================================================

/**
 * Status Effect definition
 * @typedef {Object} StatusEffect
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} type - 'debuff' | 'buff' | 'pressure'
 * @property {string} description - Effect description
 * @property {string} color - Visual color
 * @property {boolean} stackable - Can multiple instances exist?
 * @property {Function} onApply - Effect when applied
 * @property {Function} onTick - Effect per turn
 * @property {Function} onRemove - Effect when removed
 */

export const STATUS_EFFECTS = {
  // ============================================================================
  // RESOURCE PRESSURES (Persistent)
  // ============================================================================

  [STATUS_ID.MUTATION]: {
    id: STATUS_ID.MUTATION,
    name: 'Mutation',
    type: 'pressure',
    description: 'Physical corruption from station exposure. At 100, character transforms.',
    color: COLOR.MUTATION,
    stackable: true,
    persistent: true,
    threshold: 100,
    onThreshold: 'transform',
    damageModifiers: {
      25: { dealt: 1.10, taken: 1.10 },
      50: { dealt: 1.20, taken: 1.20 },
      75: { dealt: 1.30, taken: 1.30 }
    }
  },

  [STATUS_ID.STRESS]: {
    id: STATUS_ID.STRESS,
    name: 'Stress',
    type: 'pressure',
    description: 'Psychological breakdown. At 100, character panics and skips turn.',
    color: COLOR.STRESS,
    stackable: true,
    persistent: true,
    threshold: 100,
    onThreshold: 'panic'
  },

  [STATUS_ID.INJURY]: {
    id: STATUS_ID.INJURY,
    name: 'Injury',
    type: 'pressure',
    description: 'Permanent -2 max HP until treated at Rest.',
    color: '#FF6B6B',
    stackable: true,
    persistent: true,
    effect: { maxHPReduction: 2 }
  },

  // ============================================================================
  // COMBAT MODIFIERS (Temporary)
  // ============================================================================

  [STATUS_ID.LENSED]: {
    id: STATUS_ID.LENSED,
    name: 'Lensed',
    type: 'buff',
    description: 'Next action happens twice (damage, healing, or effect).',
    color: COLOR.BUFF,
    stackable: false,
    duration: 1,
    effect: { multiplier: MODIFIER.LENSED }
  },

  [STATUS_ID.DELAYED]: {
    id: STATUS_ID.DELAYED,
    name: 'Delayed',
    type: 'debuff',
    description: 'Action resolves next turn instead of immediately.',
    color: '#FFA500',
    stackable: false,
    duration: 1
  },

  [STATUS_ID.MARKED]: {
    id: STATUS_ID.MARKED,
    name: 'Marked',
    type: 'debuff',
    description: 'Takes +50% damage from next hit.',
    color: COLOR.DEBUFF,
    stackable: false,
    duration: 1,
    effect: { damageMultiplier: MODIFIER.MARKED }
  },

  [STATUS_ID.STUNNED]: {
    id: STATUS_ID.STUNNED,
    name: 'Stunned',
    type: 'debuff',
    description: 'Cannot act for specified turns.',
    color: '#FFEB3B',
    stackable: false,
    duration: 'variable',
    effect: { skipTurn: true }
  },

  [STATUS_ID.POISONED]: {
    id: STATUS_ID.POISONED,
    name: 'Poisoned',
    type: 'debuff',
    description: 'Takes damage over time.',
    color: COLOR.POISON,
    stackable: true,
    duration: 'variable',
    onTick: (target, stackData) => {
      return { type: 'damage', value: stackData.damagePerTurn };
    }
  },

  [STATUS_ID.GUARDIAN_STANCE]: {
    id: STATUS_ID.GUARDIAN_STANCE,
    name: 'Guardian Stance',
    type: 'buff',
    description: 'Takes -50% damage.',
    color: COLOR.BUFF,
    stackable: false,
    duration: 'variable',
    effect: { damageReduction: MODIFIER.GUARDIAN_STANCE }
  },

  [STATUS_ID.FOCUSED]: {
    id: STATUS_ID.FOCUSED,
    name: 'Focused',
    type: 'buff',
    description: '+15% critical hit chance.',
    color: COLOR.BUFF,
    stackable: false,
    duration: 'variable',
    effect: { critBonus: 0.15 }
  },

  [STATUS_ID.WEAKENED]: {
    id: STATUS_ID.WEAKENED,
    name: 'Weakened',
    type: 'debuff',
    description: 'Takes +3 flat damage.',
    color: COLOR.DEBUFF,
    stackable: false,
    duration: 'variable',
    effect: { flatDamage: MODIFIER.WEAKENED_FLAT }
  },

  [STATUS_ID.UNTARGETABLE]: {
    id: STATUS_ID.UNTARGETABLE,
    name: 'Untargetable',
    type: 'buff',
    description: 'Cannot be targeted by enemy attacks.',
    color: COLOR.BUFF,
    stackable: false,
    duration: 'variable',
    effect: { immune: true }
  },

  [STATUS_ID.TEMP_HP]: {
    id: STATUS_ID.TEMP_HP,
    name: 'Temporary HP',
    type: 'buff',
    description: 'Temporary health points absorbed before real HP.',
    color: COLOR.BUFF,
    stackable: true,
    persistent: true,
    effect: { value: 'variable' }
  }
};

// ============================================================================
// MUTATIONS (12 Total: 4 per tier)
// ============================================================================

export const MUTATIONS = {
  // ============================================================================
  // TIER 1 (25 Mutation)
  // ============================================================================

  photosynthetic_skin: {
    id: 'mutation_photosynthetic_skin',
    name: 'Photosynthetic Skin',
    tier: 1,
    threshold: MUTATION_THRESHOLD.TIER_1,
    benefit: 'Regenerate 1 HP per turn in light environments',
    drawback: 'Take +2 damage from fire-based attacks',
    description: 'Chlorophyll patterns spread across skin, enabling energy absorption.',
    visualEffect: 'green_veins'
  },

  enhanced_reflexes: {
    id: 'mutation_enhanced_reflexes',
    name: 'Enhanced Reflexes',
    tier: 1,
    threshold: MUTATION_THRESHOLD.TIER_1,
    benefit: '+1 Speed when below 50% HP',
    drawback: '-2 Max HP',
    description: 'Nervous system overdrive trades resilience for reaction time.',
    visualEffect: 'twitching'
  },

  redundant_organs: {
    id: 'mutation_redundant_organs',
    name: 'Redundant Organs',
    tier: 1,
    threshold: MUTATION_THRESHOLD.TIER_1,
    benefit: 'Survive one fatal blow at 1 HP (once per combat)',
    drawback: '-25% healing received',
    description: 'Critical systems duplicate, but normal healing struggles with complexity.',
    visualEffect: 'bulging_torso'
  },

  heightened_senses: {
    id: 'mutation_heightened_senses',
    name: 'Heightened Senses',
    tier: 1,
    threshold: MUTATION_THRESHOLD.TIER_1,
    benefit: 'See enemy intentions 1 turn earlier',
    drawback: 'Double stress gains',
    description: 'Perception expands beyond human limits—along with terror.',
    visualEffect: 'dilated_pupils'
  },

  // ============================================================================
  // TIER 2 (50 Mutation)
  // ============================================================================

  carapace_formation: {
    id: 'mutation_carapace_formation',
    name: 'Carapace Formation',
    tier: 2,
    threshold: MUTATION_THRESHOLD.TIER_2,
    benefit: '+3 Defense',
    drawback: '-1 Speed permanently',
    description: 'Chitinous plates form under skin, restricting movement.',
    visualEffect: 'armor_plates'
  },

  neural_bifurcation: {
    id: 'mutation_neural_bifurcation',
    name: 'Neural Bifurcation',
    tier: 2,
    threshold: MUTATION_THRESHOLD.TIER_2,
    benefit: 'Draw 1 extra card per hand',
    drawback: '25% chance to randomly target',
    description: 'Split consciousness provides options but scrambles intent.',
    visualEffect: 'double_vision'
  },

  metabolic_overdrive: {
    id: 'mutation_metabolic_overdrive',
    name: 'Metabolic Overdrive',
    tier: 2,
    threshold: MUTATION_THRESHOLD.TIER_2,
    benefit: 'All abilities cost -1 stamina',
    drawback: 'Take 2 damage per turn',
    description: 'Cellular engines burn too hot, consuming flesh as fuel.',
    visualEffect: 'smoke_emanation'
  },

  symbiotic_colony: {
    id: 'mutation_symbiotic_colony',
    name: 'Symbiotic Colony',
    tier: 2,
    threshold: MUTATION_THRESHOLD.TIER_2,
    benefit: 'Immune to poison and disease',
    drawback: 'Share status effects with allies',
    description: 'Microorganisms integrate into biology, forming hive-mind connections.',
    visualEffect: 'moving_bumps'
  },

  // ============================================================================
  // TIER 3 (75 Mutation)
  // ============================================================================

  temporal_desync: {
    id: 'mutation_temporal_desync',
    name: 'Temporal Desync',
    tier: 3,
    threshold: MUTATION_THRESHOLD.TIER_3,
    benefit: '25% chance to act twice per turn',
    drawback: '25% chance to skip turn entirely',
    description: 'Existence flickers between timelines—sometimes ahead, sometimes behind.',
    visualEffect: 'phase_flicker'
  },

  crystalline_bones: {
    id: 'mutation_crystalline_bones',
    name: 'Crystalline Bones',
    tier: 3,
    threshold: MUTATION_THRESHOLD.TIER_3,
    benefit: '+50% all damage dealt',
    drawback: 'Critical hits received cause instant death (shatter)',
    description: 'Skeleton transforms to razor-sharp crystal—beautiful and fatal.',
    visualEffect: 'glowing_skeleton'
  },

  hive_integration: {
    id: 'mutation_hive_integration',
    name: 'Hive Integration',
    tier: 3,
    threshold: MUTATION_THRESHOLD.TIER_3,
    benefit: 'Share all buffs with party members',
    drawback: 'Share all damage taken with party',
    description: 'Individual identity dissolves into collective consciousness.',
    visualEffect: 'linked_threads'
  },

  void_touched: {
    id: 'mutation_void_touched',
    name: 'Void Touched',
    tier: 3,
    threshold: MUTATION_THRESHOLD.TIER_3,
    benefit: 'Attacks ignore enemy defense',
    drawback: 'Cannot be healed by allies',
    description: 'Black hole radiation permeates cells—untouchable, unreachable.',
    visualEffect: 'dark_aura'
  }
};

// ============================================================================
// STATUS UTILITIES
// ============================================================================

/**
 * Get status effect by ID
 * @param {string} id - Status ID
 * @returns {StatusEffect|null}
 */
export function getStatusEffect(id) {
  return STATUS_EFFECTS[id] || null;
}

/**
 * Get all status effects
 * @returns {StatusEffect[]}
 */
export function getAllStatusEffects() {
  return Object.values(STATUS_EFFECTS);
}

/**
 * Get status effects by type
 * @param {string} type - 'buff' | 'debuff' | 'pressure'
 * @returns {StatusEffect[]}
 */
export function getStatusEffectsByType(type) {
  return getAllStatusEffects().filter(status => status.type === type);
}

// ============================================================================
// MUTATION UTILITIES
// ============================================================================

/**
 * Get mutation by ID
 * @param {string} id - Mutation ID
 * @returns {Object|null}
 */
export function getMutation(id) {
  return MUTATIONS[id] || null;
}

/**
 * Get all mutations
 * @returns {Object[]}
 */
export function getAllMutations() {
  return Object.values(MUTATIONS);
}

/**
 * Get mutations by tier
 * @param {number} tier - 1, 2, or 3
 * @returns {Object[]}
 */
export function getMutationsByTier(tier) {
  return getAllMutations().filter(mutation => mutation.tier === tier);
}

/**
 * Get available mutations for current mutation level
 * @param {number} currentMutation - Current mutation value (0-100)
 * @returns {Object[]} Available mutations to choose
 */
export function getAvailableMutations(currentMutation) {
  if (currentMutation < MUTATION_THRESHOLD.TIER_1) return [];

  let tier = 1;
  if (currentMutation >= MUTATION_THRESHOLD.TIER_3) tier = 3;
  else if (currentMutation >= MUTATION_THRESHOLD.TIER_2) tier = 2;

  return getMutationsByTier(tier);
}

/**
 * Get random mutation for tier
 * @param {number} tier - 1, 2, or 3
 * @returns {Object}
 */
export function getRandomMutation(tier) {
  const mutations = getMutationsByTier(tier);
  return mutations[Math.floor(Math.random() * mutations.length)];
}

/**
 * Check if character should transform
 * @param {number} mutationLevel - Current mutation value
 * @returns {boolean}
 */
export function shouldTransform(mutationLevel) {
  return mutationLevel >= MUTATION_THRESHOLD.TRANSFORM;
}

/**
 * Check if character should panic
 * @param {number} stressLevel - Current stress value
 * @returns {boolean}
 */
export function shouldPanic(stressLevel) {
  return stressLevel >= 100;
}

/**
 * Get damage modifiers from mutation level
 * @param {number} mutationLevel - Current mutation value
 * @returns {Object} { dealtMultiplier, takenMultiplier }
 */
export function getMutationDamageModifiers(mutationLevel) {
  if (mutationLevel < 25) return { dealt: 1.0, taken: 1.0 };
  if (mutationLevel < 50) return { dealt: 1.10, taken: 1.10 };
  if (mutationLevel < 75) return { dealt: 1.20, taken: 1.20 };
  if (mutationLevel < 100) return { dealt: 1.30, taken: 1.30 };
  return { dealt: 1.0, taken: 1.0 }; // Transformed state handles separately
}

/**
 * Get visual indicator data for UI
 * @param {string} statusId - Status effect ID
 * @param {Object} data - Additional data (duration, stacks, etc.)
 * @returns {Object}
 */
export function getStatusDisplayData(statusId, data = {}) {
  const status = getStatusEffect(statusId);
  if (!status) return null;

  return {
    id: status.id,
    name: status.name,
    type: status.type,
    description: status.description,
    color: status.color,
    icon: getStatusIcon(statusId),
    duration: data.duration || null,
    stacks: data.stacks || null,
    value: data.value || null
  };
}

/**
 * Get icon identifier for status (for UI sprite sheets)
 * @param {string} statusId - Status ID
 * @returns {string}
 */
function getStatusIcon(statusId) {
  const icons = {
    [STATUS_ID.MUTATION]: 'mutation',
    [STATUS_ID.STRESS]: 'stress',
    [STATUS_ID.INJURY]: 'injury',
    [STATUS_ID.LENSED]: 'lensed',
    [STATUS_ID.DELAYED]: 'delayed',
    [STATUS_ID.MARKED]: 'marked',
    [STATUS_ID.STUNNED]: 'stunned',
    [STATUS_ID.POISONED]: 'poisoned',
    [STATUS_ID.GUARDIAN_STANCE]: 'shield',
    [STATUS_ID.FOCUSED]: 'focused',
    [STATUS_ID.WEAKENED]: 'weakened',
    [STATUS_ID.UNTARGETABLE]: 'phase',
    [STATUS_ID.TEMP_HP]: 'temp_hp'
  };

  return icons[statusId] || 'unknown';
}

/**
 * Get mutation visual effect for character portrait
 * @param {string[]} mutationIds - Array of active mutation IDs
 * @returns {string[]} Array of visual effect identifiers
 */
export function getMutationVisualEffects(mutationIds) {
  return mutationIds.map(id => {
    const mutation = getMutation(id);
    return mutation ? mutation.visualEffect : null;
  }).filter(Boolean);
}
