/**
 * Core Game Constants
 * The Final Descent - Character & Combat Database
 */

// ============================================================================
// SPEED VALUES
// ============================================================================
export const SPEED = {
  FAST: 3,
  NORMAL: 2,
  SLOW: 1,
  VARIABLE: 'variable' // For special abilities like Time Dilation
};

// ============================================================================
// STAMINA SYSTEM
// ============================================================================
export const STAMINA = {
  MAX: 8,
  BASE_REGEN: 4,
  JONAS_BONUS: 1,
  EMERGENCY_POWER_BONUS: 2,
  SYSTEM_STRAIN_PENALTY: 1
};

// ============================================================================
// COMBAT CONSTANTS
// ============================================================================
export const COMBAT = {
  BASE_CRIT_CHANCE: 0.05, // 5%
  CRIT_MULTIPLIER: 1.5,
  MINIMUM_DAMAGE: 1,
  TIE_PRIORITY: 'player' // Player acts first on speed ties
};

// ============================================================================
// CHARACTER IDS
// ============================================================================
export const CHARACTER_ID = {
  IONA: 'iona',
  RHEA: 'rhea',
  JONAS: 'jonas',
  SARA: 'sara',
  KAI: 'kai',
  MAYA: 'maya'
};

// ============================================================================
// ABILITY TYPES
// ============================================================================
export const ABILITY_TYPE = {
  ATTACK: 'attack',
  SUPPORT: 'support',
  CONTROL: 'control',
  DEFENSIVE: 'defensive',
  SPECIAL: 'special'
};

// ============================================================================
// STATUS EFFECT IDS
// ============================================================================
export const STATUS_ID = {
  // Resource Pressures
  MUTATION: 'mutation',
  STRESS: 'stress',
  INJURY: 'injury',

  // Combat Modifiers
  LENSED: 'lensed',
  DELAYED: 'delayed',
  MARKED: 'marked',

  // Additional Combat States
  STUNNED: 'stunned',
  POISONED: 'poisoned',
  GUARDIAN_STANCE: 'guardian_stance',
  FOCUSED: 'focused',
  WEAKENED: 'weakened',
  UNTARGETABLE: 'untargetable',
  TEMP_HP: 'temp_hp'
};

// ============================================================================
// DAMAGE MODIFIERS
// ============================================================================
export const MODIFIER = {
  MARKED: 1.5, // +50% damage taken
  LENSED: 2.0, // 2x effect
  GUARDIAN_STANCE: 0.5, // -50% damage taken
  WEAKENED_FLAT: 3, // +3 flat damage taken
  DEFENSIVE_STANCE: 0.5 // -50% damage taken
};

// ============================================================================
// MUTATION THRESHOLDS
// ============================================================================
export const MUTATION_THRESHOLD = {
  TIER_1: 25,
  TIER_2: 50,
  TIER_3: 75,
  TRANSFORM: 100
};

// ============================================================================
// STRESS THRESHOLDS
// ============================================================================
export const STRESS_THRESHOLD = {
  PANIC: 100
};

// ============================================================================
// CREW SELECTION
// ============================================================================
export const CREW_SELECTION = {
  TOTAL_CREW: 6,
  ACTIVE_CREW: 3,
  ECHO_CREW: 3,
  INITIAL_DRAW: 3,
  FULL_REROLL_CHARGES: 2,
  SINGLE_SWAP_CHARGES: 1
};

// ============================================================================
// CARD HAND
// ============================================================================
export const HAND = {
  SIZE: 4,
  ABILITIES_PER_CHARACTER: 6,
  TOTAL_ABILITY_POOL: 18 // 3 crew × 6 abilities
};

// ============================================================================
// RINGS (MAP STRUCTURE)
// ============================================================================
export const RINGS = {
  TOTAL: 5,
  NODES: {
    1: 7,
    2: 9,
    3: 11,
    4: 13,
    5: 1 // Final arena
  },
  COMPLETION_THRESHOLD: 0.6 // 60% to unlock exit
};

// ============================================================================
// ARCHIVE SYSTEM
// ============================================================================
export const ARCHIVE = {
  MAX_SLOTS: 10,
  SCORING: {
    GENOME_SAMPLE: 500,
    BLACK_BOX_DATA: 300,
    CREW_MEMORY: 200,
    DATA_FRAGMENT: 100,
    LIVING_CREW_BONUS: 1000,
    PERFECT_RUN_BONUS: 10000
  },
  SLOT_SIZES: {
    GENOME_SAMPLE: 2,
    BLACK_BOX_DATA: 1,
    CREW_MEMORY: 1
  }
};

// ============================================================================
// COLOR PALETTE (For UI consistency)
// ============================================================================
export const COLOR = {
  // Character colors
  IONA: '#E63946', // Red - Security
  RHEA: '#06A77D', // Green - Botanist
  JONAS: '#4A90E2', // Blue - Technician
  SARA: '#F77F00', // Orange - Commander
  KAI: '#9D4EDD', // Purple - Physicist
  MAYA: '#E9C46A', // Gold - Life Support

  // UI States
  ACTIVE: '#4A90E2',
  BENEFICIAL: '#06A77D',
  HOSTILE: '#E63946',
  ECHO: '#9D4EDD',
  NEUTRAL: '#FFFFFF',

  // Status effects
  MUTATION: '#9D4EDD',
  STRESS: '#E63946',
  POISON: '#06A77D',
  BUFF: '#4A90E2',
  DEBUFF: '#F77F00'
};

// ============================================================================
// ANIMATION DURATIONS (milliseconds)
// ============================================================================
export const ANIMATION = {
  ABILITY_CAST: 600,
  DAMAGE_NUMBER: 800,
  STATUS_APPLY: 400,
  CARD_DRAW: 300,
  TURN_TRANSITION: 500,
  DEATH: 1200
};

// ============================================================================
// SOUND EVENT IDS (for future audio integration)
// ============================================================================
export const SOUND = {
  ABILITY_CAST: 'ability_cast',
  DAMAGE_HIT: 'damage_hit',
  HEAL: 'heal',
  BUFF: 'buff',
  DEBUFF: 'debuff',
  CARD_DRAW: 'card_draw',
  BUTTON_CLICK: 'button_click',
  MUTATION_GAIN: 'mutation_gain',
  STRESS_GAIN: 'stress_gain'
};
