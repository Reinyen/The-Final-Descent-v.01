# Roster Selection UI - Implementation Documentation

## Overview

This implementation provides a comprehensive, deterministic roster selection system with:
- Deterministic PRNG-based character selection and rerolls
- State machine with strict UI-lock semantics
- Responsive two-layer architecture (Three.js + HTML overlay)
- Living cards with selection, hover, and popover interactions
- Fallen portraits with memory flicker effects
- Reroll system with celestial stars and crumble-to-ash animations
- Full integration hooks for game systems

## Architecture

### Layer Structure

**Layer A: Three.js Canvas** (`#fxCanvas`)
- Visual-only layer (`pointer-events: none`)
- Handles particles, vignettes, cinematic effects, and VFX
- Quality tier system (High/Medium/Low/Auto)

**Layer B: UI Overlay** (`#uiOverlay`)
- Interactive layer (`pointer-events: auto`)
- Three-zone layout: Top 20% (title), Middle 50% (Living cards), Bottom 30% (Fallen + controls)
- Responsive design with breakpoints

### Module Structure

```
roster/
├── core/
│   ├── rosterSelection.js      # Deterministic PRNG + selection logic
│   ├── rosterSelection.test.js # Node.js test suite
│   └── rosterStore.js           # State machine + event bus
├── ui/
│   ├── livingCards.js           # Living cards behavior
│   ├── popover.js               # Hover popover with grace region
│   ├── fallenPortraits.js       # Fallen portraits + memory flicker
│   ├── rerollUI.js              # Reroll stars + button gating
│   ├── confirmAction.js         # Confirmation + integration hooks
│   └── devPanel.js              # Dev panel (enabled with ?dev)
├── fx/
│   ├── fxRoot.js                # Three.js initialization
│   ├── qualityManager.js        # Quality tier management
│   ├── fxBackground.js          # Background particles + vignette
│   ├── fxNodes.js               # Star nodes for characters
│   ├── fxMorph.js               # Cinematic morph effects
│   └── fxReroll.js              # Reroll VFX
├── data/
│   └── characters.js            # Character data (6 characters)
├── rosterMain.js                # Main integration file
├── roster.css                   # Complete stylesheet
└── README.md                    # This file
```

## Core Features

### Task 1+2: Deterministic PRNG + Roster Selection ✅

**Module:** `core/rosterSelection.js`

Provides fully deterministic roster selection using Mulberry32 PRNG:

```javascript
import { initSelection, singleReroll, totalReroll } from './core/rosterSelection.js';

// Initialize with seed
const state = initSelection({
  rosterSeed: 12345,
  characters: [/* 6 characters */]
});
// => { livingIds: [3 IDs], fallenIds: [3 IDs], rngState, rerollsRemaining: 3 }

// Single reroll (costs 2)
const newState = singleReroll(state, selectedLivingId);

// Total reroll (costs 1, attempts to avoid identical set)
const newState = totalReroll(state);
```

**Tests:** Run with `node roster/core/rosterSelection.test.js`
- ✅ Determinism (same seed => same results)
- ✅ Partition correctness (3 Living, 3 Fallen, no overlap)
- ✅ Single reroll swaps in from Fallen
- ✅ Total reroll resample logic (up to 10 attempts)

### Task 3: State Machine + UI-Lock Semantics ✅

**Module:** `core/rosterStore.js`

Authoritative state machine with 6 states:
- `EnteringCinematic` (locked)
- `Ready` (unlocked)
- `SingleRerollAnimating` (locked)
- `TotalRerollAnimating` (locked)
- `Confirming` (locked)
- `Exiting` (locked)

**Lock semantics:**
- `uiLocked` is `true` in all non-Ready states
- While locked: clicks ignored, popovers freeze at 60% opacity
- State changes emit events for Three.js layer synchronization

```javascript
import { createRosterStore, States } from './core/rosterStore.js';

const store = createRosterStore();

// Listen to events
store.on('state:change', ({ newState, uiLocked }) => {
  console.log('State:', newState, 'Locked:', uiLocked);
});

// Transitions
store.startCinematic();
store.completeCinematic(); // => Ready
store.startSingleReroll(cardRect);
store.completeSingleReroll(newState); // => Ready
```

**Dev Panel:** Add `?dev` to URL to see live state monitoring.

### Task 4: HTML/CSS Overlay Skeleton + Pointer Routing ✅

**Files:** `roster.css`, `rosterMain.js`

