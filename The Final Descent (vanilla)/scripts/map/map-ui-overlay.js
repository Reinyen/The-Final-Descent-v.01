/**
 * Map UI Overlay
 * Handles 2D canvas overlay for tooltips, previews, and UI elements
 */

import { MapConfig, getNodeTypeDescription, getNodeTypeIcon } from '../../data/map-config.js';

export class MapUIOverlay {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true });

    this.hoveredNode = null;
    this.selectedNode = null;

    this.showPreview = false;
    this.previewNode = null;
    this.previewPosition = { x: 0, y: 0 };

    this.showEnterButton = false;
    this.enterButtonBounds = null;

    this.hoverStartTime = 0;

    this.onEnterNode = null; // Callback for entering a node

    this.resize();
    window.addEventListener('resize', () => this.resize());

    console.log('[MapUIOverlay] Initialized');
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Update hover state
   */
  setHoveredNode(node, screenX, screenY) {
    if (node !== this.hoveredNode) {
      this.hoveredNode = node;
      this.hoverStartTime = Date.now();
    }

    if (node && screenY) {
      this.previewPosition = { x: screenX, y: screenY };
    }
  }

  /**
   * Set selected node (clicked, shows golden crackling)
   */
  setSelectedNode(node) {
    this.selectedNode = node;

    if (node) {
      console.log(`[MapUIOverlay] Node selected: ${node.id}`);
    }
  }

  /**
   * Check if preview should show
   */
  updatePreview() {
    if (!this.hoveredNode) {
      this.showPreview = false;
      return;
    }

    const hoverDuration = Date.now() - this.hoverStartTime;

    if (hoverDuration > MapConfig.preview.hoverDelay) {
      this.showPreview = true;
      this.previewNode = this.hoveredNode;
    } else {
      this.showPreview = false;
    }
  }

  /**
   * Update "Enter" button visibility
   */
  updateEnterButton() {
    this.showEnterButton = this.selectedNode !== null;
  }

  /**
   * Render overlay
   */
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.updatePreview();
    this.updateEnterButton();

    if (this.showPreview && this.previewNode) {
      this.drawPreviewTooltip();
    }

    if (this.showEnterButton && this.selectedNode) {
      this.drawDetailedPreview();
      this.drawEnterButton();
    }
  }

  /**
   * Draw hover preview tooltip
   */
  drawPreviewTooltip() {
    const node = this.previewNode;
    const x = this.previewPosition.x;
    const y = this.previewPosition.y;

    this.ctx.save();

    // Background
    const padding = 12;
    const lineHeight = 18;
    const lines = [
      `${getNodeTypeIcon(node.type)} ${this.getNodeTypeName(node.type)}`,
      node.state
    ];

    const maxWidth = Math.max(...lines.map(l => this.ctx.measureText(l).width));
    const boxWidth = maxWidth + padding * 2;
    const boxHeight = lines.length * lineHeight + padding * 2;

    let boxX = x + 15;
    let boxY = y - boxHeight / 2;

    // Keep tooltip on screen
    if (boxX + boxWidth > this.canvas.width - 10) {
      boxX = x - boxWidth - 15;
    }
    if (boxY < 10) boxY = 10;
    if (boxY + boxHeight > this.canvas.height - 10) {
      boxY = this.canvas.height - boxHeight - 10;
    }

    // Draw box
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    this.ctx.lineWidth = 1;

    this.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
    this.ctx.fill();
    this.ctx.stroke();

    // Draw text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '13px "Rajdhani", sans-serif';
    this.ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
      this.ctx.fillText(line, boxX + padding, boxY + padding + i * lineHeight);
    });

    this.ctx.restore();
  }

  /**
   * Draw detailed preview (when node is selected)
   */
  drawDetailedPreview() {
    const node = this.selectedNode;

    this.ctx.save();

    // Center panel
    const panelWidth = 400;
    const panelHeight = 200;
    const panelX = (this.canvas.width - panelWidth) / 2;
    const panelY = this.canvas.height - panelHeight - 120;

    // Background with glow
    this.ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    this.ctx.shadowBlur = 20;

    this.ctx.fillStyle = 'rgba(10, 10, 16, 0.95)';
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    this.ctx.lineWidth = 2;

    this.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;

    // Title
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 18px "Rajdhani", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      this.getNodeTypeName(node.type).toUpperCase(),
      panelX + panelWidth / 2,
      panelY + 25
    );

    // Description
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px "Rajdhani", sans-serif';
    this.ctx.textAlign = 'center';

    const description = getNodeTypeDescription(node.type);
    this.wrapText(
      description,
      panelX + panelWidth / 2,
      panelY + 60,
      panelWidth - 60,
      20
    );

    // Node ID (debug)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '11px "Rajdhani", sans-serif';
    this.ctx.fillText(
      `Node: ${node.id}`,
      panelX + panelWidth / 2,
      panelY + panelHeight - 20
    );

    this.ctx.restore();
  }

  /**
   * Draw "Enter" button
   */
  drawEnterButton() {
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = (this.canvas.width - buttonWidth) / 2;
    const buttonY = this.canvas.height - 80;

    this.enterButtonBounds = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight
    };

    this.ctx.save();

    // Glowing background
    this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    this.ctx.shadowBlur = 20;

    this.ctx.fillStyle = 'rgba(255, 215, 0, 1.0)';
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 1)';
    this.ctx.lineWidth = 3;

    this.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;

    // Text with clear contrast
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 20px "Rajdhani", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.letterSpacing = '0.1em';

    // Draw text with slight offset for better visibility
    this.ctx.fillText(
      'ENTER NODE',
      buttonX + buttonWidth / 2,
      buttonY + buttonHeight / 2
    );

    this.ctx.restore();
  }

  /**
   * Check if click is on "Enter" button
   */
  isClickOnEnterButton(x, y) {
    if (!this.enterButtonBounds) return false;

    const bounds = this.enterButtonBounds;
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  }

  /**
   * Handle click
   */
  handleClick(x, y) {
    if (this.isClickOnEnterButton(x, y) && this.selectedNode) {
      console.log('[MapUIOverlay] Enter button clicked');

      if (this.onEnterNode) {
        this.onEnterNode(this.selectedNode);
      }

      return true; // Consumed click
    }

    return false; // Click not consumed
  }

  /**
   * Utility: Draw rounded rectangle
   */
  roundRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  /**
   * Utility: Wrap text
   */
  wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let offsetY = 0;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        this.ctx.fillText(line, x, y + offsetY);
        line = words[i] + ' ';
        offsetY += lineHeight;
      } else {
        line = testLine;
      }
    }

    this.ctx.fillText(line, x, y + offsetY);
  }

  /**
   * Get human-readable node type name
   */
  getNodeTypeName(type) {
    const names = {
      combat: 'Combat Encounter',
      resource: 'Resource Cache',
      event: 'Unknown Event',
      rest: 'Safe Room',
      echo: 'Echo Manifestation',
      exit: 'Ring Exit',
      start: 'Entry Point'
    };
    return names[type] || 'Unknown';
  }

  dispose() {
    // Clean up
  }
}
