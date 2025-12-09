/**
 * Abilities Database
 * The Final Descent - All 36 character abilities
 */

import { CHARACTER_ID, SPEED, ABILITY_TYPE, STATUS_ID } from './constants.js';

// ============================================================================
// ABILITY DATA STRUCTURE
// ============================================================================

/**
 * Ability definition
 * @typedef {Object} Ability
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} characterId - Owner character ID
 * @property {number} staminaCost - Stamina required (0-3)
 * @property {number} damage - Base damage (0 if support/utility)
 * @property {string} speed - SPEED.FAST | SPEED.NORMAL | SPEED.SLOW | SPEED.VARIABLE
 * @property {string} type - ABILITY_TYPE constant
 * @property {Object[]} effects - Array of effect objects
 * @property {string} description - Full text description
 * @property {string} shortDescription - Brief description for card
 */

// ============================================================================
// IONA KADE - SECURITY CHIEF (TANK)
// ============================================================================

export const IONA_ABILITIES = {
  shield_bash: {
    id: 'iona_shield_bash',
    name: 'Shield Bash',
    characterId: CHARACTER_ID.IONA,
    staminaCost: 1,
    damage: 6,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.CONTROL,
    effects: [
      { type: 'damage', value: 6 },
      { type: 'status', status: STATUS_ID.STUNNED, duration: 1, target: 'enemy' }
    ],
    description: 'Deal 6 damage and stun target for 1 turn.',
    shortDescription: '6 dmg + Stun'
  },

  defensive_stance: {
    id: 'iona_defensive_stance',
    name: 'Defensive Stance',
    characterId: CHARACTER_ID.IONA,
    staminaCost: 0,
    damage: 0,
    speed: SPEED.FAST,
    type: ABILITY_TYPE.DEFENSIVE,
    effects: [
      { type: 'modifier', modifier: 'defensive_stance', duration: 1, target: 'self' }
    ],
    description: 'Reduce incoming damage by 50% this turn.',
    shortDescription: '-50% damage taken'
  },

  suppressing_fire: {
    id: 'iona_suppressing_fire',
    name: 'Suppressing Fire',
    characterId: CHARACTER_ID.IONA,
    staminaCost: 2,
    damage: 4,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'damage', value: 4, target: 'all_enemies' }
    ],
    description: 'Deal 4 damage to all enemies.',
    shortDescription: '4 dmg (AoE)'
  },

  guardian_protocol: {
    id: 'iona_guardian_protocol',
    name: 'Guardian Protocol',
    characterId: CHARACTER_ID.IONA,
    staminaCost: 2,
    damage: 0,
    speed: SPEED.FAST,
    type: ABILITY_TYPE.DEFENSIVE,
    effects: [
      { type: 'redirect', count: 2, duration: 2, target: 'self' }
    ],
    description: 'Redirect the next 2 enemy attacks to Iona.',
    shortDescription: 'Taunt (2 attacks)'
  },

  tactical_advance: {
    id: 'iona_tactical_advance',
    name: 'Tactical Advance',
    characterId: CHARACTER_ID.IONA,
    staminaCost: 1,
    damage: 8,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'damage', value: 8 },
      { type: 'conditional_bonus', condition: 'target_stunned', bonus: 4 }
    ],
    description: 'Deal 8 damage. +4 bonus damage if target is Stunned.',
    shortDescription: '8 dmg (+4 if Stunned)'
  },

  last_stand: {
    id: 'iona_last_stand',
    name: 'Last Stand',
    characterId: CHARACTER_ID.IONA,
    staminaCost: 3,
    damage: 15,
    speed: SPEED.SLOW,
    type: ABILITY_TYPE.SPECIAL,
    effects: [
      { type: 'damage', value: 15 },
      { type: 'temp_hp', value: 10, target: 'self' }
    ],
    description: 'Deal 15 damage and gain 10 temporary HP.',
    shortDescription: '15 dmg + 10 temp HP'
  }
};

// ============================================================================
// DR. RHEA MYLES - BOTANIST (DoT)
// ============================================================================

