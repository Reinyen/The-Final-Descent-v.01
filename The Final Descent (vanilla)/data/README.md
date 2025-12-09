# Game Database Documentation

Complete data layer for **The Final Descent** - all characters, abilities, combos, status effects, and mutations.

## 📁 File Structure

```
data/
├── constants.js      # Core game constants (speeds, costs, IDs)
├── characters.js     # All 6 crew members + Echo generation
├── abilities.js      # 36 basic abilities (6 per character)
├── combos.js         # 10 combo abilities
├── status.js         # Status effects + 12 mutations
├── database.js       # Unified access layer (MAIN IMPORT)
└── README.md         # This file
```

## 🚀 Quick Start

### Import the Database

```javascript
// Recommended: Import unified database
import { GameDB } from './data/database.js';

// Or import specific modules
import { CHARACTERS } from './data/characters.js';
import { ABILITIES } from './data/abilities.js';
```

### Basic Usage Examples

```javascript
// Get a character
const iona = GameDB.getCharacter('iona');
console.log(iona.name); // "Iona Kade"
console.log(iona.baseHP); // 40

// Get character abilities
const ionaAbilities = GameDB.getCharacterAbilities('iona');
// Returns array of 6 ability objects

// Draw a hand of 4 cards for combat
const crew = ['iona', 'jonas', 'maya'];
const hand = GameDB.drawHand(crew);
// Returns 4 random abilities from the 18 possible (3 crew × 6 abilities)

// Check combo availability
const availableCombos = GameDB.getAvailableCombos(['iona', 'jonas', 'sara']);
// Returns combos that can be cast with this crew

// Get character display info for UI
const displayInfo = GameDB.getCharacterDisplayInfo('kai');
console.log(displayInfo.quote); // Kai's character quote
```

## 📊 Database Contents

### Characters (6 total)

| ID | Name | Role | HP | Defense | Speed | Specialization |
|---|---|---|---|---|---|---|
| `iona` | Iona Kade | Security Chief | 40 | 5 | Normal | Tank |
| `rhea` | Dr. Rhea Myles | Botanist | 25 | 2 | Normal | DoT |
| `jonas` | Jonas Reeve | Technician | 20 | 1 | Fast | Support |
| `sara` | Captain Sara Chen | Commander | 30 | 3 | Normal | Balanced |
| `kai` | Dr. Kai Torres | Physicist | 20 | 0 | Slow | Burst |
| `maya` | Maya Okonkwo | Life Support | 25 | 2 | Normal | Healer |

### Abilities (36 total)

**Iona Kade (Tank)**
- Shield Bash, Defensive Stance, Suppressing Fire, Guardian Protocol, Tactical Advance, Last Stand

**Dr. Rhea Myles (DoT)**
- Toxic Spores, Overgrowth, Parasitic Vines, Pheromone Cloud, Thorn Volley, Bloom of Decay

**Jonas Reeve (Support)**
- Quick Fix, Overcharge, System Scan, Emergency Power, Discharge, Full Reboot

**Captain Sara Chen (Balanced)**
- Rally Cry, Tactical Order, Inspiring Presence, Coordinated Assault, Strategic Retreat, Captain's Resolve

**Dr. Kai Torres (Burst)**
- Quantum Strike, Time Dilation, Gravity Well, Phase Shift, Particle Beam, Singularity

**Maya Okonkwo (Healer)**
- Emergency Heal, Purifying Breath, Vital Signs, Adrenaline Shot, Bioscan, Resurrection Protocol

### Combo Abilities (10 total)

Unlocked after completing Ring 1. Only 1 combo per combat.

| Combo | Required Crew | Cost | Effect |
|---|---|---|---|
| Coordinated Strike | Iona + Jonas | 5 | 18 dmg + Marked + 2 stamina |
| Biotic Overflow | Rhea + Maya | 4 | Poison all + Heal all |
| Temporal Anchor | Sara + Kai | 5 | Skip enemy turns + Party Lensed |
| Fortress Protocol | Iona + Sara | 4 | 10 temp HP + Status immunity |
| Reality Cascade | Kai + Rhea | 6 | 25 dmg (50% spread) |
| Emergency Triage | Maya + Jonas | 3 | Revive + Cleanse all |
| Command Override | Sara + Jonas | 4 | Full stamina + Draw 2 |
| Quantum Garden | Kai + Rhea | 5 | Field: 6 dmg/turn |
| Shield Wall | Iona + Maya | 4 | 50% damage (3 attacks) |
| Data Burst | Jonas + Kai | 3 | Reveal intentions + Speed |

### Status Effects (13 total)

**Resource Pressures (Persistent)**
- Mutation (0-100), Stress (0-100), Injury

**Combat Modifiers (Temporary)**
- Lensed, Delayed, Marked, Stunned, Poisoned, Guardian Stance, Focused, Weakened, Untargetable, Temporary HP

