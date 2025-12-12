/**
 * DOM-based Map Renderer
 * Replaces Three.js with DOM elements, CSS transforms, and animations
 * Based on mockup design
 */

import { MapConfig, NodeStates, NodeTypes } from '../../data/map-config.js';

export class MapRendererDOM {
  constructor(containerElement) {
    this.container = containerElement;
    this.networkData = null;
    this.nodes = new Map(); // nodeId -> {data, element, orbitElement}
    this.connections = new Map(); // connectionId -> {data, element}

    // DOM containers
    this.mapContainer = null;
    this.mapScene = null;
    this.mapHalo = null;
    this.connectionsContainer = null;
    this.nodesContainer = null;

    // Callbacks
    this.onNodeClick = null;
    this.onNodeHover = null;
    this.onNodeLeave = null;

    this.init();
  }

  init() {
    // Create main map structure
    this.mapContainer = document.createElement('div');
    this.mapContainer.id = 'map-container';

    this.mapScene = document.createElement('div');
    this.mapScene.id = 'map-scene';

    this.mapHalo = document.createElement('div');
    this.mapHalo.id = 'map-halo';

    this.connectionsContainer = document.createElement('div');
    this.connectionsContainer.id = 'connections-container';

    this.nodesContainer = document.createElement('div');
    this.nodesContainer.id = 'nodes-container';

    // Create tooltip
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'node-tooltip';
    this.tooltip.innerHTML = `
      <div class="node-tooltip-title"></div>
      <div class="node-tooltip-type"></div>
      <div class="node-tooltip-desc"></div>
      <div class="node-tooltip-state"></div>
    `;
    document.body.appendChild(this.tooltip);

    // Build hierarchy
    this.mapScene.appendChild(this.mapHalo);
    this.mapScene.appendChild(this.connectionsContainer);
    this.mapScene.appendChild(this.nodesContainer);
    this.mapContainer.appendChild(this.mapScene);
    this.container.appendChild(this.mapContainer);

    console.log('[MapRendererDOM] Initialized DOM-based renderer');
  }

  /**
   * Load network data and create DOM elements
   */
  loadNetwork(networkData) {
    console.log('[MapRendererDOM] Loading network:', networkData);

    // Clear existing elements
    this.clearNetwork();

    this.networkData = networkData;

    // Create connection lines first (so they appear below nodes)
    this.createConnections();

    // Create nodes
    this.createNodes();

    console.log(`[MapRendererDOM] Created ${this.nodes.size} nodes and ${this.connections.size} connections`);
  }

  /**
   * Clear all network elements
   */
  clearNetwork() {
    this.nodes.clear();
    this.connections.clear();
    this.connectionsContainer.innerHTML = '';
    this.nodesContainer.innerHTML = '';
  }