export const RHEA_ABILITIES = {
  toxic_spores: {
    id: 'rhea_toxic_spores',
    name: 'Toxic Spores',
    characterId: CHARACTER_ID.RHEA,
    staminaCost: 1,
    damage: 3,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'status', status: STATUS_ID.POISONED, damage: 3, duration: 3, target: 'enemy' }
    ],
    description: 'Apply Poison: 3 damage per turn for 3 turns.',
    shortDescription: 'Poison (3×3)'
  },

  overgrowth: {
    id: 'rhea_overgrowth',
    name: 'Overgrowth',
    characterId: CHARACTER_ID.RHEA,
    staminaCost: 2,
    damage: 6,
    speed: SPEED.FAST,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'conditional_damage', condition: 'target_poisoned', value: 6 }
    ],
    description: 'Deal 6 damage to poisoned enemies.',
    shortDescription: '6 dmg (Poisoned only)'
  },

  parasitic_vines: {
    id: 'rhea_parasitic_vines',
    name: 'Parasitic Vines',
    characterId: CHARACTER_ID.RHEA,
    staminaCost: 2,
    damage: 5,
    speed: SPEED.SLOW,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'damage', value: 5 },
      { type: 'heal', value: 3, target: 'self' }
    ],
    description: 'Deal 5 damage and steal 3 HP.',
    shortDescription: '5 dmg + Lifesteal 3'
  },

  pheromone_cloud: {
    id: 'rhea_pheromone_cloud',
    name: 'Pheromone Cloud',
    characterId: CHARACTER_ID.RHEA,
    staminaCost: 1,
    damage: 0,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.CONTROL,
    effects: [
      { type: 'confusion', duration: 1, target: 'all_enemies' }
    ],
    description: 'Enemies attack random targets for 1 turn.',
    shortDescription: 'Confuse all enemies'
  },

  thorn_volley: {
    id: 'rhea_thorn_volley',
    name: 'Thorn Volley',
    characterId: CHARACTER_ID.RHEA,
    staminaCost: 1,
    damage: 7,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'damage', value: 7 },
      { type: 'scaling_bonus', condition: 'count_poisoned_enemies', bonus_per: 2 }
    ],
    description: 'Deal 7 damage. +2 damage per poisoned enemy.',
    shortDescription: '7 dmg (+2/poisoned)'
  },

  bloom_of_decay: {
    id: 'rhea_bloom_of_decay',
    name: 'Bloom of Decay',
    characterId: CHARACTER_ID.RHEA,
    staminaCost: 3,
    damage: 8,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.SPECIAL,
    effects: [
      { type: 'damage', value: 8, target: 'all_enemies' },
      { type: 'status', status: STATUS_ID.POISONED, damage: 3, duration: 3, target: 'all_enemies' }
    ],
    description: 'Deal 8 damage to all enemies and apply Poison (3×3).',
    shortDescription: '8 dmg + Poison (AoE)'
  }
};

// ============================================================================
// JONAS REEVE - TECHNICIAN (SUPPORT)
// ============================================================================

export const JONAS_ABILITIES = {
  quick_fix: {
    id: 'jonas_quick_fix',
    name: 'Quick Fix',
    characterId: CHARACTER_ID.JONAS,
    staminaCost: 0,
    damage: 0,
    speed: SPEED.FAST,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'restore_stamina', value: 2, target: 'party' }
    ],
    description: 'Restore 2 stamina to the party.',
    shortDescription: '+2 Stamina'
  },

  overcharge: {
    id: 'jonas_overcharge',
    name: 'Overcharge',
    characterId: CHARACTER_ID.JONAS,
    staminaCost: 1,
    damage: 0,
    speed: SPEED.FAST,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'cost_reduction', value: 1, duration: 1, target: 'party' }
    ],
    description: 'Next ability costs -1 stamina.',
    shortDescription: '-1 cost next ability'
  },

  system_scan: {
    id: 'jonas_system_scan',
    name: 'System Scan',
    characterId: CHARACTER_ID.JONAS,
    staminaCost: 1,
    damage: 4,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'damage', value: 4 },
      { type: 'status', status: STATUS_ID.MARKED, duration: 1, target: 'enemy' }
    ],
    description: 'Deal 4 damage and apply Marked (+50% damage taken).',
    shortDescription: '4 dmg + Marked'
  },

  emergency_power: {
    id: 'jonas_emergency_power',
    name: 'Emergency Power',
    characterId: CHARACTER_ID.JONAS,
    staminaCost: 2,
    damage: 0,
    speed: SPEED.FAST,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'speed_buff', value: 1, duration: 2, target: 'party' }
    ],
    description: 'Party gains +1 speed for 2 turns.',
    shortDescription: '+1 Speed (2 turns)'
  },

  discharge: {
    id: 'jonas_discharge',
    name: 'Discharge',
    characterId: CHARACTER_ID.JONAS,
    staminaCost: 2,
    damage: 10,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'damage', value: 10 },
      { type: 'scaling_bonus', condition: 'count_party_buffs', bonus_per: 2 }
    ],
    description: 'Deal 10 damage. +2 damage per active party buff.',
    shortDescription: '10 dmg (+2/buff)'
  },

  full_reboot: {
    id: 'jonas_full_reboot',
    name: 'Full Reboot',
    characterId: CHARACTER_ID.JONAS,
    staminaCost: 3,
    damage: 0,
    speed: SPEED.SLOW,
    type: ABILITY_TYPE.SPECIAL,
    effects: [
      { type: 'restore_stamina', value: 8, target: 'party' },
      { type: 'reset_cooldowns', target: 'party' }
    ],
    description: 'Restore stamina to 8 and reset all cooldowns.',
    shortDescription: 'Reset stamina + cooldowns'
  }
};