- Canvas: `pointer-events: none` (no input capture)
- Overlay: `pointer-events: auto` (captures all input)
- Three-zone layout with exact percentages (20% / 50% / 30%)
- Fonts: Rajdhani (titles), Cinzel (names), Inter (UI), JetBrains Mono (stats)
- Responsive breakpoints:
  - `<1024px`: Confirm button moves under rerolls
  - `<900px`: Horizontal scroll enabled for Living cards
  - `<700px` height: Fallen portraits reduced size

### Task 5: Living Cards Row ✅

**Module:** `ui/livingCards.js`

- Exactly 3 cards showing name + role only
- Selection behavior: click to select, click another to switch (no deselect)
- Visual states:
  - Default: subtle border glow pulse
  - Hover: brightened border + increased particle motion
  - Selected: gold halo + "marked" glyph + stronger pulse
- Responsive sizing with breakpoints
- Horizontal scroll with:
  - Mouse wheel support (vertical wheel => horizontal scroll)
  - Gradient edge fades when overflow exists
  - Smooth scrolling

### Task 6: Living Hover Popover ✅

**Module:** `ui/popover.js`

- **Delays:** 120ms to open, 80ms to close
- **Grace region:** 16px around card and popover (cursor can move between without closing)
- **Content:**
  - Header: name + role
  - Divider
  - Stats row: HP (red), CON (green), SPD (blue)
  - Abilities list (3 max): name + description + SP cost
  - Missing fields show "—" or "??"
- **Placement:**
  - Default: right of card
  - Flip left if off-screen
  - Clamp in viewport with vertical shift if needed
  - Max width: 320px
  - Internal scroll if content overflows
- **Lock behavior:**
  - Don't open if `uiLocked === true`
  - If open when locked, freeze `anchorRect` and fade to 60% opacity

### Task 7: Fallen Portraits Cluster ✅

**Module:** `ui/fallenPortraits.js`

- Exactly 3 portrait frames with slight overlap (-8px margin)
- Size: 100x120 (90x108 if viewport height < 700px)
- Permanently dimmed vs Living (brightness 0.55)
- Cracked-glass overlay (CSS gradients)
- Name in Cinzel 14px at ~30% opacity
- "FALLEN" label at ~25% opacity
- Non-interactive
- **Memory flicker:**
  - Triggers every 20–30 seconds (randomized)
  - Smooth brighten then dim over 1 second
  - Chromatic glitch shimmer for 150–250ms during flicker
  - No harsh flashes, subtle effects only
  - Paused when `uiLocked === true`

### Task 8: Reroll UI ✅

**Module:** `ui/rerollUI.js`

- **Display:** "Celestial Rerolls" label + 3 discrete star icons
- **Star states:**
  - Unspent: filled/glowing with gold radial gradient + pulse animation
  - Spent: crumble-to-ash animation (20 fragments) then empty/dimmed
- **Button gating:**
  - Single Reroll: requires `selectedLivingId !== null` AND `rerollsRemaining >= 2` AND `!uiLocked`
  - Total Reroll: requires `rerollsRemaining >= 1` AND `!uiLocked`
  - Confirm: disabled when `uiLocked === true`
- **Spend timing:** Stars crumble immediately after gating passes, before animation begins
- **Integration:** Buttons wired to store transitions, which trigger deterministic logic + Three.js VFX

### Task 9: Confirm Action + Payload ✅

**Module:** `ui/confirmAction.js`

- Button disabled when `uiLocked === true`
- On click: transition to `Confirming` state
- **Confirmation payload:**
  ```javascript
  {
    rosterSeed: number,
    livingIds: string[3],
    fallenIds: string[3],
    rerollsRemaining: number
  }
  ```
- **Integration hooks:**
  - **Window callback:** `window.onRosterConfirmed = (payload) => { ... }`
  - **CustomEvent:** `window.addEventListener('roster:confirmed', e => e.detail)`
  - **API:** `window.RosterSelectionAPI.onConfirm(callback)`

- **Fallen assignment hook:**
  - After cinematic completes and state becomes `Ready`
  - Emits `FALLEN_ASSIGNED` once per Fallen ID
  - **Window callback:** `window.onFallenAssigned = ({ characterId, index }) => { ... }`
  - **CustomEvent:** `window.addEventListener('roster:fallenAssigned', e => e.detail)`

### Task 10: Three.js Base Layer ✅

**Module:** `fx/qualityManager.js`, `fx/fxRoot.js`

- Full-screen renderer with capped pixel ratio (prevents extreme overdraw on high-DPI)
- Global particles: subtle stardust drifting downward
- Vignette: darker edges, heavier at bottom
- **Quality tiers:**
  - **High:** 100% particles, 100% post, max 2.0 pixel ratio, all effects enabled
  - **Medium:** 60% particles, 70% post, max 1.5 pixel ratio
  - **Low:** 30% particles, 50% post, max 1.0 pixel ratio, per-card particles disabled
  - **Auto:** Detects based on device capabilities (DPR, memory, GPU, mobile)
