/**
 * Character Data
 * Defines the 6 unique characters available in the Roster Selection screen.
 *
 * Required fields per GDD §4.1:
 * - id: unique, stable identifier
 * - name: character name
 * - roleLabel: character role/class
 * - portrait: asset reference (placeholder for now)
 * - constellation: deterministic seed for shader pattern
 * - stats: { HP, CON, SPD }
 * - abilities: array of 3 abilities with name + description
 * - portraitAlt: accessibility text
 * - themeColor: per-character accent for constellation tint
 */

export const CHARACTERS = [
  {
    id: 'char_001_voidwalker',
    name: 'Kael the Voidwalker',
    roleLabel: 'Shadow Assassin',
    portrait: null, // Placeholder - will be replaced with actual asset
    portraitAlt: 'A hooded figure shrouded in swirling void energy',
    constellation: 0x1A2B3C, // Deterministic seed for constellation pattern
    themeColor: '#9932C8', // Purple
    stats: {
      HP: 85,
      CON: 12,
      SPD: 18
    },
    abilities: [
      {
        name: 'Void Step',
        description: 'Teleport through shadows, evading attacks'
      },
      {
        name: 'Dark Blade',
        description: 'Strike from darkness with lethal precision'
      },
      {
        name: 'Shadow Merge',
        description: 'Become untargetable in deep shadows'
      }
    ]
  },
  {
    id: 'char_002_starforged',
    name: 'Lyra Starforged',
    roleLabel: 'Celestial Knight',
    portrait: null,
    portraitAlt: 'A knight in gleaming armor etched with constellation patterns',
    constellation: 0x4D5E6F,
    themeColor: '#60A5FA', // Blue
    stats: {
      HP: 120,
      CON: 18,
      SPD: 10
    },
    abilities: [
      {
        name: 'Stellar Shield',
        description: 'Summon a barrier of starlight to protect allies'
      },
      {
        name: 'Comet Strike',
        description: 'Charge forward with devastating impact'
      },
      {
        name: 'Constellation Heal',
        description: 'Channel cosmic energy to restore vitality'
      }
    ]
  },
  {
    id: 'char_003_entropist',
    name: 'Zephyr the Entropist',
    roleLabel: 'Chaos Mage',
    portrait: null,
    portraitAlt: 'A robed figure with fractured reality swirling around them',
    constellation: 0x7F8A9B,
    themeColor: '#32C864', // Green/Teal
    stats: {
      HP: 70,
      CON: 8,
      SPD: 14
    },
    abilities: [
      {
        name: 'Reality Fracture',
        description: 'Shatter spacetime to damage and disorient foes'
      },
      {
        name: 'Entropy Burst',
        description: 'Unleash chaotic energy in all directions'
      },
      {
        name: 'Probability Warp',
        description: 'Manipulate chance to alter outcomes'
      }
    ]
  },
  {
    id: 'char_004_grimkeeper',
    name: 'Mordain Grimkeeper',
    roleLabel: 'Necromancer',
    portrait: null,
    portraitAlt: 'A skeletal figure wrapped in tattered robes, holding an ancient tome',
    constellation: 0xA1B2C3,
    themeColor: '#10B981', // Teal
    stats: {
      HP: 90,
      CON: 14,
      SPD: 8
    },
    abilities: [
      {
        name: 'Raise Dead',
        description: 'Summon skeletal warriors from fallen enemies'
      },
      {
        name: 'Life Drain',
        description: 'Siphon vitality from the living to sustain yourself'
      },
      {
        name: 'Death Mark',
        description: 'Curse a target to take amplified damage'
      }
    ]
  },
  {
    id: 'char_005_stormcaller',
    name: 'Thalia Stormcaller',
    roleLabel: 'Lightning Sorcerer',
    portrait: null,
    portraitAlt: 'A woman with crackling lightning emanating from her hands',
    constellation: 0xD4E5F6,
    themeColor: '#06B6D4', // Cyan
    stats: {
      HP: 75,
      CON: 10,
      SPD: 16
    },
    abilities: [
      {
        name: 'Chain Lightning',
        description: 'Arc electricity between multiple targets'
      },
      {
        name: 'Thunderclap',
        description: 'Create a shockwave that stuns nearby foes'
      },
      {
        name: 'Storm Shield',
        description: 'Surround yourself with protective lightning'
      }
    ]
  },
  {
    id: 'char_006_bloodbound',
    name: 'Riven the Bloodbound',
    roleLabel: 'Berserker',
    portrait: null,
    portraitAlt: 'A scarred warrior wielding twin axes, eyes glowing crimson',
    constellation: 0x123456,
    themeColor: '#EF4444', // Red
    stats: {
      HP: 110,
      CON: 16,
      SPD: 12
    },
    abilities: [
      {
        name: 'Blood Rage',
        description: 'Sacrifice HP to deal massive damage'
      },
      {
        name: 'Reckless Assault',
        description: 'Attack with fury, ignoring defense'
      },
      {
        name: 'Crimson Recovery',
        description: 'Heal based on damage dealt to enemies'
      }
    ]
  }
];

/**
 * Get character by ID
 * @param {string} id - Character ID
 * @returns {object|null} Character data or null if not found
 */
export function getCharacterById(id) {
  return CHARACTERS.find(char => char.id === id) || null;
}

/**
 * Get all character IDs
 * @returns {string[]} Array of all character IDs
 */
export function getAllCharacterIds() {
  return CHARACTERS.map(char => char.id);
}

/**
 * Validate character data integrity
 * @returns {boolean} True if all characters have required fields
 */
export function validateCharacterData() {
  const requiredFields = ['id', 'name', 'roleLabel', 'constellation', 'stats', 'abilities', 'portraitAlt', 'themeColor'];

  for (const char of CHARACTERS) {
    // Check required fields
    for (const field of requiredFields) {
      if (!(field in char)) {
        console.error(`[CharacterData] Missing field '${field}' in character:`, char.id);
        return false;
      }
    }

    // Check stats structure
    if (!char.stats.HP || !char.stats.CON || !char.stats.SPD) {
      console.error(`[CharacterData] Invalid stats in character:`, char.id);
      return false;
    }

    // Check abilities array
    if (!Array.isArray(char.abilities) || char.abilities.length !== 3) {
      console.error(`[CharacterData] Invalid abilities in character:`, char.id);
      return false;
    }

    // Check each ability has name and description
    for (const ability of char.abilities) {
      if (!ability.name || !ability.description) {
        console.error(`[CharacterData] Invalid ability in character:`, char.id);
        return false;
      }
    }
  }

  return true;
}