// ============================================================================
// CAPTAIN SARA CHEN - COMMANDER (BALANCED)
// ============================================================================

export const SARA_ABILITIES = {
  rally_cry: {
    id: 'sara_rally_cry',
    name: 'Rally Cry',
    characterId: CHARACTER_ID.SARA,
    staminaCost: 1,
    damage: 0,
    speed: SPEED.FAST,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'damage_buff', value: 3, duration: 1, target: 'party' }
    ],
    description: 'Allies gain +3 damage on their next attack.',
    shortDescription: '+3 dmg next attack'
  },

  tactical_order: {
    id: 'sara_tactical_order',
    name: 'Tactical Order',
    characterId: CHARACTER_ID.SARA,
    staminaCost: 0,
    damage: 5,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'extra_action', target: 'ally_choice' }
    ],
    description: 'Direct an ally to attack immediately for 5 damage.',
    shortDescription: 'Ally attacks (5 dmg)'
  },

  inspiring_presence: {
    id: 'sara_inspiring_presence',
    name: 'Inspiring Presence',
    characterId: CHARACTER_ID.SARA,
    staminaCost: 1,
    damage: 0,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'cleanse', target: 'party' }
    ],
    description: 'Remove all debuffs from party.',
    shortDescription: 'Cleanse all debuffs'
  },

  coordinated_assault: {
    id: 'sara_coordinated_assault',
    name: 'Coordinated Assault',
    characterId: CHARACTER_ID.SARA,
    staminaCost: 2,
    damage: 4,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'damage', value: 4, source: 'all_allies' }
    ],
    description: 'All allies attack target for 4 damage each.',
    shortDescription: '4 dmg × allies'
  },

  strategic_retreat: {
    id: 'sara_strategic_retreat',
    name: 'Strategic Retreat',
    characterId: CHARACTER_ID.SARA,
    staminaCost: 2,
    damage: 0,
    speed: SPEED.FAST,
    type: ABILITY_TYPE.DEFENSIVE,
    effects: [
      { type: 'damage_reduction', value: 5, duration: 1, target: 'party' }
    ],
    description: 'Party takes -5 damage next turn.',
    shortDescription: '-5 dmg next turn'
  },

  captains_resolve: {
    id: 'sara_captains_resolve',
    name: "Captain's Resolve",
    characterId: CHARACTER_ID.SARA,
    staminaCost: 3,
    damage: 12,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.SPECIAL,
    effects: [
      { type: 'damage', value: 12 },
      { type: 'stress_immunity', duration: 3, target: 'party' }
    ],
    description: 'Deal 12 damage. Party immune to Stress for 3 turns.',
    shortDescription: '12 dmg + Stress immunity'
  }
};

// ============================================================================
// DR. KAI TORRES - PHYSICIST (BURST DAMAGE)
// ============================================================================

