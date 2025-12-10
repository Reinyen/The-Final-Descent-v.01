/**
 * Map Controller
 * Main controller for the neural network map system
 * Handles game state, node selection, progression, and ring transitions
 */

import { NeuralNetworkGenerator } from './neural-network-generator.js';
import { MapRenderer } from './map-renderer.js';
import { MapUIOverlay } from './map-ui-overlay.js';
import { MapConfig, NodeStates } from '../../data/map-config.js';

export class MapController {
  constructor(canvasRenderer, canvasOverlay) {
    this.renderer = new MapRenderer(canvasRenderer);
    this.uiOverlay = new MapUIOverlay(canvasOverlay);

    this.currentRing = 1;
    this.currentNodeId = null;
    this.networkData = null;
    this.seed = Date.now();

    this.isAnimating = false;
    this.canInteract = true;

    // Callbacks
    this.onNodeEnter = null;
    this.onRingComplete = null;

    this.setupEventListeners();

    console.log('[MapController] Initialized');
  }

  /**
   * Start a new run (Ring 1)
   */
  start() {
    console.log('[MapController] Starting new run');

    this.currentRing = 1;
    this.seed = Date.now();

    this.generateAndLoadRing(this.currentRing);
  }

  /**
   * Continue to next ring
   */
  advanceToNextRing() {
    if (this.currentRing >= 5) {
      console.log('[MapController] Already at final ring');
      return;
    }

    this.currentRing++;
    console.log(`[MapController] Advancing to Ring ${this.currentRing}`);

    // Collapse current network
    this.transitionToNewRing();
  }

  /**
   * Generate and load a ring's network
   */
  generateAndLoadRing(ringNumber) {
    console.log(`[MapController] Generating Ring ${ringNumber}`);

    const generator = new NeuralNetworkGenerator(ringNumber, this.seed + ringNumber);
    this.networkData = generator.generate();

    this.currentNodeId = this.networkData.startNodeId;

    this.renderer.loadNetwork(this.networkData);

    console.log('[MapController] Ring loaded with', this.networkData.nodes.length, 'nodes');
    console.log('[MapController] Network will remain static throughout ring exploration');
  }

  /**
   * Handle ring transition animation (collapse + grow)
   */
  async transitionToNewRing() {
    console.log('[MapController] Starting ring transition animation');

    this.canInteract = false;
    this.isAnimating = true;

    // Phase 1: Collapse current network
    await this.animateNetworkCollapse();

    // Phase 2: Generate new network
    this.generateAndLoadRing(this.currentRing);

    // Phase 3: Grow new network
    await this.animateNetworkGrow();

    this.isAnimating = false;
    this.canInteract = true;

    console.log('[MapController] Ring transition complete');
  }

