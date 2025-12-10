# Neural Network Map UI - Implementation Guide

## Overview

The Map UI is a fully procedurally generated neural network visualization that serves as the primary navigation system for **The Final Descent**. Each ring (1-5) presents a unique 3D neural network where nodes represent encounters (combat, resource, event, rest) and connections form the paths between them.

## Architecture

### Core Components

1. **`data/map-config.js`** - Configuration and constants
2. **`scripts/map/neural-network-generator.js`** - Procedural map generation
3. **`scripts/map/map-renderer.js`** - Three.js WebGL rendering
4. **`scripts/map/map-ui-overlay.js`** - 2D canvas UI overlay
5. **`scripts/map/map-controller.js`** - Main game logic controller
6. **`map.html`** - Standalone map page

### Technology Stack

- **Three.js** (WebGL) - 3D neural network rendering
- **Custom GLSL Shaders** - Node state effects (crackling energy, glass orbs)
- **2D Canvas Overlay** - Tooltips and UI elements
- **Procedural Generation** - Unique layouts every playthrough

## Node States & Visual Design

### 5 Node States

Based on your specifications:

| State | Visual Effect | Description |
|-------|--------------|-------------|
| **CURRENT** | Glowing blue/teal energy crackle (continuous) | Player's current position |
| **AVAILABLE** | Glowing/crackling golden energy | Nodes that can be clicked/entered |
| **LOCKED** | Faded golden aura | Visible but not reachable |
| **HIDDEN** | Grey and lifeless | Not yet revealed by fog-of-war |
| **COMPLETED** | Glowing silver glass orb | Already visited nodes |

### Shader Effects

Each state has custom GLSL shader code:

- **Current**: Simplex noise-based crackling, animated tendrils, teal color
- **Available**: Golden sparkles, edge crackling, high energy
- **Locked**: Subtle glow, low opacity
- **Hidden**: Minimal visibility, grey tone
- **Completed**: Glass refraction effect, fresnel rim lighting

## Player Interaction Flow

### Complete Sequence (as specified)

1. **Hover** → Preview popup appears (200ms delay)
2. **Click** → Node becomes selected with golden crackling energy
3. **Preview Tooltip** → Shows detailed node information
4. **Click "Enter" Button** → Initiates node entry
5. **Energy Pulse Animation** → Travels along path (BLOCKS input, 1.5s)
6. **Fade to Event** → Triggers combat/resource/event/rest

## Map Generation Logic

### Procedural Algorithm

```javascript
// Simplified flow
1. Create nodes in 3D space (layered neural network pattern)
2. Ensure minimum distance between nodes (minNodeDistance: 3)
3. Create guaranteed main path (start → middle nodes → exit)
4. Add branch paths (random connections based on proximity)
5. Assign node types (40% combat, 30% resource, 20% event, 10% rest)
6. Initialize states (start = CURRENT, connected = AVAILABLE, rest = HIDDEN)
7. Validate network is completable (BFS pathfinding check)
```

### Ring Scaling

| Ring | Nodes | Required % | Theme |
|------|-------|-----------|-------|
| 1 | 7 | 60% | Upper Gardens |
| 2 | 9 | 60% | Crew Quarters |
| 3 | 11 | 60% | The Laboratory |
| 4 | 13 | 60% | Collider Spine |
| 5 | 1 | 100% | Core Observatory (Final Arena) |

### Path Revelation

**Option B** (as specified): Connections are hidden until revealed, predetermined by map structure.

- When player completes a node, all connected nodes are revealed
- Previously available but unconnected nodes become LOCKED (faded)
- Exit node unlocks when 60% completion threshold is reached

## Ring Transition Animation

**Option C** (as specified): Current network collapses/dissolves → New network grows from center

```javascript
// Sequence
1. Collapse Animation (1.2s)
   - Scale: 1 → 0
   - Opacity: 1 → 0

2. Generate New Network
   - Procedural generation runs

3. Grow Animation (1.4s)
   - Scale: 0 → 1 (ease out cubic)
   - Opacity: 0 → 1
```

## Color Palette

Matches existing game colors from Intro/Roster UI:

```javascript
Current (Teal/Cyan):    rgb(0, 255, 255)    #00FFFF
Available (Gold):       rgb(255, 215, 0)    #FFD700
Locked (Faded Gold):    rgb(255, 215, 0)    #FFD700 @ 40% opacity
Hidden (Grey):          rgb(76, 76, 76)     #4C4C4C
Completed (Silver):     rgb(230, 230, 255)  #E6E6FF

Paths (Dim Teal):       rgb(51, 153, 179)   #3399B3
Paths (Revealed):       rgb(0, 204, 204)    #00CCCC
Energy Pulse (White):   rgb(255, 255, 255)  #FFFFFF
```

