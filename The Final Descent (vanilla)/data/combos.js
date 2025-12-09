/**
 * Combo Abilities Database
 * The Final Descent - All 10 combo abilities
 *
 * Combo abilities require 2 specific living crew members and are unlocked after Ring 1.
 * Each combo can only be used once per combat.
 */

import { CHARACTER_ID, SPEED, STATUS_ID } from './constants.js';

// ============================================================================
// COMBO ABILITY DATA STRUCTURE
// ============================================================================

/**
 * Combo Ability definition
 * @typedef {Object} ComboAbility
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string[]} requiredCrew - Array of 2 character IDs
 * @property {number} staminaCost - Combined stamina cost (3-6)
 * @property {string} speed - SPEED constant
 * @property {Object[]} effects - Array of effect objects
 * @property {string} description - Full text description
 * @property {boolean} unlocked - Unlocked after Ring 1
 * @property {boolean} usedThisCombat - Tracking flag
 */

// ============================================================================
// ALL COMBO ABILITIES
// ============================================================================

export const COMBOS = {
  coordinated_strike: {
    id: 'combo_coordinated_strike',
    name: 'Coordinated Strike',
    requiredCrew: [CHARACTER_ID.IONA, CHARACTER_ID.JONAS],
    staminaCost: 5,
    speed: SPEED.FAST,
    effects: [
      { type: 'damage', value: 18 },
      { type: 'status', status: STATUS_ID.MARKED, duration: 1, target: 'enemy' },
      { type: 'restore_stamina', value: 2, target: 'party' }
    ],
    description: 'Deal 18 damage, apply Marked, and restore 2 stamina.',
    shortDescription: '18 dmg + Marked + 2 stamina',
    flavorText: 'Iona\'s shield bash creates an opening Jonas exploits with perfect precision.',
    unlockCondition: 'Complete Ring 1'
  },

  biotic_overflow: {
    id: 'combo_biotic_overflow',
    name: 'Biotic Overflow',
    requiredCrew: [CHARACTER_ID.RHEA, CHARACTER_ID.MAYA],
    staminaCost: 4,
    speed: SPEED.NORMAL,
    effects: [
      { type: 'status', status: STATUS_ID.POISONED, damage: 8, duration: 3, target: 'all_enemies' },
      { type: 'heal', value: 6, target: 'all_allies' }
    ],
    description: 'Apply 8 poison/turn for 3 turns to all enemies. Heal all allies for 6 HP.',
    shortDescription: 'Poison (8×3) all + Heal all 6',
    flavorText: 'Nature\'s dual nature: life and death flowing from the same source.',
    unlockCondition: 'Complete Ring 1'
  },

  temporal_anchor: {
    id: 'combo_temporal_anchor',
    name: 'Temporal Anchor',
    requiredCrew: [CHARACTER_ID.SARA, CHARACTER_ID.KAI],
    staminaCost: 5,
    speed: SPEED.FAST,
    effects: [
      { type: 'skip_turn', target: 'all_enemies' },
      { type: 'status', status: STATUS_ID.LENSED, duration: 1, target: 'all_allies' }
    ],
    description: 'Skip all enemy turns. All allies gain Lensed (actions happen twice).',
    shortDescription: 'Skip enemy turns + Party Lensed',
    flavorText: 'Sara\'s command synchronizes with Kai\'s temporal manipulation perfectly.',
    unlockCondition: 'Complete Ring 1'
  },

  fortress_protocol: {
    id: 'combo_fortress_protocol',
    name: 'Fortress Protocol',
    requiredCrew: [CHARACTER_ID.IONA, CHARACTER_ID.SARA],
    staminaCost: 4,
    speed: SPEED.NORMAL,
    effects: [
      { type: 'temp_hp', value: 10, target: 'party' },
      { type: 'status_immunity', statuses: ['all'], duration: 2, target: 'party' }
    ],
    description: 'Party gains 10 temp HP and immunity to all status effects for 2 turns.',
    shortDescription: '10 temp HP + Status immune (2 turns)',
    flavorText: 'Military training and command authority form an impenetrable defense.',
    unlockCondition: 'Complete Ring 1'
  },

  reality_cascade: {
    id: 'combo_reality_cascade',
    name: 'Reality Cascade',
    requiredCrew: [CHARACTER_ID.KAI, CHARACTER_ID.RHEA],
    staminaCost: 6,
    speed: SPEED.SLOW,
    effects: [
      { type: 'damage', value: 25, target: 'random_enemy' },
      { type: 'spread_chance', chance: 0.5, description: '50% chance to spread to adjacent enemies' }
    ],
    description: 'Deal 25 damage to random enemy. 50% chance to spread damage.',
    shortDescription: '25 dmg (50% spread)',
    flavorText: 'Quantum instability meets organic chaos—reality itself fractures.',
    unlockCondition: 'Complete Ring 1'
  },

  emergency_triage: {
    id: 'combo_emergency_triage',
    name: 'Emergency Triage',
    requiredCrew: [CHARACTER_ID.MAYA, CHARACTER_ID.JONAS],
    staminaCost: 3,
    speed: SPEED.FAST,
    effects: [
      { type: 'revive', hp: 15, target: 'dead_ally' },
      { type: 'cleanse', target: 'party' }
    ],
    description: 'Revive dead crew member at 15 HP and cleanse all party status effects.',
    shortDescription: 'Revive (15 HP) + Cleanse all',
    flavorText: 'Medical expertise meets technical precision—life support at its finest.',
    unlockCondition: 'Complete Ring 1'
  },

  command_override: {
    id: 'combo_command_override',
    name: 'Command Override',
    requiredCrew: [CHARACTER_ID.SARA, CHARACTER_ID.JONAS],
    staminaCost: 4,
    speed: SPEED.NORMAL,
    effects: [
      { type: 'restore_stamina', value: 8, target: 'party', description: 'Reset to full' },
      { type: 'draw_cards', count: 2 }
    ],
    description: 'Reset stamina to 8 and draw 2 additional cards.',
    shortDescription: 'Full stamina + Draw 2',
    flavorText: 'Command authority bypasses normal system limitations.',
    unlockCondition: 'Complete Ring 1'
  },

  quantum_garden: {
    id: 'combo_quantum_garden',
    name: 'Quantum Garden',
    requiredCrew: [CHARACTER_ID.KAI, CHARACTER_ID.RHEA],
    staminaCost: 5,
    speed: SPEED.NORMAL,
    effects: [
      { type: 'field', damage: 6, duration: 3, target: 'all_enemies', description: 'Unstable growth field' }
    ],
    description: 'Create field that deals 6 damage per turn to all enemies for 3 turns.',
    shortDescription: 'Field: 6 dmg/turn (3 turns)',
    flavorText: 'Accelerated growth meets quantum instability—a garden of entropy.',
    unlockCondition: 'Complete Ring 1'
  },

  shield_wall: {
    id: 'combo_shield_wall',
    name: 'Shield Wall',
    requiredCrew: [CHARACTER_ID.IONA, CHARACTER_ID.MAYA],
    staminaCost: 4,
    speed: SPEED.FAST,
    effects: [
      { type: 'damage_reduction', value: 0.5, duration: 3, count: 3, description: 'Next 3 attacks deal half damage' }
    ],
    description: 'Next 3 enemy attacks deal 50% damage.',
    shortDescription: '50% damage (3 attacks)',
    flavorText: 'Physical defense reinforced by biomedical intervention.',
    unlockCondition: 'Complete Ring 1'
  },

  data_burst: {
    id: 'combo_data_burst',
    name: 'Data Burst',
    requiredCrew: [CHARACTER_ID.JONAS, CHARACTER_ID.KAI],
    staminaCost: 3,
    speed: SPEED.FAST,
    effects: [
      { type: 'reveal_intentions', turns: 2, target: 'all_enemies' },
      { type: 'speed_buff', value: 2, duration: 2, target: 'party' }
    ],
    description: 'Reveal enemy intentions 2 turns ahead. Party gains +2 speed for 2 turns.',
    shortDescription: 'Reveal 2 turns + +2 Speed',
    flavorText: 'Technical scanning synchronized with temporal perception.',
    unlockCondition: 'Complete Ring 1'
  }
};

