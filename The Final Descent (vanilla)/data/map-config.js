/**
 * Map Configuration
 * Defines ring structure, node types, and map generation parameters
 */

export const MapConfig = {
  // Ring definitions from GDD
  rings: [
    {
      id: 1,
      name: 'Upper Gardens',
      nodeCount: 7,
      requiredCompletion: 0.6,
      description: 'The botanical sector where life once thrived'
    },
    {
      id: 2,
      name: 'Crew Quarters',
      nodeCount: 9,
      requiredCompletion: 0.6,
      description: 'Abandoned living spaces, now host to memories'
    },
    {
      id: 3,
      name: 'The Laboratory',
      nodeCount: 11,
      requiredCompletion: 0.6,
      description: 'Where experiments spiraled into madness'
    },
    {
      id: 4,
      name: 'Collider Spine',
      nodeCount: 13,
      requiredCompletion: 0.6,
      description: 'The station\'s fractured nervous system'
    },
    {
      id: 5,
      name: 'Core Observatory',
      nodeCount: 1, // Final arena
      requiredCompletion: 1.0,
      description: 'The event horizon awaits'
    }
  ],

  // Node type distribution (from GDD)
  nodeTypeDistribution: {
    combat: 0.40,
    resource: 0.30,
    event: 0.20,
    rest: 0.10
  },

  // Visual configuration
  visual: {
    networkRadius: 18,        // Max distance from center
    minNodeDistance: 3,       // Minimum distance between nodes
    connectionProbability: 0.6, // Chance of creating connections beyond minimum
    maxConnectionsPerNode: 4,

    // Node sizes
    nodeBaseSize: 0.8,
    nodeCompletedSize: 1.0,

    // Animation timings
    energyPulseSpeed: 8.0,    // Units per second
    energyPulseDuration: 1.5, // Seconds
    nodeSelectDuration: 0.4,  // Seconds

    // Ring transition
    collapseDuration: 1.2,   // Seconds
    growDuration: 1.4,        // Seconds
  },

  // Color palette (matching existing game colors)
  colors: {
    // Node states
    current: { r: 0, g: 1, b: 1 },           // Teal/cyan
    available: { r: 1, g: 0.84, b: 0 },      // Gold
    locked: { r: 1, g: 0.84, b: 0 },         // Faded gold (will use alpha)
    hidden: { r: 0.3, g: 0.3, b: 0.3 },      // Grey
    completed: { r: 0.9, g: 0.9, b: 1.0 },   // Silver/white

    // Node types (overlay tints)
    combat: { r: 0.86, g: 0.15, b: 0.15 },   // Red
    resource: { r: 0.06, g: 0.72, b: 0.5 },  // Green
    event: { r: 0.62, g: 0.31, b: 0.87 },    // Purple
    rest: { r: 0.4, g: 0.7, b: 1.0 },        // Blue
    echo: { r: 0.62, g: 0.31, b: 0.87 },     // Purple (same as event)

    // Connection paths
    pathDefault: { r: 0.2, g: 0.6, b: 0.7 }, // Dim teal
    pathRevealed: { r: 0, g: 0.8, b: 0.8 },  // Bright teal
    pathEnergy: { r: 1, g: 1, b: 1 },        // White energy pulse
  },

  // Preview tooltip configuration
  preview: {
    showOnHover: true,
    hoverDelay: 200,  // ms
    content: {
      showType: true,
      showRewards: false,      // Don't spoil exact rewards
      showDescription: true,
      showEnemyCount: false,   // Don't spoil exact encounter
    }
  }
};

/**
 * Node type definitions
 */
export const NodeTypes = {
  COMBAT: 'combat',
  RESOURCE: 'resource',
  EVENT: 'event',
  REST: 'rest',
  ECHO: 'echo',
  EXIT: 'exit',
  START: 'start'
};

/**
 * Node state definitions
 */
export const NodeStates = {
  CURRENT: 'current',      // Player is here now
  AVAILABLE: 'available',  // Can be clicked/entered
  LOCKED: 'locked',        // Visible but not reachable
  HIDDEN: 'hidden',        // Not yet revealed
  COMPLETED: 'completed'   // Already visited
};

/**
 * Get node type description for preview
 */
export function getNodeTypeDescription(type) {
  const descriptions = {
    combat: 'Combat Encounter - Face station hostiles',
    resource: 'Resource Cache - Gather supplies and data',
    event: 'Unknown Event - Investigate the anomaly',
    rest: 'Safe Room - Restore and prepare',
    echo: 'Echo Manifestation - A memory made hostile',
    exit: 'Ring Exit - Descend deeper',
    start: 'Entry Point'
  };
  return descriptions[type] || 'Unknown Node';
}

/**
 * Get node type icon (for future UI enhancement)
 */
export function getNodeTypeIcon(type) {
  const icons = {
    combat: '⚔',
    resource: '📦',
    event: '❓',
    rest: '🛡',
    echo: '👻',
    exit: '⬇',
    start: '▶'
  };
  return icons[type] || '◯';
}