export const KAI_ABILITIES = {
  quantum_strike: {
    id: 'kai_quantum_strike',
    name: 'Quantum Strike',
    characterId: CHARACTER_ID.KAI,
    staminaCost: 1,
    damage: 8,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'damage', value: 8 },
      { type: 'double_hit_chance', chance: 0.5 }
    ],
    description: 'Deal 8 damage. 50% chance to hit twice.',
    shortDescription: '8 dmg (50% double)'
  },

  time_dilation: {
    id: 'kai_time_dilation',
    name: 'Time Dilation',
    characterId: CHARACTER_ID.KAI,
    staminaCost: 2,
    damage: 0,
    speed: SPEED.VARIABLE,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'extra_turn', duration: 1, target: 'ally_or_enemy' }
    ],
    description: 'Target acts twice next turn.',
    shortDescription: 'Extra turn (ally/enemy)'
  },

  gravity_well: {
    id: 'kai_gravity_well',
    name: 'Gravity Well',
    characterId: CHARACTER_ID.KAI,
    staminaCost: 2,
    damage: 6,
    speed: SPEED.SLOW,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'damage', value: 6, target: 'all_enemies' },
      { type: 'pull', target: 'all_enemies' }
    ],
    description: 'Pull and damage all enemies for 6 damage.',
    shortDescription: '6 dmg (AoE + Pull)'
  },

  phase_shift: {
    id: 'kai_phase_shift',
    name: 'Phase Shift',
    characterId: CHARACTER_ID.KAI,
    staminaCost: 1,
    damage: 0,
    speed: SPEED.FAST,
    type: ABILITY_TYPE.DEFENSIVE,
    effects: [
      { type: 'status', status: STATUS_ID.UNTARGETABLE, duration: 1, target: 'self' }
    ],
    description: 'Become untargetable for 1 turn.',
    shortDescription: 'Untargetable (1 turn)'
  },

  particle_beam: {
    id: 'kai_particle_beam',
    name: 'Particle Beam',
    characterId: CHARACTER_ID.KAI,
    staminaCost: 3,
    damage: 20,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'damage', value: 20 },
      { type: 'pierce', description: 'Ignores defense' }
    ],
    description: 'Deal 20 damage. Pierces through enemy line.',
    shortDescription: '20 dmg (Pierce)'
  },

  singularity: {
    id: 'kai_singularity',
    name: 'Singularity',
    characterId: CHARACTER_ID.KAI,
    staminaCost: 3,
    damage: 25,
    speed: SPEED.SLOW,
    type: ABILITY_TYPE.SPECIAL,
    effects: [
      { type: 'damage', value: 25 },
      { type: 'field', damage: 3, duration: 3, target: 'all_enemies', description: 'Void deals 3 dmg/turn to all' }
    ],
    description: 'Deal 25 damage. Create void field: 3 damage/turn for 3 turns.',
    shortDescription: '25 dmg + Void field'
  }
};

// ============================================================================
// MAYA OKONKWO - LIFE SUPPORT (HEALER)
// ============================================================================

export const MAYA_ABILITIES = {
  emergency_heal: {
    id: 'maya_emergency_heal',
    name: 'Emergency Heal',
    characterId: CHARACTER_ID.MAYA,
    staminaCost: 1,
    damage: 0,
    speed: SPEED.FAST,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'heal', value: 8, target: 'ally' }
    ],
    description: 'Restore 8 HP to target ally.',
    shortDescription: 'Heal 8 HP'
  },

  purifying_breath: {
    id: 'maya_purifying_breath',
    name: 'Purifying Breath',
    characterId: CHARACTER_ID.MAYA,
    staminaCost: 1,
    damage: 0,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'cleanse_status', target: 'ally' },
      { type: 'heal', value: 3, target: 'ally' }
    ],
    description: 'Remove one status effect and heal 3 HP.',
    shortDescription: 'Cleanse + Heal 3'
  },

  vital_signs: {
    id: 'maya_vital_signs',
    name: 'Vital Signs',
    characterId: CHARACTER_ID.MAYA,
    staminaCost: 0,
    damage: 0,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'regeneration', value: 2, duration: 3, target: 'party' }
    ],
    description: 'Party regenerates 2 HP per turn for 3 turns.',
    shortDescription: '+2 HP/turn (3 turns)'
  },

  adrenaline_shot: {
    id: 'maya_adrenaline_shot',
    name: 'Adrenaline Shot',
    characterId: CHARACTER_ID.MAYA,
    staminaCost: 2,
    damage: 0,
    speed: SPEED.FAST,
    type: ABILITY_TYPE.SUPPORT,
    effects: [
      { type: 'status', status: STATUS_ID.LENSED, duration: 1, target: 'ally' },
      { type: 'temp_hp', value: 10, target: 'ally' }
    ],
    description: 'Target gains Lensed (next action happens twice) + 10 temp HP.',
    shortDescription: 'Lensed + 10 temp HP'
  },

  bioscan: {
    id: 'maya_bioscan',
    name: 'Bioscan',
    characterId: CHARACTER_ID.MAYA,
    staminaCost: 1,
    damage: 5,
    speed: SPEED.NORMAL,
    type: ABILITY_TYPE.ATTACK,
    effects: [
      { type: 'damage', value: 5 },
      { type: 'max_hp_reduction', value: 3, target: 'enemy' }
    ],
    description: 'Deal 5 damage and reduce target max HP by 3.',
    shortDescription: '5 dmg + -3 max HP'
  },

  resurrection_protocol: {
    id: 'maya_resurrection_protocol',
    name: 'Resurrection Protocol',
    characterId: CHARACTER_ID.MAYA,
    staminaCost: 3,
    damage: 0,
    speed: SPEED.SLOW,
    type: ABILITY_TYPE.SPECIAL,
    effects: [
      { type: 'revive', hp: 10, target: 'dead_ally' }
    ],
    description: 'Revive a dead ally with 10 HP.',
    shortDescription: 'Revive (10 HP)'
  }
};

