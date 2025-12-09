/**
 * Character Database
 * The Final Descent - All crew member definitions
 */

import { CHARACTER_ID, SPEED, COLOR } from './constants.js';

// ============================================================================
// CHARACTER BASE STATS
// ============================================================================

/**
 * Character data structure
 * @typedef {Object} Character
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {string} title - Role/title
 * @property {number} baseHP - Starting HP
 * @property {number} damageModifier - Damage multiplier (0.7 - 1.2)
 * @property {number} baseSpeed - SPEED.FAST | SPEED.NORMAL | SPEED.SLOW
 * @property {number} baseDefense - Flat damage reduction
 * @property {string[]} abilityIds - Array of 6 ability IDs
 * @property {string} color - Theme color (hex)
 * @property {string} description - Character backstory/description
 * @property {string} specialization - Combat role
 */

export const CHARACTERS = {
  [CHARACTER_ID.IONA]: {
    id: CHARACTER_ID.IONA,
    name: 'Iona Kade',
    title: 'Security Chief',
    baseHP: 40,
    damageModifier: 0.9,
    baseSpeed: SPEED.NORMAL,
    baseDefense: 5,
    abilityIds: [
      'iona_shield_bash',
      'iona_defensive_stance',
      'iona_suppressing_fire',
      'iona_guardian_protocol',
      'iona_tactical_advance',
      'iona_last_stand'
    ],
    color: COLOR.IONA,
    specialization: 'Tank',
    description: 'Former military contractor turned station security. Iona\'s tactical expertise and protective instincts make her the shield between the crew and oblivion.',
    quote: '"I\'ve lost count of the people I\'ve failed to protect. Not this time."',
    personality: 'Stoic, duty-bound, haunted by past failures',
    passiveEffect: null // No passive in base design
  },

  [CHARACTER_ID.RHEA]: {
    id: CHARACTER_ID.RHEA,
    name: 'Dr. Rhea Myles',
    title: 'Botanist',
    baseHP: 25,
    damageModifier: 1.0,
    baseSpeed: SPEED.NORMAL,
    baseDefense: 2,
    abilityIds: [
      'rhea_toxic_spores',
      'rhea_overgrowth',
      'rhea_parasitic_vines',
      'rhea_pheromone_cloud',
      'rhea_thorn_volley',
      'rhea_bloom_of_decay'
    ],
    color: COLOR.RHEA,
    specialization: 'DoT (Damage over Time)',
    description: 'Hydroponic specialist who watched her garden sanctuary become a weapon. Rhea weaponizes nature\'s cruelty with calculated precision.',
    quote: '"Growth and decay—two sides of the same cycle. I\'ve mastered both."',
    personality: 'Calculating, pragmatic, emotionally distant',
    passiveEffect: null
  },

  [CHARACTER_ID.JONAS]: {
    id: CHARACTER_ID.JONAS,
    name: 'Jonas Reeve',
    title: 'Technician',
    baseHP: 20,
    damageModifier: 0.8,
    baseSpeed: SPEED.FAST,
    baseDefense: 1,
    abilityIds: [
      'jonas_quick_fix',
      'jonas_overcharge',
      'jonas_system_scan',
      'jonas_emergency_power',
      'jonas_discharge',
      'jonas_full_reboot'
    ],
    color: COLOR.JONAS,
    specialization: 'Support',
    description: 'Young systems engineer who knows every wire and circuit in the station. Jonas keeps the crew functioning when everything else fails.',
    quote: '"I can fix anything—except the fundamental laws of physics."',
    personality: 'Optimistic, resourceful, denial about their situation',
    passiveEffect: {
      type: 'stamina_regen',
      value: 1,
      description: 'Party gains +1 stamina regeneration per round'
    }
  },

  [CHARACTER_ID.SARA]: {
    id: CHARACTER_ID.SARA,
    name: 'Captain Sara Chen',
    title: 'Commander',
    baseHP: 30,
    damageModifier: 1.0,
    baseSpeed: SPEED.NORMAL,
    baseDefense: 3,
    abilityIds: [
      'sara_rally_cry',
      'sara_tactical_order',
      'sara_inspiring_presence',
      'sara_coordinated_assault',
      'sara_strategic_retreat',
      'sara_captains_resolve'
    ],
    color: COLOR.SARA,
    specialization: 'Balanced',
    description: 'Station commander who made the hard calls. Sara leads not through hope, but through acceptance of what must be done.',
    quote: '"Command means choosing who lives and who becomes a memory."',
    personality: 'Authoritative, burden of leadership, pragmatic',
    passiveEffect: null
  },

  [CHARACTER_ID.KAI]: {
    id: CHARACTER_ID.KAI,
    name: 'Dr. Kai Torres',
    title: 'Physicist',
    baseHP: 20,
    damageModifier: 1.2,
    baseSpeed: SPEED.SLOW,
    baseDefense: 0,
    abilityIds: [
      'kai_quantum_strike',
      'kai_time_dilation',
      'kai_gravity_well',
      'kai_phase_shift',
      'kai_particle_beam',
      'kai_singularity'
    ],
    color: COLOR.KAI,
    specialization: 'Burst Damage',
    description: 'Theoretical physicist who studied black holes from a distance—until they got too close. Kai bends reality itself as a weapon.',
    quote: '"The math was always perfect. Reality just couldn\'t keep up."',
    personality: 'Obsessive, brilliant, dissociating from horror',
    passiveEffect: {
      type: 'crit_chance',
      value: 0.10,
      description: 'Kai\'s abilities have +10% critical hit chance'
    }
  },

  [CHARACTER_ID.MAYA]: {
    id: CHARACTER_ID.MAYA,
    name: 'Maya Okonkwo',
    title: 'Life Support Specialist',
    baseHP: 25,
    damageModifier: 0.7,
    baseSpeed: SPEED.NORMAL,
    baseDefense: 2,
    abilityIds: [
      'maya_emergency_heal',
      'maya_purifying_breath',
      'maya_vital_signs',
      'maya_adrenaline_shot',
      'maya_bioscan',
      'maya_resurrection_protocol'
    ],
    color: COLOR.MAYA,
    specialization: 'Healer',
    description: 'Medical officer who keeps bodies breathing when hope has died. Maya fights entropy itself, one heartbeat at a time.',
    quote: '"I\'ve kept people alive past the point they wanted to die. This is no different."',
    personality: 'Compassionate but detached, clinical efficiency',
    passiveEffect: null
  }
};