### Mutations (12 total)

**Tier 1 (25 Mutation)**
- Photosynthetic Skin, Enhanced Reflexes, Redundant Organs, Heightened Senses

**Tier 2 (50 Mutation)**
- Carapace Formation, Neural Bifurcation, Metabolic Overdrive, Symbiotic Colony

**Tier 3 (75 Mutation)**
- Temporal Desync, Crystalline Bones, Hive Integration, Void Touched

## 🔧 API Reference

### Character Methods

```javascript
GameDB.getCharacter(id)                    // Get single character
GameDB.getAllCharacters()                  // Get all 6 characters
GameDB.getCharactersByIds(ids)             // Get multiple characters
GameDB.getRandomCharacters(count, exclude) // Random selection
GameDB.getCharacterDisplayInfo(id)         // UI-ready data
GameDB.createEcho(characterId)             // Generate Echo enemy
GameDB.getEchoesFromSelection(selectedIds) // Get all Echoes
```

### Ability Methods

```javascript
GameDB.getAbility(id)                  // Get single ability
GameDB.getCharacterAbilities(charId)   // Get all abilities for character
GameDB.getAbilitiesByIds(ids)          // Get multiple abilities
GameDB.drawHand(crewIds)               // Draw 4 random cards
GameDB.canCastAbility(id, stamina)     // Check if castable
GameDB.getAbilityCardData(id)          // UI-ready card data
GameDB.calculateTotalCost(abilityIds)  // Sum stamina costs
```

### Combo Methods

```javascript
GameDB.getCombo(id)                      // Get single combo
GameDB.getAllCombos()                    // Get all combos
GameDB.getAvailableCombos(crewIds)       // Get castable combos
GameDB.canUseCombo(id, crewIds, used)    // Check availability
GameDB.getComboCardData(id)              // UI-ready card data
GameDB.getComboPairs(livingCrewIds)      // Get combo status list
GameDB.getCombosByCharacter(charId)      // Get combos for character
GameDB.hasAvailableCombos(crewIds)       // Check if any available
```

### Status & Mutation Methods

```javascript
GameDB.getStatusEffect(id)                    // Get status effect
GameDB.getAllStatusEffects()                  // Get all status effects
GameDB.getStatusEffectsByType(type)           // Get by type
GameDB.getStatusDisplayData(id, data)         // UI-ready status data
GameDB.getMutation(id)                        // Get mutation
GameDB.getAllMutations()                      // Get all mutations
GameDB.getMutationsByTier(tier)               // Get by tier (1, 2, 3)
GameDB.getAvailableMutations(mutationLevel)   // Get unlocked mutations
GameDB.getRandomMutation(tier)                // Random mutation for tier
GameDB.shouldTransform(mutationLevel)         // Check for transformation
GameDB.shouldPanic(stressLevel)               // Check for panic
GameDB.getMutationDamageModifiers(level)      // Get damage multipliers
GameDB.getMutationVisualEffects(mutationIds)  // Get visual effects
```

### Combat Utilities

```javascript
GameDB.calculateDamage(params)       // Full damage calculation
GameDB.calculateTurnOrder(entities)  // Sort by initiative
GameDB.rollCritical(baseChance, bonus) // Crit roll
```

### Crew Selection Utilities

```javascript
GameDB.initialCrewDraw()       // Initial 3 random characters
GameDB.fullReroll(currentIds)  // Discard all, draw 3 new
GameDB.singleSwap(keepIds)     // Keep 2, replace 1
```

## 🎯 Usage in Different UIs

### Roster Selection UI

```javascript
import { GameDB } from './data/database.js';

// Initial draw
let currentCrew = GameDB.initialCrewDraw();

// Full reroll
currentCrew = GameDB.fullReroll();

// Single swap (keep iona and jonas, replace third)
const newMember = GameDB.singleSwap(['iona', 'jonas']);
currentCrew = [
  GameDB.getCharacter('iona'),
  GameDB.getCharacter('jonas'),
  newMember
];

// Get Echoes (dead crew)
const livingIds = currentCrew.map(c => c.id);
const echoes = GameDB.getEchoesFromSelection(livingIds);
```

### Combat UI

```javascript
import { GameDB } from './data/database.js';

// Draw hand at start of round
const crew = ['iona', 'jonas', 'maya'];
const hand = GameDB.drawHand(crew);

// Check if ability is castable
const canCast = GameDB.canCastAbility('iona_shield_bash', currentStamina);

// Get available combos
const combos = GameDB.getAvailableCombos(crew);

// Calculate damage
const finalDamage = GameDB.calculateDamage({
  baseDamage: 10,
  characterModifier: 0.9,
  isMarked: true,
  targetDefense: 5,
  mutationLevel: 35
});

// Calculate turn order
const turnOrder = GameDB.calculateTurnOrder([
  { id: 'player_iona', speed: 2, isPlayer: true },
  { id: 'enemy_1', speed: 3, isPlayer: false },
  { id: 'player_kai', speed: 1, isPlayer: true }
]);
```

