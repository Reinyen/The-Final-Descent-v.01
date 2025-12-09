/**
 * The Final Descent - Main Database Access Layer
 * Unified interface for all game data
 *
 * Usage:
 *   import { GameDB } from './data/database.js';
 *
 *   const character = GameDB.getCharacter('iona');
 *   const ability = GameDB.getAbility('iona_shield_bash');
 *   const combo = GameDB.getCombo('combo_coordinated_strike');
 */

// Import all database modules
import * as Constants from './constants.js';
import * as Characters from './characters.js';
import * as Abilities from './abilities.js';
import * as Combos from './combos.js';
import * as Status from './status.js';

// ============================================================================
// GAME DATABASE - UNIFIED ACCESS LAYER
// ============================================================================

export const GameDB = {
  // ==========================================================================
  // CONSTANTS
  // ==========================================================================

  SPEED: Constants.SPEED,
  STAMINA: Constants.STAMINA,
  COMBAT: Constants.COMBAT,
  CHARACTER_ID: Constants.CHARACTER_ID,
  ABILITY_TYPE: Constants.ABILITY_TYPE,
  STATUS_ID: Constants.STATUS_ID,
  MODIFIER: Constants.MODIFIER,
  MUTATION_THRESHOLD: Constants.MUTATION_THRESHOLD,
  STRESS_THRESHOLD: Constants.STRESS_THRESHOLD,
  CREW_SELECTION: Constants.CREW_SELECTION,
  HAND: Constants.HAND,
  RINGS: Constants.RINGS,
  ARCHIVE: Constants.ARCHIVE,
  COLOR: Constants.COLOR,
  ANIMATION: Constants.ANIMATION,
  SOUND: Constants.SOUND,

  // ==========================================================================
  // CHARACTER METHODS
  // ==========================================================================

  /**
   * Get character by ID
   * @param {string} id - Character ID
   * @returns {Object|null}
   */
  getCharacter(id) {
    return Characters.getCharacter(id);
  },

  /**
   * Get all characters
   * @returns {Object[]}
   */
  getAllCharacters() {
    return Characters.getAllCharacters();
  },

  /**
   * Get multiple characters by IDs
   * @param {string[]} ids - Array of character IDs
   * @returns {Object[]}
   */
  getCharactersByIds(ids) {
    return Characters.getCharactersByIds(ids);
  },

  /**
   * Get random characters for crew selection
   * @param {number} count - Number to select
   * @param {string[]} exclude - IDs to exclude
   * @returns {Object[]}
   */
  getRandomCharacters(count = 3, exclude = []) {
    return Characters.getRandomCharacters(count, exclude);
  },

  /**
   * Get character display info for UI
   * @param {string} id - Character ID
   * @returns {Object}
   */
  getCharacterDisplayInfo(id) {
    return Characters.getCharacterDisplayInfo(id);
  },

  /**
   * Create Echo version of character
   * @param {string} characterId - Original character ID
   * @returns {Object}
   */
  createEcho(characterId) {
    return Characters.createEcho(characterId);
  },

  /**
   * Get all Echoes from crew selection
   * @param {string[]} selectedIds - Living crew IDs
   * @returns {Object[]}
   */
  getEchoesFromSelection(selectedIds) {
    return Characters.getEchoesFromSelection(selectedIds);
  },

  // ==========================================================================
  // ABILITY METHODS
  // ==========================================================================

  /**
   * Get ability by ID
   * @param {string} id - Ability ID
   * @returns {Object|null}
   */
  getAbility(id) {
    return Abilities.getAbility(id);
  },

  /**
   * Get all abilities for a character
   * @param {string} characterId - Character ID
   * @returns {Object[]}
   */
  getCharacterAbilities(characterId) {
    return Abilities.getCharacterAbilities(characterId);
  },

  /**
   * Get abilities by IDs
   * @param {string[]} ids - Array of ability IDs
   * @returns {Object[]}
   */
  getAbilitiesByIds(ids) {
    return Abilities.getAbilitiesByIds(ids);
  },

  /**
   * Draw 4 random abilities for hand
   * @param {string[]} crewIds - Array of 3 character IDs
   * @returns {Object[]}
   */
  drawHand(crewIds) {
    return Abilities.drawHand(crewIds);
  },

  /**
   * Check if ability can be cast
   * @param {string} abilityId - Ability ID
   * @param {number} currentStamina - Current stamina
   * @returns {boolean}
   */
  canCastAbility(abilityId, currentStamina) {
    return Abilities.canCastAbility(abilityId, currentStamina);
  },

  /**
   * Get ability card data for UI
   * @param {string} abilityId - Ability ID
   * @returns {Object}
   */
  getAbilityCardData(abilityId) {
    return Abilities.getAbilityCardData(abilityId);
  },

  /**
   * Calculate total stamina cost
   * @param {string[]} abilityIds - Array of ability IDs
   * @returns {number}
   */
  calculateTotalCost(abilityIds) {
    return Abilities.calculateTotalCost(abilityIds);
  },

  // ==========================================================================
  // COMBO METHODS
  // ==========================================================================

  /**
   * Get combo by ID
   * @param {string} id - Combo ID
   * @returns {Object|null}
   */
  getCombo(id) {
    return Combos.getCombo(id);
  },

  /**
   * Get all combos
   * @returns {Object[]}
   */
  getAllCombos() {
    return Combos.getAllCombos();
  },

  /**
   * Get available combos for current crew
   * @param {string[]} crewIds - Living crew IDs
   * @returns {Object[]}
   */
  getAvailableCombos(crewIds) {
    return Combos.getAvailableCombos(crewIds);
  },

  /**
   * Check if combo can be used
   * @param {string} comboId - Combo ID
   * @param {string[]} crewIds - Living crew IDs
   * @param {boolean} usedThisCombat - Already used a combo?
   * @returns {boolean}
   */
  canUseCombo(comboId, crewIds, usedThisCombat = false) {
    return Combos.canUseCombo(comboId, crewIds, usedThisCombat);
  },

  /**
   * Get combo card data for UI
   * @param {string} comboId - Combo ID
   * @returns {Object}
   */
  getComboCardData(comboId) {
    return Combos.getComboCardData(comboId);
  },

  /**
   * Get combo pairs with availability
   * @param {string[]} livingCrewIds - Current living crew
   * @returns {Object[]}
   */
  getComboPairs(livingCrewIds = []) {
    return Combos.getComboPairs(livingCrewIds);
  },

  /**
   * Get combos for specific character
   * @param {string} characterId - Character ID
   * @returns {Object[]}
   */
  getCombosByCharacter(characterId) {
    return Combos.getCombosByCharacter(characterId);
  },

  /**
   * Check if any combos available
   * @param {string[]} crewIds - Living crew IDs
   * @returns {boolean}
   */
  hasAvailableCombos(crewIds) {
    return Combos.hasAvailableCombos(crewIds);
  },

  // ==========================================================================
  // STATUS METHODS
  // ==========================================================================

  /**
   * Get status effect by ID
   * @param {string} id - Status ID
   * @returns {Object|null}
   */
  getStatusEffect(id) {
    return Status.getStatusEffect(id);
  },

  /**
   * Get all status effects
   * @returns {Object[]}
   */
  getAllStatusEffects() {
    return Status.getAllStatusEffects();
  },

  /**
   * Get status effects by type
   * @param {string} type - 'buff' | 'debuff' | 'pressure'
   * @returns {Object[]}
   */
  getStatusEffectsByType(type) {
    return Status.getStatusEffectsByType(type);
  },

  /**
   * Get status display data for UI
   * @param {string} statusId - Status ID
   * @param {Object} data - Additional data
   * @returns {Object}
   */
  getStatusDisplayData(statusId, data = {}) {
    return Status.getStatusDisplayData(statusId, data);
  },

  // ==========================================================================
  // MUTATION METHODS
  // ==========================================================================

  /**
   * Get mutation by ID
   * @param {string} id - Mutation ID
   * @returns {Object|null}
   */
  getMutation(id) {
    return Status.getMutation(id);
  },

  /**
   * Get all mutations
   * @returns {Object[]}
   */
  getAllMutations() {
    return Status.getAllMutations();
  },

  /**
   * Get mutations by tier
   * @param {number} tier - 1, 2, or 3
   * @returns {Object[]}
   */
  getMutationsByTier(tier) {
    return Status.getMutationsByTier(tier);
  },

  /**
   * Get available mutations for current level
   * @param {number} currentMutation - Current mutation value
   * @returns {Object[]}
   */
  getAvailableMutations(currentMutation) {
    return Status.getAvailableMutations(currentMutation);
  },

  /**
   * Get random mutation for tier
   * @param {number} tier - 1, 2, or 3
   * @returns {Object}
   */
  getRandomMutation(tier) {
    return Status.getRandomMutation(tier);
  },

  /**
   * Check if character should transform
   * @param {number} mutationLevel - Current mutation
   * @returns {boolean}
   */
  shouldTransform(mutationLevel) {
    return Status.shouldTransform(mutationLevel);
  },

  /**
   * Check if character should panic
   * @param {number} stressLevel - Current stress
   * @returns {boolean}
   */
  shouldPanic(stressLevel) {
    return Status.shouldPanic(stressLevel);
  },

  /**
   * Get damage modifiers from mutation
   * @param {number} mutationLevel - Current mutation
   * @returns {Object}
   */
  getMutationDamageModifiers(mutationLevel) {
    return Status.getMutationDamageModifiers(mutationLevel);
  },

  /**
   * Get mutation visual effects
   * @param {string[]} mutationIds - Active mutation IDs
   * @returns {string[]}
   */
  getMutationVisualEffects(mutationIds) {
    return Status.getMutationVisualEffects(mutationIds);
  },

  // ==========================================================================
  // COMBAT UTILITIES
  // ==========================================================================

  /**
   * Calculate final damage with all modifiers
   * @param {Object} params - Damage calculation parameters
   * @returns {number}
   */
  calculateDamage(params) {
    const {
      baseDamage,
      characterModifier = 1.0,
      isMarked = false,
      isLensed = false,
      hasGuardianStance = false,
      isWeakened = false,
      targetDefense = 0,
      mutationLevel = 0,
      isCrit = false
    } = params;

    let damage = baseDamage * characterModifier;

    // Apply mutation damage modifiers
    const mutationMods = this.getMutationDamageModifiers(mutationLevel);
    damage *= mutationMods.dealt;

    // Apply status multipliers
    if (isMarked) damage *= Constants.MODIFIER.MARKED;
    if (isLensed) damage *= Constants.MODIFIER.LENSED;
    if (hasGuardianStance) damage *= Constants.MODIFIER.GUARDIAN_STANCE;
    if (isWeakened) damage += Constants.MODIFIER.WEAKENED_FLAT;

    // Apply critical hit
    if (isCrit) damage *= Constants.COMBAT.CRIT_MULTIPLIER;

    // Subtract defense
    damage -= targetDefense;

    // Minimum damage
    return Math.max(Constants.COMBAT.MINIMUM_DAMAGE, Math.floor(damage));
  },

  /**
   * Calculate turn order for combat
   * @param {Object[]} entities - Array of combatants with speed values
   * @returns {Object[]} Sorted by initiative
   */
  calculateTurnOrder(entities) {
    return entities.sort((a, b) => {
      // Higher speed goes first
      if (b.speed !== a.speed) {
        return b.speed - a.speed;
      }
      // Ties: player entities go first
      if (a.isPlayer && !b.isPlayer) return -1;
      if (!a.isPlayer && b.isPlayer) return 1;
      // Same type: maintain original order
      return 0;
    });
  },

  /**
   * Roll for critical hit
   * @param {number} baseChance - Base crit chance (default 0.05)
   * @param {number} bonus - Additional crit chance
   * @returns {boolean}
   */
  rollCritical(baseChance = Constants.COMBAT.BASE_CRIT_CHANCE, bonus = 0) {
    const totalChance = baseChance + bonus;
    return Math.random() < totalChance;
  },

  // ==========================================================================
  // CREW SELECTION UTILITIES
  // ==========================================================================

  /**
   * Perform initial crew draw (3 random characters)
   * @returns {Object[]} 3 random characters
   */
  initialCrewDraw() {
    return this.getRandomCharacters(3);
  },

  /**
   * Perform full reroll (discard all, draw 3 new)
   * @param {string[]} currentIds - Current crew IDs
   * @returns {Object[]} 3 new random characters
   */
  fullReroll(currentIds = []) {
    return this.getRandomCharacters(3);
  },

  /**
   * Perform single swap (replace 1, keep 2)
   * @param {string[]} keepIds - 2 character IDs to keep
   * @returns {Object} New character to replace third slot
   */
  singleSwap(keepIds) {
    if (keepIds.length !== 2) {
      throw new Error('Single swap requires exactly 2 characters to keep');
    }

    const available = this.getAllCharacters().filter(
      char => !keepIds.includes(char.id)
    );

    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled[0];
  },

  // ==========================================================================
  // DATA VALIDATION
  // ==========================================================================

  /**
   * Validate database integrity (for testing)
   * @returns {Object} Validation results
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Check all characters have 6 abilities
    const chars = this.getAllCharacters();
    chars.forEach(char => {
      const abilities = this.getCharacterAbilities(char.id);
      if (abilities.length !== 6) {
        errors.push(`Character ${char.id} has ${abilities.length} abilities (expected 6)`);
      }
    });

    // Check all combos have valid character IDs
    const combos = this.getAllCombos();
    combos.forEach(combo => {
      combo.requiredCrew.forEach(id => {
        if (!this.getCharacter(id)) {
          errors.push(`Combo ${combo.id} references invalid character ${id}`);
        }
      });
    });

    // Check ability costs are within range
    const allAbilities = Object.values(Abilities.ABILITIES);
    allAbilities.forEach(ability => {
      if (ability.staminaCost < 0 || ability.staminaCost > 3) {
        warnings.push(`Ability ${ability.id} has unusual stamina cost: ${ability.staminaCost}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        characters: chars.length,
        abilities: allAbilities.length,
        combos: combos.length,
        statusEffects: this.getAllStatusEffects().length,
        mutations: this.getAllMutations().length
      }
    };
  }
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default GameDB;

// ============================================================================
// CONVENIENCE EXPORTS (for direct imports)
// ============================================================================

export { Constants, Characters, Abilities, Combos, Status };

// ============================================================================
// DATABASE INFO
// ============================================================================

export const DATABASE_INFO = {
  version: '1.0.0',
  lastUpdated: '2025-12-09',
  totalCharacters: 6,
  totalAbilities: 36,
  totalCombos: 10,
  totalStatusEffects: 13,
  totalMutations: 12,
  description: 'Complete game database for The Final Descent'
};

// Log database initialization (development only)
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  console.log('[GameDB] Database initialized', DATABASE_INFO);
  const validation = GameDB.validate();
  if (!validation.valid) {
    console.error('[GameDB] Validation errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('[GameDB] Validation warnings:', validation.warnings);
  }
  console.log('[GameDB] Summary:', validation.summary);
}