// ============================================================================
// COMBO UTILITIES
// ============================================================================

/**
 * Get combo ability by ID
 * @param {string} id - Combo ID
 * @returns {ComboAbility|null}
 */
export function getCombo(id) {
  return COMBOS[id] || null;
}

/**
 * Get all combos as array
 * @returns {ComboAbility[]}
 */
export function getAllCombos() {
  return Object.values(COMBOS);
}

/**
 * Get available combos for current crew
 * @param {string[]} crewIds - Array of living crew IDs
 * @returns {ComboAbility[]}
 */
export function getAvailableCombos(crewIds) {
  return getAllCombos().filter(combo => {
    const [char1, char2] = combo.requiredCrew;
    return crewIds.includes(char1) && crewIds.includes(char2);
  });
}

/**
 * Check if combo is available
 * @param {string} comboId - Combo ID
 * @param {string[]} crewIds - Living crew IDs
 * @param {boolean} usedThisCombat - Has any combo been used this combat?
 * @returns {boolean}
 */
export function canUseCombo(comboId, crewIds, usedThisCombat = false) {
  if (usedThisCombat) return false; // Only 1 combo per combat

  const combo = getCombo(comboId);
  if (!combo) return false;

  const [char1, char2] = combo.requiredCrew;
  return crewIds.includes(char1) && crewIds.includes(char2);
}