  /**
   * Create connection line DOM elements
   */
  createConnections() {
    const connections = this.networkData.connections;
    const nodes = this.networkData.nodes;

    connections.forEach((conn, index) => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);

      if (!fromNode || !toNode) return;

      // Calculate position and rotation
      const x1 = fromNode.displayX || 50;
      const y1 = fromNode.displayY || 50;
      const x2 = toNode.displayX || 50;
      const y2 = toNode.displayY || 50;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      const angle = Math.atan2(dy, dx) * 180 / Math.PI;

      // Create line element
      const line = document.createElement('div');
      line.className = 'connection-line';
      line.dataset.from = conn.from;
      line.dataset.to = conn.to;
      line.style.width = length + '%';
      line.style.left = midX + '%';
      line.style.top = midY + '%';
      line.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

      // Apply state classes
      this.updateConnectionState(line, conn, fromNode, toNode);

      this.connectionsContainer.appendChild(line);
      this.connections.set(`${conn.from}-${conn.to}`, {
        data: conn,
        element: line,
        from: fromNode,
        to: toNode
      });
    });
  }

  /**
   * Update connection line state/classes
   * Priority: ACTIVE > AVAILABLE > COMPLETED > LOCKED > HIDDEN
   */
  updateConnectionState(lineElement, conn, fromNode, toNode) {
    // Clear state classes
    lineElement.classList.remove('state-hidden', 'state-locked', 'state-available', 'state-active', 'state-completed');

    // CRITICAL: Hide unrevealed connections completely
    if (!conn.revealed) {
      lineElement.classList.add('state-hidden');
      return;
    }

    const fromState = fromNode.state;
    const toState = toNode.state;

    // Determine connection state based on node states (check in priority order)

    // ACTIVE: Connection to/from current node (highest priority - bright energy flow)
    if (fromState === NodeStates.CURRENT || toState === NodeStates.CURRENT) {
      lineElement.classList.add('state-active');
      return;
    }

    // AVAILABLE: At least one node is available (energy flowing to reachable nodes)
    if (fromState === NodeStates.AVAILABLE || toState === NodeStates.AVAILABLE) {
      lineElement.classList.add('state-available');
      return;
    }

    // COMPLETED: Both nodes completed (path already traveled)
    if (fromState === NodeStates.COMPLETED && toState === NodeStates.COMPLETED) {
      lineElement.classList.add('state-completed');
      return;
    }

    // LOCKED: One or both nodes locked (dim, waiting to be revealed)
    if (fromState === NodeStates.LOCKED || toState === NodeStates.LOCKED) {
      lineElement.classList.add('state-locked');
      return;
    }

    // HIDDEN: Both nodes hidden
    if (fromState === NodeStates.HIDDEN && toState === NodeStates.HIDDEN) {
      lineElement.classList.add('state-hidden');
      return;
    }

    // Default: hidden
    lineElement.classList.add('state-hidden');
  }

  /**
   * Create node DOM elements
   */
  createNodes() {
    const nodes = this.networkData.nodes;

    nodes.forEach(nodeData => {
      // Create node element
      const node = document.createElement('div');
      node.className = 'map-node';
      node.dataset.id = nodeData.id;
      node.dataset.type = nodeData.type || 'unknown';

      // Position (use displayX/displayY if available, otherwise position)
      const x = nodeData.displayX !== undefined ? nodeData.displayX : 50;
      const y = nodeData.displayY !== undefined ? nodeData.displayY : 50;
      node.style.left = x + '%';
      node.style.top = y + '%';

      // Add state class
      this.updateNodeState(node, nodeData);

      // Create inner dot highlight
      const dot = document.createElement('div');
      dot.className = 'node-dot';
      node.appendChild(dot);

      // Event listeners
      node.addEventListener('click', (e) => this.handleNodeClick(e, nodeData));
      node.addEventListener('mouseenter', (e) => this.handleNodeHover(e, nodeData));
      node.addEventListener('mousemove', (e) => this.handleNodeMove(e, nodeData));
      node.addEventListener('mouseleave', (e) => this.handleNodeLeave(e, nodeData));

      this.nodesContainer.appendChild(node);

      // Create orbit ring for current node
      let orbitElement = null;
      if (nodeData.state === NodeStates.CURRENT) {
        orbitElement = document.createElement('div');
        orbitElement.className = 'current-orbit';
        orbitElement.style.left = x + '%';
        orbitElement.style.top = y + '%';
        this.nodesContainer.appendChild(orbitElement);
      }

      this.nodes.set(nodeData.id, {
        data: nodeData,
        element: node,
        orbitElement: orbitElement
      });
    });
  }

  /**
   * Update node state and classes
   */
  updateNodeState(nodeElement, nodeData) {
    // Clear state classes
    nodeElement.classList.remove('state-current', 'state-available', 'state-completed', 'state-locked', 'state-hidden');

    // Add appropriate state class
    const stateClass = `state-${nodeData.state}`;
    nodeElement.classList.add(stateClass);

    // Update data attribute for type
    nodeElement.dataset.type = nodeData.type || 'unknown';

    // Handle hidden nodes - show as unknown type
    if (nodeData.state === NodeStates.HIDDEN) {
      nodeElement.dataset.type = 'unknown';
    }

    // Handle locked nodes - show dim generic appearance
    if (nodeData.state === NodeStates.LOCKED) {
      // Keep the actual type data attribute but CSS will dim it
    }
  }

  /**
   * Update network visualization
   */
  updateNetwork(networkData) {
    this.networkData = networkData;

    // Update nodes
    networkData.nodes.forEach(nodeData => {
      const nodeEntry = this.nodes.get(nodeData.id);
      if (!nodeEntry) return;

      // Update state
      this.updateNodeState(nodeEntry.element, nodeData);

      // Update/create orbit for current node
      if (nodeData.state === NodeStates.CURRENT && !nodeEntry.orbitElement) {
        const x = nodeData.displayX !== undefined ? nodeData.displayX : 50;
        const y = nodeData.displayY !== undefined ? nodeData.displayY : 50;
        const orbitElement = document.createElement('div');
        orbitElement.className = 'current-orbit';
        orbitElement.style.left = x + '%';
        orbitElement.style.top = y + '%';
        this.nodesContainer.appendChild(orbitElement);
        nodeEntry.orbitElement = orbitElement;
      } else if (nodeData.state !== NodeStates.CURRENT && nodeEntry.orbitElement) {
        // Remove orbit if no longer current
        nodeEntry.orbitElement.remove();
        nodeEntry.orbitElement = null;
      }
    });

    // Update connections
    this.connections.forEach((connEntry, key) => {
      const conn = networkData.connections.find(c =>
        (c.from === connEntry.data.from && c.to === connEntry.data.to) ||
        (c.from === connEntry.data.to && c.to === connEntry.data.from)
      );

      if (conn) {
        connEntry.data = conn;
        const fromNode = networkData.nodes.find(n => n.id === conn.from);
        const toNode = networkData.nodes.find(n => n.id === conn.to);
        if (fromNode && toNode) {
          this.updateConnectionState(connEntry.element, conn, fromNode, toNode);
        }
      }
    });
  }

  /**
   * Event handlers
   */
  handleNodeClick(event, nodeData) {
    if (this.onNodeClick) {
      this.onNodeClick(nodeData, event);
    }
  }

  handleNodeHover(event, nodeData) {
    // Show tooltip
    this.showTooltip(event, nodeData);

    if (this.onNodeHover) {
      this.onNodeHover(nodeData, event);
    }
  }

  handleNodeMove(event, nodeData) {
    // Update tooltip position
    this.updateTooltipPosition(event);
  }

  handleNodeLeave(event, nodeData) {
    // Hide tooltip
    this.hideTooltip();

    if (this.onNodeLeave) {
      this.onNodeLeave(nodeData, event);
    }
  }

  /**
   * Show tooltip with node information
   */
  showTooltip(event, nodeData) {
    const titleEl = this.tooltip.querySelector('.node-tooltip-title');
    const typeEl = this.tooltip.querySelector('.node-tooltip-type');
    const descEl = this.tooltip.querySelector('.node-tooltip-desc');
    const stateEl = this.tooltip.querySelector('.node-tooltip-state');

    // Get node description based on type
    const typeDescriptions = {
      combat: 'Combat Encounter - Face station hostiles',
      resource: 'Resource Cache - Gather supplies and data',
      event: 'Unknown Event - Investigate the anomaly',
      rest: 'Safe Room - Restore and prepare',
      echo: 'Echo Manifestation - A memory made hostile',
      exit: 'Ring Exit - Descend deeper',
      start: 'Entry Point'
    };

    const stateLabels = {
      hidden: 'Not Revealed',
      locked: 'Path Not Available',
      available: 'Ready to Enter',
      current: 'Current Position',
      completed: 'Already Cleared'
    };

    // Set content
    const nodeName = `Node ${nodeData.id.replace('node_', '')}`;
    titleEl.textContent = nodeData.type === 'exit' ? 'EXIT NODE' : nodeData.type === 'start' ? 'START' : nodeName;
    typeEl.textContent = nodeData.type ? nodeData.type.toUpperCase() : 'UNKNOWN';
    descEl.textContent = typeDescriptions[nodeData.type] || 'Neural network node';
    stateEl.textContent = stateLabels[nodeData.state] || nodeData.state.toUpperCase();

    // Position and show
    this.updateTooltipPosition(event);
    this.tooltip.classList.add('visible');
  }

  /**
   * Update tooltip position
   */
  updateTooltipPosition(event) {
    const offsetX = 15;
    const offsetY = 15;
    this.tooltip.style.left = (event.clientX + offsetX) + 'px';
    this.tooltip.style.top = (event.clientY + offsetY) + 'px';
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    this.tooltip.classList.remove('visible');
  }

  /**
   * Get node at screen position (for compatibility with old API)
   */
  getNodeAtPosition(screenX, screenY) {
    const element = document.elementFromPoint(screenX, screenY);
    if (!element || !element.classList.contains('map-node')) {
      return null;
    }

    const nodeId = element.dataset.id;
    const nodeEntry = this.nodes.get(nodeId);
    return nodeEntry ? nodeEntry.data : null;
  }

  /**
   * Trigger energy burst animation from a node
   * Sends energy pulses along connections to neighboring nodes
   */
  triggerNodeBurst(node) {
    console.log(`[MapRendererDOM] Triggering energy burst from node ${node.id}`);

    // Find all connections from this node
    const nodeConnections = Array.from(this.connections.values()).filter(connEntry =>
      connEntry.data.from === node.id || connEntry.data.to === node.id
    );

    // Trigger burst animation on each connection
    nodeConnections.forEach((connEntry, index) => {
      setTimeout(() => {
        // Add energy-burst class temporarily
        connEntry.element.classList.add('energy-burst');

        // Remove after animation completes
        setTimeout(() => {
          connEntry.element.classList.remove('energy-burst');
        }, 800); // Match animation duration in CSS
      }, index * 100); // Stagger bursts slightly
    });

    // Pulse the node itself
    const nodeEntry = this.nodes.get(node.id);
    if (nodeEntry && nodeEntry.element) {
      nodeEntry.element.style.animation = 'none';
      // Trigger reflow
      void nodeEntry.element.offsetWidth;
      nodeEntry.element.style.animation = '';
    }
  }

  /**
   * Start energy pulse animation from one node to another
   * Used when traveling between nodes
   */
  startEnergyPulse(fromNodeId, toNodeId) {
    console.log(`[MapRendererDOM] Energy pulse: ${fromNodeId} → ${toNodeId}`);

    // Find the connection between these nodes
    const connection = Array.from(this.connections.values()).find(connEntry =>
      (connEntry.data.from === fromNodeId && connEntry.data.to === toNodeId) ||
      (connEntry.data.from === toNodeId && connEntry.data.to === fromNodeId)
    );

    if (connection) {
      // Trigger energy pulse
      connection.element.classList.add('energy-burst');

      setTimeout(() => {
        connection.element.classList.remove('energy-burst');
      }, 800);
    }
  }

  /**
   * Animate (called from animation loop, but DOM animations are CSS-based)
   */
  animate() {
    // DOM animations are handled by CSS
    // This method exists for API compatibility
  }

  /**
   * Set idle intensity (for API compatibility with Three.js renderer)
   */
  setIdleIntensity(intensity) {
    // DOM version doesn't use idle intensity
    // This method exists for API compatibility
  }

  /**
   * Cleanup
   */
  dispose() {
    this.clearNetwork();
    if (this.mapContainer && this.mapContainer.parentNode) {
      this.mapContainer.parentNode.removeChild(this.mapContainer);
    }
    this.nodes.clear();
    this.connections.clear();
  }

  /**
   * Resize handler (if needed)
   */
  onWindowResize() {
    // DOM elements automatically resize with CSS
    // This method exists for API compatibility
  }
}