// ============================================================================
// COMBINED ABILITIES OBJECT
// ============================================================================

export const ABILITIES = {
  ...IONA_ABILITIES,
  ...RHEA_ABILITIES,
  ...JONAS_ABILITIES,
  ...SARA_ABILITIES,
  ...KAI_ABILITIES,
  ...MAYA_ABILITIES
};

// ============================================================================
// ABILITY UTILITIES
// ============================================================================

/**
 * Get ability by ID
 * @param {string} id - Ability ID
 * @returns {Ability|null}
 */
export function getAbility(id) {
  return ABILITIES[id] || null;
}

/**
 * Get all abilities for a character
 * @param {string} characterId - Character ID
 * @returns {Ability[]}
 */
export function getCharacterAbilities(characterId) {
  return Object.values(ABILITIES).filter(ability => ability.characterId === characterId);
}

/**
 * Get abilities by IDs
 * @param {string[]} ids - Array of ability IDs
 * @returns {Ability[]}
 */
export function getAbilitiesByIds(ids) {
  return ids.map(id => ABILITIES[id]).filter(Boolean);
}

/**
 * Get random abilities for hand (4 cards from crew pool)
 * @param {string[]} crewIds - Array of 3 character IDs
 * @returns {Ability[]} Array of 4 abilities
 */
export function drawHand(crewIds) {
  const abilityPool = [];

  // Collect all abilities from crew
  crewIds.forEach(id => {
    const abilities = getCharacterAbilities(id);
    abilityPool.push(...abilities);
  });

  // Shuffle and draw 4
  const shuffled = abilityPool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

/**
 * Check if ability can be cast (stamina requirement)
 * @param {string} abilityId - Ability ID
 * @param {number} currentStamina - Current party stamina
 * @returns {boolean}
 */
export function canCastAbility(abilityId, currentStamina) {
  const ability = getAbility(abilityId);
  if (!ability) return false;
  return currentStamina >= ability.staminaCost;
}

/**
 * Get ability display card data for UI
 * @param {string} abilityId - Ability ID
 * @returns {Object}
 */
export function getAbilityCardData(abilityId) {
  const ability = getAbility(abilityId);
  if (!ability) return null;

  return {
    id: ability.id,
    name: ability.name,
    cost: ability.staminaCost,
    damage: ability.damage || 0,
    speed: ability.speed === SPEED.FAST ? 'Fast' : ability.speed === SPEED.SLOW ? 'Slow' : ability.speed === SPEED.VARIABLE ? 'Variable' : 'Normal',
    type: ability.type,
    description: ability.shortDescription,
    fullDescription: ability.description,
    characterId: ability.characterId
  };
}

/**
 * Calculate total ability cost for combo preview
 * @param {string[]} abilityIds - Array of ability IDs
 * @returns {number}
 */
export function calculateTotalCost(abilityIds) {
  return abilityIds.reduce((total, id) => {
    const ability = getAbility(id);
    return total + (ability ? ability.staminaCost : 0);
  }, 0);
}
