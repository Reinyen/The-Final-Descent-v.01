/**
 * Neural Network Map Generator
 * Procedurally generates neural network layouts for each ring
 * Ensures all maps are completable with 60% node requirement
 */

import { MapConfig, NodeTypes, NodeStates } from '../../data/map-config.js';

/**
 * Simple seeded random number generator
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }

  choice(array) {
    return array[Math.floor(this.next() * array.length)];
  }
}

/**
 * Generate a neural network for a given ring
 */
export class NeuralNetworkGenerator {
  constructor(ringNumber, seed = Date.now()) {
    this.ringNumber = ringNumber;
    this.ringConfig = MapConfig.rings[ringNumber - 1];
    this.random = new SeededRandom(seed);
    this.nodes = [];
    this.connections = [];
  }

  /**
   * Generate the complete network
   */
  generate() {
    console.log(`[NetworkGen] Generating Ring ${this.ringNumber} with ${this.ringConfig.nodeCount} nodes`);

    // Special case: Ring 5 is just the final arena
    if (this.ringNumber === 5) {
      return this.generateFinalArena();
    }

    // Step 1: Create nodes with spatial distribution
    this.createNodes();

    // Step 2: Create guaranteed path from start to exit
    this.createMainPath();

    // Step 3: Add branch paths and loops
    this.createBranchPaths();

    // Step 4: Assign node types
    this.assignNodeTypes();

    // Step 5: Initialize node states
    this.initializeNodeStates();

    // Step 6: Validate network is completable
    this.validateNetwork();

    console.log(`[NetworkGen] Generated ${this.nodes.length} nodes, ${this.connections.length} connections`);

    return {
      nodes: this.nodes,
      connections: this.connections,
      startNodeId: 'node_0',
      exitNodeId: `node_${this.ringConfig.nodeCount - 1}`
    };
  }

  /**
   * Create nodes distributed in circular/spiral ring layout
   * Now outputs 2D percentage-based coordinates for DOM rendering
   * Start at outer edge, exit at center (descending into the black hole)
   */
  createNodes() {
    const count = this.ringConfig.nodeCount;

    // Work in percentage space (0-100%)
    const centerX = 50; // Center of container
    const centerY = 50; // Center of container
    const outerRadiusPercent = 35; // 35% from center
    const innerRadiusPercent = 8;  // 8% from center

    // First node: Start (at outer edge, top position)
    const startAngle = -Math.PI / 2; // Top of circle
    const startX = centerX + outerRadiusPercent * Math.cos(startAngle);
    const startY = centerY + outerRadiusPercent * Math.sin(startAngle);

    this.nodes.push({
      id: 'node_0',
      position: {
        x: startX,
        y: startY,
        z: 0
      },
      displayX: startX,
      displayY: startY,
      type: NodeTypes.START,
      state: NodeStates.CURRENT,
      connections: [],
      revealed: true,
      layer: 0,
      ringProgress: 0
    });

    // Generate remaining nodes in spiral pattern, descending toward center
    let nodeIndex = 1;
    const spiralTurns = 1.5; // How many times the spiral wraps around

    for (let i = 1; i < count; i++) {
      const progress = i / (count - 1); // 0 to 1
      const isExit = i === count - 1;

      // Spiral: radius decreases as we progress, angle increases
      const radiusPercent = outerRadiusPercent - (outerRadiusPercent - innerRadiusPercent) * progress;

      // Add spiral rotation + some randomness
      const baseAngle = startAngle + (spiralTurns * 2 * Math.PI * progress);
      const angleVariation = this.random.range(-0.3, 0.3);
      const angle = baseAngle + angleVariation;

      // Radius variation for organic feel (in percentage)
      const radiusVariation = this.random.range(-3, 3);
      const finalRadius = radiusPercent + radiusVariation;

      // Calculate 2D position in percentage space
      const x = centerX + finalRadius * Math.cos(angle);
      const y = centerY + finalRadius * Math.sin(angle);

      const position = {
        x: x,
        y: y,
        z: 0
      };

      // Layer based on progress (for pathfinding)
      const layer = Math.floor(progress * 3) + 1;

      this.nodes.push({
        id: `node_${nodeIndex}`,
        position: position,
        displayX: x,
        displayY: y,
        type: isExit ? NodeTypes.EXIT : null, // Assigned later
        state: NodeStates.HIDDEN,
        connections: [],
        revealed: false,
        layer: layer,
        ringProgress: progress
      });

      nodeIndex++;
    }

    console.log('[NetworkGen] Created ring layout with', this.nodes.length, 'nodes (2D percentage-based)');
  }