## Usage

### Starting the Map

```javascript
// In map.html, automatically loads on page load
const mapController = new MapController(canvasRenderer, canvasOverlay);
mapController.start(); // Generates Ring 1
mapController.animate(); // Starts render loop
```

### Handling Node Entry

```javascript
mapController.onNodeEnter = (node) => {
  console.log(`Entering ${node.type} node:`, node.id);

  // Trigger appropriate screen:
  switch(node.type) {
    case 'combat':
      // Load combat.html with enemy data
      break;
    case 'resource':
      // Show resource selection screen
      break;
    case 'event':
      // Show event narrative
      break;
    case 'rest':
      // Show rest/healing options
      break;
  }
};
```

### Advancing Rings

```javascript
// After Ring 1 exit node is completed
mapController.advanceToNextRing();
// Triggers collapse → generate → grow animation
```

### Save/Load

```javascript
// Save current state
const state = mapController.getGameState();
localStorage.setItem('mapState', JSON.stringify(state));

// Load state
const state = JSON.parse(localStorage.getItem('mapState'));
mapController.loadGameState(state);
```

## Controls

- **Mouse Drag**: Rotate camera (OrbitControls)
- **Scroll**: Zoom in/out (min: 8, max: 60)
- **Hover**: Show preview tooltip (200ms delay)
- **Click Node**: Select node (shows detailed preview + Enter button)
- **Click "Enter"**: Enter selected node (triggers event)
- **D Key**: Toggle debug panel
- **R Key**: Reload/restart
- **Shift+N**: Force advance to next ring (debug)

## Performance Targets

- **60 FPS** on integrated graphics
- **WebGL Rendering** with bloom post-processing
- **Shader-based effects** (no CPU-bound particle systems for nodes)
- **Canvas 2D overlay** for UI (no DOM overhead)
- **Minimal draw calls** (batched nodes, batched connections)

## Accessibility

- High contrast mode support (via shader adjustments)
- Keyboard navigation (planned)
- Colorblind-friendly palette (distinct shapes + colors)
- Clear visual feedback for all interactions
- No auto-rotate (player has full camera control)

## Integration with Game Flow

```
index.html (Intro)
    ↓
roster.html (Crew Selection)
    ↓
map.html (Neural Network Map) ← YOU ARE HERE
    ↓
[Node Event Screen - combat/resource/event/rest]
    ↓
map.html (Return after event)
    ↓
[Repeat until Ring 5 complete]
```

## Known Issues & Future Enhancements

### Current Limitations

1. Node entry only logs to console (needs combat/event screen integration)
2. Ring completion doesn't automatically advance (needs explicit trigger)
3. No keyboard navigation for nodes yet
4. No "back to menu" button
5. No minimap or overview mode

### Planned Features

1. Echo encounters (purple nodes for dead crew members)
2. One-way path indicators (arrows on connections)
3. Node hover highlights connected paths
4. Particle trails following completed paths
5. Audio feedback for interactions
6. Mobile touch controls optimization

## Testing

### Quick Test Flow

1. Open `roster.html`
2. Select a crew member
3. Click "Confirm Selection"
4. Should navigate to `map.html`
5. Map loads with Ring 1 (7 nodes)
6. Hover nodes to see preview
7. Click available node (golden) to select
8. Click "ENTER NODE" button
9. Energy pulse animates (1.5s, blocks input)
10. Node becomes COMPLETED (glass orb)
11. Connected nodes become AVAILABLE

### Debug Mode

Press **D** to show debug panel with:
- Current ring number
- Current node ID
- Visited/total node count
- Interaction state
- Animation state

## Code Examples

### Custom Node Selection Logic

```javascript
// In map-controller.js
mapController.handleNodeClick = (node) => {
  if (node.state !== NodeStates.AVAILABLE) {
    console.log('Node not available');
    return;
  }

  // Custom logic here
  if (node.type === 'echo') {
    // Show special Echo warning
  }

  // Select node
  this.uiOverlay.setSelectedNode(node);
};
```

### Modifying Generation Parameters

```javascript
// In data/map-config.js
export const MapConfig = {
  visual: {
    networkRadius: 18,        // Increase for larger spread
    minNodeDistance: 3,       // Decrease for denser networks
    connectionProbability: 0.6, // Increase for more paths
    maxConnectionsPerNode: 4,  // Increase for denser mesh
  }
};
```

### Adding Custom Shaders

See `map-renderer.js` lines 20-200 for full shader code. Each node state has custom fragment shader logic in the `main()` function.

## Credits

Inspired by neural network visualization from the provided reference, adapted to match The Final Descent's teal/purple/gold color scheme and gameplay requirements.