- Canvas container uses `pointer-events: none` (enforced)

### Task 11: Entry Cinematic A→E ✅

**Modules:** `fx/cinematicController.js`, `fx/anchorMapping.js`

Complete cinematic sequence implementation:
- **Phase A:** Void expansion (1.0s) + blackout hold (0.18s)
  - Vignette expands from center
  - Smooth fade to darkness
- **Phase B:** Six stars emerge (1.1s)
  - Stars appear in staggered sequence
  - Circular formation with smooth ease-out
  - Vignette recedes
- **Phase C:** Fate chooses (1.2s)
  - Pre-death tell: 3 nodes flicker
  - Fracture effect with cracks spreading
  - Ember + ash particles
  - Fallen nodes marked
- **Phase D:** The fall (0.9s)
  - Fallen nodes drift downward
  - Living nodes remain stable
  - Embers fade during descent
- **Phase E:** Morph to UI anchors (0.9s)
  - **DOMRect to NDC conversion** for precise alignment
  - **Layout freeze:** Measurements captured once at start
  - Smooth lerp from star positions to UI card/portrait positions
  - Store state transitions to Ready on completion
  - FALLEN_ASSIGNED events emitted

**Total duration:** ~5.28 seconds

**Key features:**
- Deterministic easing functions (inOutQuad, outCubic, inCubic, outQuint)
- Staggered animations for natural feel
- Phase tracking and store synchronization
- Frozen anchor measurements prevent layout thrashing

### Task 12: Reroll VFX Sequences ✅

**Module:** `fx/rerollVFXController.js`

**Single Reroll VFX:**
- Phase 1: Shatter (0.4s) - Selected card dims and cracks
- Phase 2: Spiral (0.5s) - Stardust particles spiral upward
- Phase 3: Re-coalesce (0.6s) - Particles reform into swapped card
- Total: ~1.5 seconds
- Strict locking: UI locked throughout, unlocks on VFX completion

**Total Reroll VFX:**
- Phase 1: Shatter (0.5s) - All 3 Living cards shatter with stagger
- Phase 2: Reform (0.7s) - Cards reform into new trio with stagger
- Total: ~1.2 seconds
- Stagger timing: 0.15s between each card for wave effect

**Fallen Portrait Updates:**
- Crack settle micro-effect (0.3s)
- Brief flash then settle
- Synchronized with reroll completion

**Integration:**
- Event-driven: Triggered by store transitions
- Completion callbacks unlock UI via store
- Uniforms control all visual states
- No harsh jumps, smooth transitions throughout

## Usage

### Basic Integration

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="./roster.css" />
</head>
<body>
  <div id="rosterRoot"></div>
  <script type="module">
    import { initializeRosterSelection } from './rosterMain.js';

    initializeRosterSelection({
      rosterSeed: 12345, // Optional: defaults to Date.now()
      enableDevPanel: true // Optional: defaults to ?dev query param
    }).then(({ store, dom, fx }) => {
      console.log('Roster selection ready');

      // Listen for confirmation
      window.RosterSelectionAPI.onConfirm(payload => {
        console.log('User confirmed:', payload);
        // Proceed to game with payload.livingIds
      });
    });
  </script>
</body>
</html>
```

### Testing Determinism

```bash
cd "The Final Descent (vanilla)/roster/core"
node rosterSelection.test.js
```

Expected output:
```
============================================================
ROSTER SELECTION MODULE TESTS
============================================================

Test 1: Determinism...
  ✓ Same seed produces identical initial partitions
  ✓ Single reroll is deterministic
  ✓ Total reroll is deterministic
  ✅ Determinism test passed

... (all 6 tests)

============================================================
✅ ALL TESTS PASSED
============================================================
```

### Dev Panel

Add `?dev` to URL to enable real-time state monitoring:
```
http://localhost:8000/roster/?dev
```

Shows:
- Current state machine state
- UI locked status
- Living/Fallen IDs
- Selected/Hovered IDs
- Rerolls remaining
- Popover state
- Quality tier

## Extending the Implementation

### Adding New Characters

Edit `data/characters.js`:
```javascript
export const characters = [
  // ... existing 6 characters ...
  {
    id: 'newchar',
    name: 'New Character',
    role: 'Role / Archetype',
    stats: { hp: 100, con: 8, spd: 4 },
    abilities: [
      { name: 'Ability 1', sp: 3, desc: 'Description...' },
      { name: 'Ability 2', sp: 3, desc: 'Description...' },
      { name: 'Ability 3', sp: 5, desc: 'Description...' }
    ]
  }
];
```

**Note:** Roster logic expects exactly 6 characters. Adjust `initSelection()` validation if changing roster size.

### Custom Quality Presets

Edit `fx/qualityManager.js`:
```javascript
export const QualityPresets = {
  ULTRA: {
    particleCount: 1.5,
    postStrength: 1.2,
    maxPixelRatio: 3.0,
    enablePerCardParticles: true,
    enableRerollSilhouettes: true,
    label: 'Ultra'
  },
  // ... existing presets ...
};
```

### Custom Integration Events

```javascript
// Listen for any store event
store.on('state:change', ({ oldState, newState, uiLocked }) => {
  // Custom logic on state changes
});

