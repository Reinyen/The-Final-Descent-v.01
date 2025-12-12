/**
 * Map Controller
 * Main controller for the neural network map system
 * Handles game state, node selection, progression, and ring transitions
 */

import { MapRendererDOM } from './map-renderer-dom.js';
import { MapUIOverlay } from './map-ui-overlay.js';
import { MapInfoBand } from './map-info-band.js';
import { MapConfig, NodeStates } from '../../data/map-config.js';

export class MapController {
  constructor(mapContainer, canvasOverlay, canvasInfoBand) {
    this.renderer = new MapRendererDOM(mapContainer);
    this.uiOverlay = canvasOverlay ? new MapUIOverlay(canvasOverlay) : null;
    this.infoBand = canvasInfoBand ? new MapInfoBand(canvasInfoBand) : null;

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
    console.log('[MapController] Starting new run - neural network generation disabled');

    this.currentRing = 1;
    this.seed = Date.now();

    // Neural network generation removed - to be rebuilt
    this.networkData = null;
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
    console.log(`[MapController] Advancing to Ring ${this.currentRing} - neural network generation disabled`);

    // Neural network transition removed - to be rebuilt
  }

  /**
   * Generate and load a ring's network (placeholder - to be rebuilt)
   */
  generateAndLoadRing(ringNumber) {
    console.log(`[MapController] Network generation disabled - awaiting rebuild`);
    this.networkData = null;
  }

  /**
   * Update info band with current game state
   */
  updateInfoBand() {
    if (!this.networkData) return;
    if (!this.infoBand) return;

    const ringConfig = MapConfig.rings[this.currentRing - 1];
    const totalNodes = this.networkData.nodes.length;
    const completedNodes = this.networkData.nodes.filter(n => n.state === NodeStates.COMPLETED).length;
    const currentNodes = this.networkData.nodes.filter(n => n.state === NodeStates.CURRENT).length;
    const nodesCleared = completedNodes + currentNodes;
    const requiredNodes = Math.ceil(totalNodes * ringConfig.requiredCompletion);

    const exitNode = this.networkData.nodes.find(n => n.id === this.networkData.exitNodeId);
    const exitAwakened = exitNode && (exitNode.state === NodeStates.AVAILABLE || exitNode.state === NodeStates.CURRENT);

    this.infoBand.updateState({
      currentRing: this.currentRing,
      ringName: ringConfig.name,
      ringSubtitle: ringConfig.description,
      nodesCleared,
      totalNodes,
      requiredNodes,
      exitAwakened,
      // Default values for now (would come from game state)
      crew: [
        { id: 'iona', hp: 40, maxHp: 40, mutation: 0, stress: 0 },
        { id: 'rhea', hp: 25, maxHp: 25, mutation: 0, stress: 0 },
        { id: 'jonas', hp: 20, maxHp: 20, mutation: 0, stress: 0 }
      ],
      dataFragments: 0,
      tools: 0,
      archiveSlotsFilled: 0,
      archiveSlotsTotal: 10
    });
  }

  /**
   * Handle ring transition animation (placeholder - to be rebuilt)
   */
  async transitionToNewRing() {
    console.log('[MapController] Ring transition disabled - awaiting rebuild');
  }

  /**
   * Handle node click (placeholder - to be rebuilt)
   */
  handleNodeClick(node) {
    console.log('[MapController] Node interaction disabled - awaiting rebuild');
  }

  /**
   * Enter a selected node (placeholder - to be rebuilt)
   */
  async enterNode(node) {
    console.log('[MapController] Node entry disabled - awaiting rebuild');
  }

  /**
   * Progress to a node (placeholder - to be rebuilt)
   */
  async progressToNode(nodeId) {
    console.log('[MapController] Node progression disabled - awaiting rebuild');
  }

  /**
   * Get node history description (placeholder - to be rebuilt)
   */
  getNodeHistoryDescription(node) {
    return 'Node interaction disabled';
  }

  /**
   * Reveal connected nodes (placeholder - to be rebuilt)
   */
  revealConnectedNodes(nodeId) {
    console.log('[MapController] Node revelation disabled - awaiting rebuild');
  }

  /**
   * Check ring completion (placeholder - to be rebuilt)
   */
  checkRingCompletion() {
    console.log('[MapController] Ring completion check disabled - awaiting rebuild');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // For DOM renderer, we set up callbacks on the renderer
    // The renderer handles node-level events directly

    // Set up renderer callbacks
    this.renderer.onNodeClick = (nodeData, event) => {
      if (!this.canInteract || this.isAnimating) return;

      // Reset idle timer on click
      if (this.infoBand) {
        this.infoBand.resetIdleTimer();
      }

      // Check if click is on UI element first
      const clickConsumedByUI = this.uiOverlay ? this.uiOverlay.handleClick(event.clientX, event.clientY) : false;

      if (!clickConsumedByUI) {
        this.handleNodeClick(nodeData);
      }
    };

    this.renderer.onNodeHover = (nodeData, event) => {
      if (!this.canInteract || this.isAnimating) return;

      if (this.uiOverlay) {
        this.uiOverlay.setHoveredNode(nodeData, event.clientX, event.clientY);
      }

      // Reset idle timer on mouse move
      if (this.infoBand) {
        this.infoBand.resetIdleTimer();
      }
    };

    this.renderer.onNodeLeave = (nodeData, event) => {
      if (this.uiOverlay) {
        this.uiOverlay.setHoveredNode(null);
      }
    };

    // UI overlay enter callback
    if (this.uiOverlay) {
      this.uiOverlay.onEnterNode = (node) => {
        this.enterNode(node);
      };
    }
  }

  /**
   * Animation loop
   */
  animate() {
    requestAnimationFrame(() => this.animate());

    // Update idle intensity from info band
    if (this.infoBand) {
      const idleIntensity = this.infoBand.getIdleIntensity();
      this.renderer.setIdleIntensity(idleIntensity);
    }

    this.renderer.animate();

    if (this.uiOverlay) {
      this.uiOverlay.render();
    }

    if (this.infoBand) {
      this.infoBand.render(16); // ~16ms per frame at 60fps
    }
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

    if (this.uiOverlay) {
      this.uiOverlay.dispose();
    }

    if (this.infoBand) {
      this.infoBand.dispose();
    }
  }
}