/**
 * Get combo card data for UI
 * @param {string} comboId - Combo ID
 * @returns {Object}
 */
export function getComboCardData(comboId) {
  const combo = getCombo(comboId);
  if (!combo) return null;

  return {
    id: combo.id,
    name: combo.name,
    cost: combo.staminaCost,
    speed: combo.speed === SPEED.FAST ? 'Fast' : combo.speed === SPEED.SLOW ? 'Slow' : 'Normal',
    requiredCrew: combo.requiredCrew,
    description: combo.shortDescription,
    fullDescription: combo.description,
    flavorText: combo.flavorText,
    isCombo: true,
    limitText: '1 per combat'
  };
}

/**
 * Get combo pairs (for UI display of locked/unlocked combos)
 * @param {string[]} livingCrewIds - Current living crew
 * @returns {Object[]} Array of combo info with availability
 */
export function getComboPairs(livingCrewIds = []) {
  return getAllCombos().map(combo => {
    const [char1, char2] = combo.requiredCrew;
    const available = livingCrewIds.includes(char1) && livingCrewIds.includes(char2);
    const bothDead = !livingCrewIds.includes(char1) && !livingCrewIds.includes(char2);
    const oneDead = livingCrewIds.includes(char1) !== livingCrewIds.includes(char2);

    return {
      id: combo.id,
      name: combo.name,
      requiredCrew: combo.requiredCrew,
      available,
      status: available ? 'available' : oneDead ? 'one_dead' : bothDead ? 'both_dead' : 'unknown',
      description: combo.shortDescription
    };
  });
}

/**
 * Get combos grouped by character
 * @param {string} characterId - Character ID
 * @returns {ComboAbility[]} All combos involving this character
 */
export function getCombosByCharacter(characterId) {
  return getAllCombos().filter(combo =>
    combo.requiredCrew.includes(characterId)
  );
}

/**
 * Check if any combos are available for crew
 * @param {string[]} crewIds - Living crew IDs
 * @returns {boolean}
 */
export function hasAvailableCombos(crewIds) {
  return getAvailableCombos(crewIds).length > 0;
}

/**
 * Get combo requirement text for UI
 * @param {string} comboId - Combo ID
 * @returns {string}
 */
export function getComboRequirementText(comboId) {
  const combo = getCombo(comboId);
  if (!combo) return '';

  // Import character names (will be resolved at runtime)
  const [char1, char2] = combo.requiredCrew;
  return `Requires ${char1} and ${char2} alive`;
}