### Map/Node UI

```javascript
import { GameDB } from './data/database.js';

// Get character portraits for UI
const crew = ['iona', 'jonas', 'maya'];
const portraits = crew.map(id => ({
  ...GameDB.getCharacterDisplayInfo(id),
  hp: currentHP[id],
  maxHP: maxHP[id],
  mutation: mutationLevels[id],
  stress: stressLevels[id]
}));

// Check mutation thresholds
if (GameDB.shouldTransform(mutationLevels.iona)) {
  triggerTransformationEvent('iona');
}

// Get available mutations for choice
const availableMutations = GameDB.getAvailableMutations(45);
// Show mutation choice UI with 4 Tier 2 mutations
```

### Character Info Screen

```javascript
import { GameDB } from './data/database.js';

// Get full character details
const charId = 'kai';
const info = GameDB.getCharacterDisplayInfo(charId);
const abilities = GameDB.getCharacterAbilities(charId);
const combos = GameDB.getCombosByCharacter(charId);

// Display character sheet
renderCharacterSheet({
  ...info,
  abilities: abilities.map(a => GameDB.getAbilityCardData(a.id)),
  combos: combos.map(c => GameDB.getComboCardData(c.id))
});
```

## 🧪 Validation

The database includes built-in validation:

```javascript
const validation = GameDB.validate();
console.log(validation);

// Output:
// {
//   valid: true,
//   errors: [],
//   warnings: [],
//   summary: {
//     characters: 6,
//     abilities: 36,
//     combos: 10,
//     statusEffects: 13,
//     mutations: 12
//   }
// }
```

## 📝 Data Structure Examples

### Character Object

```javascript
{
  id: 'iona',
  name: 'Iona Kade',
  title: 'Security Chief',
  baseHP: 40,
  damageModifier: 0.9,
  baseSpeed: 2,
  baseDefense: 5,
  abilityIds: ['iona_shield_bash', ...],
  color: '#E63946',
  specialization: 'Tank',
  description: '...',
  quote: '...',
  passiveEffect: null
}
```

### Ability Object

```javascript
{
  id: 'iona_shield_bash',
  name: 'Shield Bash',
  characterId: 'iona',
  staminaCost: 1,
  damage: 6,
  speed: 2,
  type: 'control',
  effects: [
    { type: 'damage', value: 6 },
    { type: 'status', status: 'stunned', duration: 1 }
  ],
  description: 'Deal 6 damage and stun target for 1 turn.',
  shortDescription: '6 dmg + Stun'
}
```

### Combo Object

```javascript
{
  id: 'combo_coordinated_strike',
  name: 'Coordinated Strike',
  requiredCrew: ['iona', 'jonas'],
  staminaCost: 5,
  speed: 3,
  effects: [...],
  description: '...',
  shortDescription: '18 dmg + Marked + 2 stamina',
  flavorText: '...'
}
```

## 🎨 Color Constants

All character and UI colors are defined in `constants.js`:

```javascript
GameDB.COLOR.IONA    // '#E63946' (Red)
GameDB.COLOR.RHEA    // '#06A77D' (Green)
GameDB.COLOR.JONAS   // '#4A90E2' (Blue)
GameDB.COLOR.SARA    // '#F77F00' (Orange)
GameDB.COLOR.KAI     // '#9D4EDD' (Purple)
GameDB.COLOR.MAYA    // '#E9C46A' (Gold)

GameDB.COLOR.HOSTILE    // Red
GameDB.COLOR.BENEFICIAL // Green
GameDB.COLOR.ECHO       // Purple
```

## 🔒 Immutability

All database objects are read-only. To modify data for game state:

```javascript
// ❌ DON'T modify database directly
const char = GameDB.getCharacter('iona');
char.currentHP = 20; // This affects the database!

// ✅ DO create copies for game state
const char = { ...GameDB.getCharacter('iona') };
char.currentHP = 20; // Only affects this copy
```

## 📦 Module Exports

```javascript
// Default export
import GameDB from './data/database.js';

// Named exports
import { GameDB, Constants, Characters, Abilities, Combos, Status } from './data/database.js';

// Specific module imports
import { CHARACTERS, getCharacter } from './data/characters.js';
import { ABILITIES, drawHand } from './data/abilities.js';
```

## 🐛 Debugging

Database logs validation on localhost:

```javascript
// Console output on page load (localhost only):
[GameDB] Database initialized {version: "1.0.0", ...}
[GameDB] Summary: {characters: 6, abilities: 36, ...}
```

To manually validate:

```javascript
const result = GameDB.validate();
if (!result.valid) {
  console.error('Database errors:', result.errors);
}
```

## 📄 License

Part of The Final Descent project.