store.on('select:card', ({ characterId }) => {
  // Custom logic on card selection
});

store.on('fallen:assigned', ({ characterId }) => {
  // Custom logic when Fallen are assigned
});
```

## Responsive Behavior

### Breakpoints

| Viewport Width | Behavior |
|----------------|----------|
| ≥1024px | Standard 3-column layout (Fallen \\| Rerolls \\| Confirm) |
| <1024px | Confirm button moves below rerolls |
| <900px | Living cards enable horizontal scroll with gradient fades |
| ≥900px | Living cards centered, no scroll |

| Viewport Height | Behavior |
|-----------------|----------|
| ≥700px | Fallen portraits: 100x120 |
| <700px | Fallen portraits: 90x108 |

### Card Scaling

Living cards scale based on viewport:
- Base: 280x400
- <1200px: 95% scale
- <900px: 85% scale + horizontal scroll

## Performance Optimization

### Quality Tier Selection

Auto-detect uses:
- Device pixel ratio
- Available memory (`navigator.deviceMemory`)
- GPU renderer string
- Mobile/desktop detection

Override with:
```javascript
store.setQualityTier('HIGH'); // or 'MEDIUM', 'LOW'
```

### Pixel Ratio Capping

Prevents overdraw on Retina displays:
```javascript
// In fx/fxRoot.js
renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
```

## Production Ready

All 12 tasks are now **fully implemented and production-ready**:

✅ Tasks 1-2: Deterministic PRNG + roster selection logic with tests
✅ Task 3: State machine + UI-lock semantics
✅ Task 4: HTML/CSS overlay skeleton + pointer routing
✅ Task 5: Living cards row with sizing/scroll/selection
✅ Task 6: Living hover popover with delay/grace/placement
✅ Task 7: Fallen portraits cluster + memory flicker
✅ Task 8: Reroll UI with stars/gating/crumble animation
✅ Task 9: Confirm action + payload + Fallen hook
✅ Task 10: Three.js base layer with quality tiers
✅ Task 11: Entry cinematic A→E + morph anchors
✅ Task 12: Reroll VFX sequences + strict locking

### Optional Enhancements

The implementation is complete and functional. Future enhancements could include:
- **Custom shaders** for more elaborate particle effects (current implementation uses uniform-driven effects)
- **Audio integration** for cinematic phases and reroll sounds
- **Alternative cinematic sequences** for different game contexts
- **Portrait images** support (currently text-only with cracked-glass overlay)

## File Checklist

✅ Core logic:
- `core/rosterSelection.js` (deterministic PRNG + selection)
- `core/rosterSelection.test.js` (test suite)
- `core/rosterStore.js` (state machine + event bus)

✅ UI modules:
- `ui/livingCards.js` (cards row + selection + scroll)
- `ui/popover.js` (hover popover with grace region)
- `ui/fallenPortraits.js` (portraits + memory flicker)
- `ui/rerollUI.js` (stars + button gating)
- `ui/confirmAction.js` (confirmation + integration hooks)
- `ui/devPanel.js` (dev panel)

✅ FX modules:
- `fx/fxRoot.js` (Three.js init)
- `fx/qualityManager.js` (quality tiers)
- `fx/cinematicController.js` (**NEW** - Task 11 cinematic A→E)
- `fx/anchorMapping.js` (**NEW** - DOMRect to NDC conversion)
- `fx/rerollVFXController.js` (**NEW** - Task 12 reroll VFX)
- `fx/fxBackground.js` (existing)
- `fx/fxNodes.js` (existing)
- `fx/fxMorph.js` (existing)
- `fx/fxReroll.js` (existing)

✅ Integration:
- `rosterMain.js` (main entry point with full VFX integration)
- `roster.css` (complete stylesheet)
- `data/characters.js` (character data)
- `index.html` (updated fonts + rosterMain.js import)

## License

This implementation is part of "The Final Descent" game project.