  /**
   * Check if position is valid (minimum distance from other nodes)
   * Now works with 2D percentage coordinates
   */
  isValidPosition(position, minDist) {
    for (const node of this.nodes) {
      const dx = position.x - node.position.x;
      const dy = position.y - node.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) {
        return false;
      }
    }
    return true;
  }

  /**
   * Create main path from start to exit (guaranteed route)
   */
  createMainPath() {
    const exitNode = this.nodes[this.nodes.length - 1];
    const startNode = this.nodes[0];

    // Sort nodes by distance from start (excluding start and exit)
    const middleNodes = this.nodes.slice(1, -1).sort((a, b) => {
      const distA = this.getDistance(startNode.position, a.position);
      const distB = this.getDistance(startNode.position, b.position);
      return distA - distB;
    });

    // Create path: Start -> Mid1 -> Mid2 -> ... -> Exit
    const pathLength = Math.min(4, middleNodes.length);
    const pathNodes = [startNode];

    for (let i = 0; i < pathLength; i++) {
      const index = Math.floor((i / pathLength) * middleNodes.length);
      pathNodes.push(middleNodes[index]);
    }

    pathNodes.push(exitNode);

    // Connect path
    for (let i = 0; i < pathNodes.length - 1; i++) {
      this.addConnection(pathNodes[i].id, pathNodes[i + 1].id);
    }
  }

  /**
   * Create branch paths and additional connections
   */
  createBranchPaths() {
    const maxConnections = MapConfig.visual.maxConnectionsPerNode;
    const probability = MapConfig.visual.connectionProbability;

    // For each node, try to connect to nearby nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];

      // Skip if already at max connections
      if (node.connections.length >= maxConnections) continue;

      // Find nearby nodes
      const nearbyNodes = this.nodes
        .filter(n => n.id !== node.id)
        .map(n => ({
          node: n,
          distance: this.getDistance(node.position, n.position)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5); // Consider 5 nearest

      // Try to connect to nearby nodes
      for (const { node: nearbyNode } of nearbyNodes) {
        if (node.connections.length >= maxConnections) break;
        if (nearbyNode.connections.length >= maxConnections) continue;
        if (this.areConnected(node.id, nearbyNode.id)) continue;

        // Random chance to connect
        if (this.random.next() < probability) {
          this.addConnection(node.id, nearbyNode.id);
        }
      }
    }
  }

  /**
   * Assign types to nodes (combat, resource, event, rest)
   */
  assignNodeTypes() {
    const dist = MapConfig.nodeTypeDistribution;
    const typeCounts = {
      combat: Math.floor(this.nodes.length * dist.combat),
      resource: Math.floor(this.nodes.length * dist.resource),
      event: Math.floor(this.nodes.length * dist.event),
      rest: Math.floor(this.nodes.length * dist.rest)
    };

    // Create type pool
    const typePool = [];
    Object.entries(typeCounts).forEach(([type, count]) => {
      for (let i = 0; i < count; i++) {
        typePool.push(type);
      }
    });

    // Shuffle type pool
    for (let i = typePool.length - 1; i > 0; i--) {
      const j = Math.floor(this.random.next() * (i + 1));
      [typePool[i], typePool[j]] = [typePool[j], typePool[i]];
    }

    // Assign types to nodes (skip start and exit)
    let typeIndex = 0;
    for (let i = 1; i < this.nodes.length - 1; i++) {
      const node = this.nodes[i];
      if (node.type === null) {
        node.type = typePool[typeIndex % typePool.length];
        typeIndex++;
      }
    }
  }

  /**
   * Initialize node states (start revealed, others hidden)
   */
  initializeNodeStates() {
    // Start node is current
    this.nodes[0].state = NodeStates.CURRENT;
    this.nodes[0].revealed = true;

    // Nodes connected to start are available
    const startConnections = this.nodes[0].connections;
    for (const connectedId of startConnections) {
      const node = this.nodes.find(n => n.id === connectedId);
      if (node) {
        node.state = NodeStates.AVAILABLE;
        node.revealed = true;

        // Reveal the connection
        const conn = this.connections.find(c =>
          (c.from === this.nodes[0].id && c.to === connectedId) ||
          (c.to === this.nodes[0].id && c.from === connectedId)
        );
        if (conn) conn.revealed = true;
      }
    }

    // All other nodes are hidden
    for (let i = 1; i < this.nodes.length; i++) {
      if (this.nodes[i].state === NodeStates.CURRENT) continue;
      if (this.nodes[i].state === NodeStates.AVAILABLE) continue;
      this.nodes[i].state = NodeStates.HIDDEN;
      this.nodes[i].revealed = false;
    }
  }

  /**
   * Validate that network is completable
   */
  validateNetwork() {
    const exitNode = this.nodes[this.nodes.length - 1];
    const startNode = this.nodes[0];

    // BFS to ensure path exists from start to exit
    const visited = new Set();
    const queue = [startNode.id];
    visited.add(startNode.id);

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (currentId === exitNode.id) {
        console.log('[NetworkGen] ✓ Valid path from start to exit found');
        return true;
      }

      const currentNode = this.nodes.find(n => n.id === currentId);
      for (const connectedId of currentNode.connections) {
        if (!visited.has(connectedId)) {
          visited.add(connectedId);
          queue.push(connectedId);
        }
      }
    }

    console.error('[NetworkGen] ✗ No valid path from start to exit!');
    return false;
  }

  /**
   * Generate final arena (Ring 5)
   */
  generateFinalArena() {
    return {
      nodes: [
        {
          id: 'node_final',
          position: { x: 50, y: 50, z: 0 },
          displayX: 50,
          displayY: 50,
          type: NodeTypes.COMBAT,
          state: NodeStates.CURRENT,
          connections: [],
          revealed: true,
          layer: 0
        }
      ],
      connections: [],
      startNodeId: 'node_final',
      exitNodeId: null
    };
  }

  /**
   * Helper: Add bidirectional connection
   */
  addConnection(fromId, toId) {
    const fromNode = this.nodes.find(n => n.id === fromId);
    const toNode = this.nodes.find(n => n.id === toId);

    if (!fromNode || !toNode) return;
    if (this.areConnected(fromId, toId)) return;

    fromNode.connections.push(toId);
    toNode.connections.push(fromId);

    this.connections.push({
      from: fromId,
      to: toId,
      revealed: false
    });
  }

  /**
   * Helper: Check if two nodes are connected
   */
  areConnected(id1, id2) {
    return this.connections.some(c =>
      (c.from === id1 && c.to === id2) ||
      (c.from === id2 && c.to === id1)
    );
  }

  /**
   * Helper: Get distance between two positions (2D)
   */
  getDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
