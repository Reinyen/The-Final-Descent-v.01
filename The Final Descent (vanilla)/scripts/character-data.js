/**
 * Character Data - The Eleventh
 * Defines the 6 unique characters available in the Roster Selection screen.
 * Per GDD Part 1, Section 3.1
 *
 * Required fields:
 * - id: unique, stable identifier
 * - name: character name
 * - roleLabel: character role/class (exact from GDD)
 * - portrait: asset reference (placeholder for now)
 * - constellation: deterministic seed for shader pattern
 * - stats: { HP, CON, SPD } (exact from GDD)
 * - abilities: array of 3 abilities with name, SP cost, and flavor description
 * - portraitAlt: accessibility text
 * - themeColor: golden accent for all characters
 */

export const CHARACTERS = [
  {
    id: 'char_dranick',
    name: 'Dranick',
    roleLabel: 'Tank / Support',
    portrait: null, // Placeholder - will be replaced with actual asset
    portraitAlt: 'A stalwart guardian wielding a heavy mace, standing resolute',
    constellation: 0xD4AF37, // Golden seed
    themeColor: '#FFD700', // Golden
    stats: {
      HP: 120,
      CON: 9,
      SPD: 2
    },
    abilities: [
      {
        name: 'Bonebreaker Mace',
        spCost: 3,
        description: 'Crush foes with brutal force, shattering their guard'
      },
      {
        name: 'Final Vow',
        spCost: 3,
        description: 'Draw enemy attention while fortifying your resolve'
      },
      {
        name: 'Undying Judgment',
        spCost: 5,
        description: 'Deliver devastating judgment, healing from the blow'
      }
    ]
  },
  {
    id: 'char_eline',
    name: 'Eline',
    roleLabel: 'Scout / Status Control',
    portrait: null,
    portraitAlt: 'A swift scout with twin daggers, eyes keen and alert',
    constellation: 0xC9A961,
    themeColor: '#FFD700', // Golden
    stats: {
      HP: 70,
      CON: 8,
      SPD: 6
    },
    abilities: [
      {
        name: 'Twin Thorns',
        spCost: 3,
        description: 'Strike quickly, leaving wounds that bleed and fester'
      },
      {
        name: 'Burrow Buddy',
        spCost: 3,
        description: 'Evade danger with preternatural speed and agility'
      },
      {
        name: 'Marsh Ambush',
        spCost: 5,
        description: 'Exploit weakness, striking hardest against the wounded'
      }
    ]
  },
  {
    id: 'char_varro',
    name: 'Varro',
    roleLabel: 'Balanced / Hybrid',
    portrait: null,
    portraitAlt: 'An arcane warrior wielding crackling energy and blade alike',
    constellation: 0xB8962E,
    themeColor: '#FFD700', // Golden
    stats: {
      HP: 90,
      CON: 8,
      SPD: 4
    },
    abilities: [
      {
        name: 'Arc Lash',
        spCost: 3,
        description: 'Unleash arcing magic that splashes to nearby foes'
      },
      {
        name: 'Spell Parry',
        spCost: 3,
        description: 'Ward yourself with arcane shields that reflect attacks'
      },
      {
        name: 'Gravemark Seal',
        spCost: 5,
        description: 'Brand enemies with death marks, amplifying all harm'
      }
    ]
  },
  {
    id: 'char_kestril',
    name: 'Kestril',
    roleLabel: 'Tactical Support',
    portrait: null,
    portraitAlt: 'A temporal mage with eyes that see beyond the present moment',
    constellation: 0xDAA520,
    themeColor: '#FFD700', // Golden
    stats: {
      HP: 80,
      CON: 10,
      SPD: 3
    },
    abilities: [
      {
        name: 'Future Flare',
        spCost: 3,
        description: 'Mark enemies with visions of their impending doom'
      },
      {
        name: 'Foresight Step',
        spCost: 3,
        description: 'Glimpse the future to move with impossible swiftness'
      },
      {
        name: 'Rewind Pulse',
        spCost: 5,
        description: 'Reverse recent wounds and purge corruption from allies'
      }
    ]
  },
  {
    id: 'char_lira',
    name: 'Lira',
    roleLabel: 'Healer / Agile Striker',
    portrait: null,
    portraitAlt: 'A graceful healer who strikes with surgical precision',
    constellation: 0xE6C35C,
    themeColor: '#FFD700', // Golden
    stats: {
      HP: 85,
      CON: 9,
      SPD: 5
    },
    abilities: [
      {
        name: 'Pressure Point Strike',
        spCost: 3,
        description: 'Target vital points, exposing foes to further harm'
      },
      {
        name: 'Breath',
        spCost: 3,
        description: 'Restore vitality with focused, life-giving energy'
      },
      {
        name: 'Red Thread',
        spCost: 5,
        description: 'Bind an ally\'s fate to yours, sharing their suffering'
      }
    ]
  },
  {
    id: 'char_grim',
    name: 'Grim',
    roleLabel: 'Berserker / Damage',
    portrait: null,
    portraitAlt: 'A towering berserker who trades pain for overwhelming power',
    constellation: 0xCFB53B,
    themeColor: '#FFD700', // Golden
    stats: {
      HP: 110,
      CON: 6,
      SPD: 3
    },
    abilities: [
      {
        name: 'Soilcrack Fist',
        spCost: 3,
        description: 'Unleash brutal force, wounding yourself in the process'
      },
      {
        name: 'Fury Guard',
        spCost: 3,
        description: 'Channel pain into protective rage and power'
      },
      {
        name: 'Relic Howl',
        spCost: 5,
        description: 'Bellow with ancient fury, striking terror into all foes'
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

    // Check each ability has name, spCost, and description
    for (const ability of char.abilities) {
      if (!ability.name || !ability.description || typeof ability.spCost !== 'number') {
        console.error(`[CharacterData] Invalid ability in character:`, char.id, ability);
        return false;
      }
    }
  }

  return true;
}