// ============================================================================
// CHARACTER UTILITIES
// ============================================================================

/**
 * Get character by ID
 * @param {string} id - Character ID
 * @returns {Character|null}
 */
export function getCharacter(id) {
  return CHARACTERS[id] || null;
}

/**
 * Get all characters as array
 * @returns {Character[]}
 */
export function getAllCharacters() {
  return Object.values(CHARACTERS);
}

/**
 * Get characters by IDs
 * @param {string[]} ids - Array of character IDs
 * @returns {Character[]}
 */
export function getCharactersByIds(ids) {
  return ids.map(id => CHARACTERS[id]).filter(Boolean);
}

/**
 * Get random characters
 * @param {number} count - Number of characters to select
 * @param {string[]} exclude - Character IDs to exclude
 * @returns {Character[]}
 */
export function getRandomCharacters(count = 3, exclude = []) {
  const available = getAllCharacters().filter(char => !exclude.includes(char.id));
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get character display info for UI
 * @param {string} id - Character ID
 * @returns {Object}
 */
export function getCharacterDisplayInfo(id) {
  const char = getCharacter(id);
  if (!char) return null;

  return {
    id: char.id,
    name: char.name,
    title: char.title,
    color: char.color,
    specialization: char.specialization,
    description: char.description,
    quote: char.quote,
    stats: {
      hp: char.baseHP,
      defense: char.baseDefense,
      speed: char.baseSpeed === SPEED.FAST ? 'Fast' : char.baseSpeed === SPEED.SLOW ? 'Slow' : 'Normal',
      damageModifier: `${Math.round(char.damageModifier * 100)}%`
    },
    passive: char.passiveEffect ? char.passiveEffect.description : null
  };
}

// ============================================================================
// ECHO VERSIONS (For encounters with dead crew)
// ============================================================================

/**
 * Create Echo version of character
 * @param {string} characterId - Original character ID
 * @returns {Object} Echo enemy data
 */
export function createEcho(characterId) {
  const original = getCharacter(characterId);
  if (!original) return null;

  return {
    id: `echo_${characterId}`,
    name: `Echo: ${original.name}`,
    displayName: original.name, // For UI, show original name
    title: `The Forgotten ${original.title}`,
    isEcho: true,
    originalId: characterId,

    // Echo stats (from GDD)
    hp: 30,
    defense: 2,
    speed: SPEED.NORMAL,

    // Visual
    color: COLOR.ECHO,
    corruptedColor: original.color,

    // Special mechanic
    specialEffect: {
      type: 'echo_resonance',
      description: 'When damaged, increases living crew mutation by 5',
      trigger: 'on_damaged'
    },

    // Corrupted abilities (2-3 signature moves)
    abilities: [
      `${characterId}_echo_ability_1`,
      `${characterId}_echo_ability_2`,
      `${characterId}_echo_ability_3`
    ],

    // Lore
    lastWords: getEchoLastWords(characterId),
    description: `A twisted reflection of ${original.name}, corrupted by the station's dying consciousness.`
  };
}

/**
 * Get Echo encounter dialogue
 * @param {string} characterId
 * @returns {string}
 */
function getEchoLastWords(characterId) {
  const lastWords = {
    [CHARACTER_ID.IONA]: '"You left me behind. I was supposed to protect everyone..."',
    [CHARACTER_ID.RHEA]: '"The garden is screaming. Can\'t you hear it? They\'re all screaming..."',
    [CHARACTER_ID.JONAS]: '"I could have fixed this. Given more time. Just... more... time..."',
    [CHARACTER_ID.SARA]: '"Wrong choice. Always the wrong choice. Let me show you..."',
    [CHARACTER_ID.KAI]: '"The math was wrong. I was wrong. Everything collapses..."',
    [CHARACTER_ID.MAYA]: '"I felt everyone die. Every heartbeat, stopping. One by one..."'
  };

  return lastWords[characterId] || '"..."';
}

/**
 * Get all possible Echoes for a crew selection
 * @param {string[]} selectedIds - IDs of living crew
 * @returns {Object[]} Array of Echo data
 */
export function getEchoesFromSelection(selectedIds) {
  const allIds = Object.keys(CHARACTERS);
  const deadIds = allIds.filter(id => !selectedIds.includes(id));
  return deadIds.map(id => createEcho(id));
}
