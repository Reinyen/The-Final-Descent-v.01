/**
 * Map Controller
 * Main controller for the neural network map system
 * Handles game state, node selection, progression, and ring transitions
 */

import { NeuralNetworkGenerator } from './neural-network-generator.js';
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
    this.updateInfoBand();

    console.log('[MapController] Ring loaded with', this.networkData.nodes.length, 'nodes');
    console.log('[MapController] Network will remain static throughout ring exploration');
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
   * Animate network collapse (DOM version)
   */
  animateNetworkCollapse() {
    return new Promise(resolve => {
      const duration = MapConfig.visual.collapseDuration;
      const mapScene = this.renderer.mapScene;

      if (!mapScene) {
        resolve();
        return;
      }

      mapScene.style.transition = `opacity ${duration}s cubic-bezier(0.33, 1, 0.68, 1), transform ${duration}s cubic-bezier(0.33, 1, 0.68, 1)`;
      mapScene.style.opacity = '0';
      mapScene.style.transform = 'rotateX(24deg) rotateZ(-16deg) scale(0.3)';

      setTimeout(() => {
        mapScene.style.transition = '';
        resolve();
      }, duration * 1000);
    });
  }

  /**
   * Animate network grow (DOM version)
   */
  animateNetworkGrow() {
    return new Promise(resolve => {
      const duration = MapConfig.visual.growDuration;
      const mapScene = this.renderer.mapScene;

      if (!mapScene) {
        resolve();
        return;
      }

      // Set initial state
      mapScene.style.opacity = '0';
      mapScene.style.transform = 'rotateX(24deg) rotateZ(-16deg) scale(0.3)';

      // Trigger reflow
      void mapScene.offsetWidth;

      // Animate to normal
      mapScene.style.transition = `opacity ${duration}s cubic-bezier(0.32, 0, 0.67, 0), transform ${duration}s cubic-bezier(0.32, 0, 0.67, 0)`;
      mapScene.style.opacity = '1';
      mapScene.style.transform = 'rotateX(24deg) rotateZ(-16deg) scale(1)';

      setTimeout(() => {
        mapScene.style.transition = '';
        resolve();
      }, duration * 1000);
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

    // Trigger golden energy burst effect (if renderer supports it)
    if (this.renderer.triggerNodeBurst) {
      this.renderer.triggerNodeBurst(node);
    }

    // Select node (shows detailed preview)
    if (this.uiOverlay) {
      this.uiOverlay.setSelectedNode(node);
    }

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
      // Trigger energy pulse animation (if renderer supports it)
      if (this.renderer.startEnergyPulse) {
        this.renderer.startEnergyPulse(currentNode.id, node.id);
        // Wait for pulse animation to complete
        await this.waitForDuration(MapConfig.visual.energyPulseDuration);
      }
    }

    // Update game state
    await this.progressToNode(node.id);

    // Clear selection
    if (this.uiOverlay) {
      this.uiOverlay.setSelectedNode(null);
    }

    this.isAnimating = false;
    this.canInteract = true;

    // Callback for entering node (triggers combat/event/etc)
    if (this.onNodeEnter) {
      this.onNodeEnter(node);
    }
  }

  /**
   * Progress to a node (update states, reveal connections)
   * Triggers energy burst animations along synaptic paths
   */
  async progressToNode(nodeId) {
    console.log(`[MapController] Progressing to node: ${nodeId}`);

    // Mark old node as completed
    const oldNode = this.networkData.nodes.find(n => n.id === this.currentNodeId);
    if (oldNode) {
      oldNode.state = NodeStates.COMPLETED;

      // Trigger energy burst from completed node to connected nodes
      if (this.renderer.triggerNodeBurst) {
        this.renderer.triggerNodeBurst(oldNode);
      }
    }

    // Set new current node
    this.currentNodeId = nodeId;
    const newNode = this.networkData.nodes.find(n => n.id === nodeId);
    if (newNode) {
      newNode.state = NodeStates.CURRENT;

      // Add to history
      if (this.infoBand) {
        const description = this.getNodeHistoryDescription(newNode);
        this.infoBand.addHistoryEntry(newNode.type, description);
      }
    }

    // Reveal connected nodes (energy flows to 2-3 neighbors)
    this.revealConnectedNodes(nodeId);

    // Update visualization
    this.renderer.updateNetwork(this.networkData);
    this.updateInfoBand();

    // Check if ring is complete (60% threshold for exit awakening)
    this.checkRingCompletion();
  }

  /**
   * Get node history description
   */
  getNodeHistoryDescription(node) {
    const descriptions = {
      combat: 'Hostile encounter survived',
      resource: 'Resources acquired',
      event: 'Strange event witnessed',
      rest: 'Brief respite found',
      echo: 'Memory confronted',
      exit: 'Descended to next ring'
    };
    return descriptions[node.type] || 'Node explored';
  }

  /**
   * Reveal nodes connected to the given node (Allow all nodes to be completable)
   */
  revealConnectedNodes(nodeId) {
    const currentNode = this.networkData.nodes.find(n => n.id === nodeId);
    if (!currentNode) return;

    console.log(`[MapController] Revealing connections from ${nodeId}:`, currentNode.connections);

    // Reveal and make AVAILABLE only the direct neighbors of current node
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

    // Now check ALL completed nodes and make their neighbors available
    // This allows backtracking to complete all nodes
    const completedNodes = this.networkData.nodes.filter(n => n.state === NodeStates.COMPLETED);

    completedNodes.forEach(completedNode => {
      completedNode.connections.forEach(connectedId => {
        const connectedNode = this.networkData.nodes.find(n => n.id === connectedId);

        if (connectedNode && connectedNode.state === NodeStates.LOCKED) {
          // Make locked nodes available if connected to completed nodes
          connectedNode.state = NodeStates.AVAILABLE;
          console.log(`  - Unlocked ${connectedId} (connected to completed node ${completedNode.id})`);
        }
      });
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

    // Awaken exit node if 60% completion reached (LOCKED → AVAILABLE with energy burst)
    if (visitedCount >= requiredCount && exitNode) {
      if (exitNode.state === NodeStates.LOCKED || exitNode.state === NodeStates.HIDDEN) {
        console.log('[MapController] ⚡ 60% completion reached! Exit node awakening! ⚡');

        // Change exit node state: LOCKED → AVAILABLE (begins pulsing with light)
        exitNode.state = NodeStates.AVAILABLE;
        exitNode.revealed = true;

        // Reveal connections to the exit node (energy flows illuminate paths)
        exitNode.connections.forEach(connectedId => {
          const connection = this.networkData.connections.find(c =>
            (c.from === exitNode.id && c.to === connectedId) ||
            (c.to === exitNode.id && c.from === connectedId)
          );
          if (connection) {
            connection.revealed = true;
          }
        });

        // Trigger visual awakening burst from exit node
        if (this.renderer.triggerNodeBurst) {
          this.renderer.triggerNodeBurst(exitNode);
        }

        this.renderer.updateNetwork(this.networkData);
        this.updateInfoBand();
      }
    }
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