  /**
   * Animate network collapse
   */
  animateNetworkCollapse() {
    return new Promise(resolve => {
      const duration = MapConfig.visual.collapseDuration;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);

        // Scale and fade nodes
        if (this.renderer.nodesMesh) {
          const scale = 1 - progress;
          this.renderer.nodesMesh.scale.set(scale, scale, scale);
          this.renderer.nodesMesh.material.opacity = 1 - progress;
        }

        if (this.renderer.connectionsMesh) {
          const scale = 1 - progress;
          this.renderer.connectionsMesh.scale.set(scale, scale, scale);
          this.renderer.connectionsMesh.material.opacity = 1 - progress;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * Animate network grow
   */
  animateNetworkGrow() {
    return new Promise(resolve => {
      const duration = MapConfig.visual.growDuration;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);

        // Scale and fade nodes
        if (this.renderer.nodesMesh) {
          this.renderer.nodesMesh.scale.set(easeProgress, easeProgress, easeProgress);
          this.renderer.nodesMesh.material.opacity = easeProgress;
        }

        if (this.renderer.connectionsMesh) {
          this.renderer.connectionsMesh.scale.set(easeProgress, easeProgress, easeProgress);
          this.renderer.connectionsMesh.material.opacity = easeProgress;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * Handle node click
   */
  handleNodeClick(node) {
    if (!this.canInteract || this.isAnimating) {
      console.log('[MapController] Interaction blocked');
      return;
    }

    // Only available nodes can be selected
    if (node.state !== NodeStates.AVAILABLE) {
      console.log(`[MapController] Node ${node.id} is not available (state: ${node.state})`);
      return;
    }

    // Select node (shows golden crackling + detailed preview)
    this.uiOverlay.setSelectedNode(node);

    // Update renderer to show selection effect
    // (In a more advanced version, we'd update the shader uniform)

    console.log(`[MapController] Node clicked: ${node.id}`);
  }

  /**
   * Enter a selected node
   */
  async enterNode(node) {
    if (!this.canInteract || this.isAnimating) return;

    console.log(`[MapController] Entering node: ${node.id}`);

    this.canInteract = false;
    this.isAnimating = true;

    // Animate energy pulse from current to target
    const currentNode = this.networkData.nodes.find(n => n.id === this.currentNodeId);

    if (currentNode) {
      this.renderer.startEnergyPulse(currentNode.id, node.id);

      // Wait for pulse animation to complete
      await this.waitForDuration(MapConfig.visual.energyPulseDuration);
    }

    // Update game state
    await this.progressToNode(node.id);

    // Clear selection
    this.uiOverlay.setSelectedNode(null);

    this.isAnimating = false;
    this.canInteract = true;

    // Callback for entering node (triggers combat/event/etc)
    if (this.onNodeEnter) {
      this.onNodeEnter(node);
    }
  }

  /**
   * Progress to a node (update states, reveal connections)
   */
  async progressToNode(nodeId) {
    console.log(`[MapController] Progressing to node: ${nodeId}`);

    // Mark old node as completed
    const oldNode = this.networkData.nodes.find(n => n.id === this.currentNodeId);
    if (oldNode) {
      oldNode.state = NodeStates.COMPLETED;
    }

    // Set new current node
    this.currentNodeId = nodeId;
    const newNode = this.networkData.nodes.find(n => n.id === nodeId);
    if (newNode) {
      newNode.state = NodeStates.CURRENT;
    }

    // Reveal connected nodes
    this.revealConnectedNodes(nodeId);

    // Update visualization
    this.renderer.updateNetwork(this.networkData);

    // Check if ring is complete
    this.checkRingCompletion();
  }

  /**
   * Reveal nodes connected to the given node (Roguelike logic)
   */
  revealConnectedNodes(nodeId) {
    const currentNode = this.networkData.nodes.find(n => n.id === nodeId);
    if (!currentNode) return;

    console.log(`[MapController] Revealing connections from ${nodeId}:`, currentNode.connections);

    // First, mark ALL previously available nodes as LOCKED (no backtracking)
    this.networkData.nodes.forEach(n => {
      if (n.state === NodeStates.AVAILABLE && n.id !== currentNode.id) {
        n.state = NodeStates.LOCKED;
        console.log(`  - Locked ${n.id} (no backtracking)`);
      }
    });

    // Now reveal and make AVAILABLE only the direct neighbors of current node
    currentNode.connections.forEach(connectedId => {
      const connectedNode = this.networkData.nodes.find(n => n.id === connectedId);

      if (connectedNode) {
        // Reveal the node if not already revealed
        if (!connectedNode.revealed) {
          connectedNode.revealed = true;
          console.log(`  - Revealed ${connectedId} (${connectedNode.type})`);
        }

        // Make AVAILABLE if not already completed or current
        if (connectedNode.state !== NodeStates.COMPLETED && connectedNode.state !== NodeStates.CURRENT) {
          connectedNode.state = NodeStates.AVAILABLE;
          console.log(`  - Made ${connectedId} AVAILABLE`);
        }

        // Reveal connection
        const connection = this.networkData.connections.find(c =>
          (c.from === nodeId && c.to === connectedId) ||
          (c.to === nodeId && c.from === connectedId)
        );

        if (connection) {
          connection.revealed = true;
        }
      }
    });
  }

  /**
   * Check if ring completion requirements are met
   */
  checkRingCompletion() {
    const totalNodes = this.networkData.nodes.length;
    const completedNodes = this.networkData.nodes.filter(n => n.state === NodeStates.COMPLETED).length;
    const currentNodes = this.networkData.nodes.filter(n => n.state === NodeStates.CURRENT).length;
    const visitedCount = completedNodes + currentNodes;

    const ringConfig = MapConfig.rings[this.currentRing - 1];
    const requiredCompletion = ringConfig.requiredCompletion;
    const requiredCount = Math.ceil(totalNodes * requiredCompletion);

    const exitNode = this.networkData.nodes.find(n => n.id === this.networkData.exitNodeId);

    console.log(`[MapController] Progress: ${visitedCount}/${totalNodes} (required: ${requiredCount})`);

    // Unlock exit if requirements met (just change state, don't teleport)
    if (visitedCount >= requiredCount && exitNode) {
      if (exitNode.state === NodeStates.LOCKED || exitNode.state === NodeStates.HIDDEN) {
        console.log('[MapController] 60% completion reached! Exit node unlocked!');

        // Just change the exit state - it's already in the network with real connections
        exitNode.state = NodeStates.AVAILABLE;
        exitNode.revealed = true;

        // Reveal connections to the exit node
        exitNode.connections.forEach(connectedId => {
          const connection = this.networkData.connections.find(c =>
            (c.from === exitNode.id && c.to === connectedId) ||
            (c.to === exitNode.id && c.from === connectedId)
          );
          if (connection) {
            connection.revealed = true;
          }
        });

        this.renderer.updateNetwork(this.networkData);
      }
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Mouse move for hover
    this.renderer.canvas.addEventListener('mousemove', (e) => {
      if (!this.canInteract || this.isAnimating) return;

      const node = this.renderer.getNodeAtPosition(e.clientX, e.clientY);
      this.uiOverlay.setHoveredNode(node, e.clientX, e.clientY);
    });

    // Click for selection
    this.renderer.canvas.addEventListener('click', (e) => {
      if (!this.canInteract || this.isAnimating) return;

      // Check if click is on UI element first
      const clickConsumedByUI = this.uiOverlay.handleClick(e.clientX, e.clientY);

      if (!clickConsumedByUI) {
        // Check if clicked on node
        const node = this.renderer.getNodeAtPosition(e.clientX, e.clientY);

        if (node) {
          this.handleNodeClick(node);
        }
      }
    });

    // UI overlay enter callback
    this.uiOverlay.onEnterNode = (node) => {
      this.enterNode(node);
    };
  }

  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(() => this.animate());

    this.renderer.animate();
    this.uiOverlay.render();
  }

  /**
   * Utility: Wait for duration
   */
  waitForDuration(seconds) {
    return new Promise(resolve => {
      setTimeout(resolve, seconds * 1000);
    });
  }

  /**
   * Get current game state for saving
   */
  getGameState() {
    return {
      currentRing: this.currentRing,
      currentNodeId: this.currentNodeId,
      seed: this.seed,
      networkData: this.networkData
    };
  }

  /**
   * Load game state
   */
  loadGameState(state) {
    this.currentRing = state.currentRing;
    this.currentNodeId = state.currentNodeId;
    this.seed = state.seed;
    this.networkData = state.networkData;

    this.renderer.loadNetwork(this.networkData);

    console.log('[MapController] Game state loaded');
  }

  /**
   * Dispose resources
   */
  dispose() {
    this.renderer.dispose();
    this.uiOverlay.dispose();
  }
}
