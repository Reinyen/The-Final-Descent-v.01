/**
 * Map Info Band
 * Handles all atmospheric information displays around the map
 * - Top: Ring info, progress, exit status
 * - Bottom: Crew status, resources
 * - Right: Node history
 * - Ambient effects
 */

import { MapConfig } from '../../data/map-config.js';
import { getCharacter } from '../../data/characters.js';

export class MapInfoBand {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: true });

    // Game state (to be updated by controller)
    this.currentRing = 1;
    this.ringName = '';
    this.ringSubtitle = '';
    this.nodesCleared = 0;
    this.totalNodes = 0;
    this.requiredNodes = 0;
    this.exitAwakened = false;

    // Crew state
    this.crew = [
      { id: 'iona', hp: 40, maxHp: 40, mutation: 0, stress: 0 },
      { id: 'rhea', hp: 25, maxHp: 25, mutation: 0, stress: 0 },
      { id: 'jonas', hp: 20, maxHp: 20, mutation: 0, stress: 0 }
    ];

    // Resources
    this.dataFragments = 0;
    this.tools = 0;
    this.archiveSlotsFilled = 0;
    this.archiveSlotsTotal = 10;

    // Node history
    this.nodeHistory = [];
    this.maxHistoryEntries = 5;

    // Animation state
    this.time = 0;
    this.exitPulsePhase = 0;
    this.sparkParticles = [];
    this.shadowWavePhase = 0;
    this.blurSections = [];
    this.idleTime = 0;
    this.idleThreshold = 3000; // 3 seconds

    // Ghost effect for history
    this.historyGhostPhase = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    console.log('[MapInfoBand] Initialized');
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Update game state
   */
  updateState(state) {
    if (state.currentRing !== undefined) this.currentRing = state.currentRing;
    if (state.ringName !== undefined) this.ringName = state.ringName;
    if (state.ringSubtitle !== undefined) this.ringSubtitle = state.ringSubtitle;
    if (state.nodesCleared !== undefined) this.nodesCleared = state.nodesCleared;
    if (state.totalNodes !== undefined) this.totalNodes = state.totalNodes;
    if (state.requiredNodes !== undefined) this.requiredNodes = state.requiredNodes;
    if (state.exitAwakened !== undefined) this.exitAwakened = state.exitAwakened;
    if (state.crew !== undefined) this.crew = state.crew;
    if (state.dataFragments !== undefined) this.dataFragments = state.dataFragments;
    if (state.tools !== undefined) this.tools = state.tools;
    if (state.archiveSlotsFilled !== undefined) this.archiveSlotsFilled = state.archiveSlotsFilled;
    if (state.archiveSlotsTotal !== undefined) this.archiveSlotsTotal = state.archiveSlotsTotal;
  }

  /**
   * Add entry to node history
   */
  addHistoryEntry(nodeType, description) {
    this.nodeHistory.unshift({
      type: nodeType,
      description,
      timestamp: Date.now()
    });

    // Keep only recent entries
    if (this.nodeHistory.length > this.maxHistoryEntries) {
      this.nodeHistory.pop();
    }
  }

  /**
   * Reset idle timer
   */
  resetIdleTimer() {
    this.idleTime = 0;
  }

  /**
   * Main render function
   */
  render(deltaTime = 16) {
    this.time += deltaTime;
    this.idleTime += deltaTime;

    // Test: Animate crew stats slightly for demonstration
    this.animateCrewStatsTest();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderTopEdge();
    this.renderBottomEdge();
    this.renderRightSide();
    this.updateAnimations(deltaTime);
  }

  /**
   * Test animation for crew stats (simulates changes)
   */
  animateCrewStatsTest() {
    const cycle = (this.time / 5000) % 1; // 5 second cycle

    this.crew.forEach((member, index) => {
      // Slowly oscillate mutation and stress
      const offset = index * 0.3;
      member.mutation = Math.abs(Math.sin((cycle + offset) * Math.PI * 2)) * 40;
      member.stress = Math.abs(Math.cos((cycle + offset + 0.2) * Math.PI * 2)) * 60;

      // Simulate slight health variation
      member.hp = member.maxHp * (0.7 + Math.sin((cycle + offset) * Math.PI) * 0.3);
    });

    // Simulate resource changes
    this.dataFragments = Math.floor(cycle * 50);
    this.tools = Math.floor(Math.sin(cycle * Math.PI * 2) * 5) + 5;
    this.archiveSlotsFilled = Math.floor(cycle * 10);
  }

  /**
   * Render top edge information
   */
  renderTopEdge() {
    const padding = 20;
    const y = padding;

    this.ctx.save();

    // Ring name and subtitle (left side)
    this.ctx.font = 'bold 24px "Rajdhani", sans-serif';
    this.ctx.fillStyle = '#00FFFF';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    const ringTitle = `RING ${this.currentRing} — ${this.ringName.toUpperCase()}`;
    this.ctx.fillText(ringTitle, padding, y);

    // Ominous subtitle
    this.ctx.font = '14px "Rajdhani", sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText(this.ringSubtitle, padding, y + 32);

    // Progress summary (center-left)
    const progressX = padding;
    const progressY = y + 60;

    this.ctx.font = '16px "Rajdhani", sans-serif';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillText(`Nodes cleared: ${this.nodesCleared} / ${this.totalNodes}`, progressX, progressY);

    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
    this.ctx.fillText(`Required to unlock exit: ${this.requiredNodes} / ${this.totalNodes}`, progressX, progressY + 22);

    // Exit indicator (right side of top edge)
    this.renderExitIndicator();

    this.ctx.restore();
  }

  /**
   * Render exit node status indicator
   */
  renderExitIndicator() {
    const size = 16;
    const x = this.canvas.width - 150;
    const y = 30;

    this.ctx.save();

    // Label
    this.ctx.font = '12px "Rajdhani", sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.textAlign = 'right';
    this.ctx.fillText('EXIT NODE', x - size - 10, y + size / 2 - 6);

    // Pulsing indicator
    this.exitPulsePhase = (this.time / 1000) % 2; // 2 second cycle
    const pulseIntensity = 0.5 + 0.5 * Math.sin(this.exitPulsePhase * Math.PI);

    if (this.exitAwakened) {
      // Awakened: bright pulsing gold
      this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
      this.ctx.shadowBlur = 15 * pulseIntensity;
      this.ctx.fillStyle = `rgba(255, 215, 0, ${0.8 + 0.2 * pulseIntensity})`;
    } else {
      // Dormant: dim red pulse
      this.ctx.shadowColor = 'rgba(200, 0, 0, 0.4)';
      this.ctx.shadowBlur = 8 * pulseIntensity;
      this.ctx.fillStyle = `rgba(200, 0, 0, ${0.3 + 0.2 * pulseIntensity})`;
    }

    this.ctx.beginPath();
    this.ctx.arc(x, y + size / 2, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Status text
    this.ctx.shadowBlur = 0;
    this.ctx.font = '11px "Rajdhani", sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = this.exitAwakened ? '#FFD700' : '#CC0000';
    this.ctx.fillText(
      this.exitAwakened ? 'AWAKENED' : 'DORMANT',
      x + size,
      y + size / 2 - 5
    );

    this.ctx.restore();
  }

  /**
   * Render bottom edge (crew status and resources)
   */
  renderBottomEdge() {
    const padding = 20;
    const bottomY = this.canvas.height - 120;

    this.ctx.save();

    // Crew members (centered)
    this.renderCrewStatus(bottomY);

    // Resource counters (bottom right)
    this.renderResourceCounters(bottomY);

    this.ctx.restore();
  }

  /**
   * Render crew status displays
   */
  renderCrewStatus(baseY) {
    const crewSpacing = 150;
    const startX = this.canvas.width / 2 - (crewSpacing * (this.crew.length - 1)) / 2;

    this.crew.forEach((member, index) => {
      const x = startX + index * crewSpacing;
      this.renderCrewMember(member, x, baseY);
    });
  }

  /**
   * Render individual crew member
   */
  renderCrewMember(member, x, y) {
    const char = getCharacter(member.id);
    if (!char) return;

    this.ctx.save();

    // Minimalistic silhouette/glyph (circle with initial)
    const glyphSize = 40;

    // Outer ring
    this.ctx.strokeStyle = char.color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, glyphSize / 2, 0, Math.PI * 2);
    this.ctx.stroke();

    // Character initial
    this.ctx.font = 'bold 20px "Rajdhani", sans-serif';
    this.ctx.fillStyle = char.color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(char.name[0], x, y);

    // Health bar (thin, beneath icon)
    const healthBarWidth = 80;
    const healthBarHeight = 4;
    const healthBarY = y + glyphSize / 2 + 10;
    const healthPercent = member.hp / member.maxHp;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(x - healthBarWidth / 2, healthBarY, healthBarWidth, healthBarHeight);

    const healthColor = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFD700' : '#FF0000';
    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(x - healthBarWidth / 2, healthBarY, healthBarWidth * healthPercent, healthBarHeight);

    // Mutation gauge (arc around left side)
    this.renderArcGauge(x, y, glyphSize / 2 + 6, member.mutation / 100, '#9D4EDD', Math.PI, Math.PI * 1.5, true);

    // Stress gauge (arc around right side)
    this.renderArcGauge(x, y, glyphSize / 2 + 6, member.stress / 100, '#E63946', 0, Math.PI * 0.5, false);

    this.ctx.restore();
  }

  /**
   * Render arc gauge (mutation/stress)
   */
  renderArcGauge(x, y, radius, percent, color, startAngle, endAngle, chunkAnimation) {
    this.ctx.save();

    const gaugeLength = endAngle - startAngle;
    const fillAngle = startAngle + gaugeLength * Math.min(percent, 1);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, startAngle, endAngle);
    this.ctx.stroke();

    if (percent > 0) {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();

      if (chunkAnimation) {
        // Mutation: creeps upward in uneven chunks
        const chunks = Math.floor(percent * 10);
        for (let i = 0; i < chunks; i++) {
          const chunkStart = startAngle + (gaugeLength * i) / 10;
          const chunkEnd = chunkStart + gaugeLength / 10 * 0.8; // Gaps between chunks
          this.ctx.beginPath();
          this.ctx.arc(x, y, radius, chunkStart, chunkEnd);
          this.ctx.stroke();
        }
      } else {
        // Stress: sharp jumps
        this.ctx.arc(x, y, radius, startAngle, fillAngle);
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  /**
   * Render resource counters
   */
  renderResourceCounters(baseY) {
    const x = this.canvas.width - 200;
    const y = baseY;
    const lineHeight = 25;

    this.ctx.save();
    this.ctx.font = '14px "Rajdhani", sans-serif';
    this.ctx.textAlign = 'left';

    // Data fragments (shard icon)
    this.ctx.fillStyle = '#00FFFF';
    this.ctx.fillText('◆', x, y);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillText(`Data Fragments: ${this.dataFragments}`, x + 20, y);

    // Tools (geometric symbol)
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillText('⬢', x, y + lineHeight);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillText(`Tools: ${this.tools}`, x + 20, y + lineHeight);

    // Archive slots
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillText('Archive:', x, y + lineHeight * 2);

    // Draw slot boxes
    const slotSize = 12;
    const slotSpacing = 14;
    const slotStartX = x + 60;
    for (let i = 0; i < this.archiveSlotsTotal; i++) {
      const slotX = slotStartX + i * slotSpacing;
      const slotY = y + lineHeight * 2 - slotSize / 2;

      if (i < this.archiveSlotsFilled) {
        // Filled slot
        this.ctx.fillStyle = '#9D4EDD';
        this.ctx.fillRect(slotX, slotY, slotSize, slotSize);
      } else {
        // Empty slot
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(slotX, slotY, slotSize, slotSize);
      }
    }

    this.ctx.restore();
  }

  /**
   * Render right side node history
   */
  renderRightSide() {
    const x = this.canvas.width - 280;
    const y = 200;
    const stripHeight = 50;
    const stripSpacing = 10;

    this.ctx.save();

    // Ghost effect phase
    this.historyGhostPhase = (this.time / 3000) % 1; // 3 second cycle

    this.nodeHistory.forEach((entry, index) => {
      const stripY = y + index * (stripHeight + stripSpacing);
      this.renderHistoryStrip(entry, x, stripY, stripHeight, index);
    });

    this.ctx.restore();
  }

  /**
   * Render single history strip
   */
  renderHistoryStrip(entry, x, y, height, index) {
    const width = 260;

    // Ghost effect: occasionally fade out and snap back
    let opacity = 1.0;
    if (this.historyGhostPhase > 0.8 && this.historyGhostPhase < 0.95) {
      opacity = 0.2; // Ghost out
    }

    this.ctx.save();
    this.ctx.globalAlpha = opacity;

    // Node type color bar
    const typeColor = this.getNodeTypeColor(entry.type);
    this.ctx.fillStyle = typeColor;
    this.ctx.fillRect(x, y, 4, height);

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x + 4, y, width - 4, height);

    // Border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);

    // Icon
    const icon = this.getNodeTypeIcon(entry.type);
    this.ctx.font = '20px "Rajdhani", sans-serif';
    this.ctx.fillStyle = typeColor;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(icon, x + 15, y + height / 2);

    // Description
    this.ctx.font = '12px "Rajdhani", sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillText(entry.description, x + 45, y + height / 2);

    this.ctx.restore();
  }

  /**
   * Get node type color
   */
  getNodeTypeColor(type) {
    const colors = {
      combat: '#E63946',
      resource: '#06A77D',
      event: '#9D4EDD',
      rest: '#4A90E2',
      echo: '#9D4EDD',
      exit: '#FFD700'
    };
    return colors[type] || '#FFFFFF';
  }

  /**
   * Get node type icon
   */
  getNodeTypeIcon(type) {
    const icons = {
      combat: '⚔',
      resource: '◆',
      event: '?',
      rest: '■',
      echo: '◎',
      exit: '▼'
    };
    return icons[type] || '○';
  }

  /**
   * Update ambient animations
   */
  updateAnimations(deltaTime) {
    // Shadow wave effect (passed to renderer)
    this.shadowWavePhase = (this.time / 4000) % 1; // 4 second cycle

    // Could trigger blur effects periodically
    if (Math.random() < 0.001) { // Very rare
      this.triggerBlurEffect();
    }
  }

  /**
   * Trigger blur effect on network section
   */
  triggerBlurEffect() {
    // This would be handled by the renderer
    console.log('[MapInfoBand] Blur effect triggered');
  }

  /**
   * Get idle intensity multiplier
   */
  getIdleIntensity() {
    if (this.idleTime < this.idleThreshold) {
      return 1.0;
    }

    // Slowly intensify current node
    const overtime = this.idleTime - this.idleThreshold;
    return 1.0 + Math.min(overtime / 5000, 0.5); // Max 1.5x intensity
  }

  dispose() {
    // Clean up
  }
}
