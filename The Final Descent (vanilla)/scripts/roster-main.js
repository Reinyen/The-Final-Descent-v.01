/**
 * Roster Selection - Main Application Orchestrator
 * Coordinates all modules and manages application flow
 */

import { CHARACTERS, getAllCharacterIds, validateCharacterData } from './character-data.js';
import { RosterLogic } from './roster-logic.js';
import { RosterStateMachine, RosterState } from './roster-state-machine.js';
import { RosterUI } from './roster-ui.js';
import { RosterScene } from './roster-scene.js';
import { RosterTransition } from './roster-transition.js';
import { RosterIntroOrbs } from './roster-intro-orbs.js';

class RosterSelectionApp {
  constructor() {
    // Configuration
    this.config = {
      quality: 'auto', // 'auto' | 'high' | 'medium' | 'low'
      rosterSeed: Date.now(), // Default seed (can be passed from URL params)
      debugMode: false
    };

    // Core modules
    this.stateMachine = null;
    this.rosterLogic = null;
    this.ui = null;
    this.scene = null;
    this.transition = null;
    this.introOrbs = null;

    // State
    this.livingIds = [];
    this.fallenIds = [];
    this.selectedCardId = null;
    this.rerollsRemaining = 3; // Per GDD §0

    // Animation
    this.animationFrameId = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.isInitialized) {
      console.warn('[RosterApp] Already initialized');
      return;
    }

    console.log('[RosterApp] Initializing...');

    // Validate character data
    if (!validateCharacterData()) {
      console.error('[RosterApp] Character data validation failed');
      return;
    }

    // Parse URL parameters (for seed override)
    this.parseURLParams();

    // Detect quality tier
    const quality = this.config.quality === 'auto'
      ? this.detectQuality()
      : this.config.quality;

    console.log('[RosterApp] Quality tier:', quality);

    // Initialize state machine
    this.stateMachine = new RosterStateMachine();
    this.stateMachine.addListener((newState, oldState) => {
      this.handleStateChange(newState, oldState);
    });

    // Initialize roster logic
    const allCharacterIds = getAllCharacterIds();
    this.rosterLogic = new RosterLogic(allCharacterIds);

    // Get initial partition
    const { livingIds, fallenIds } = this.rosterLogic.getInitialPartition(this.config.rosterSeed);
    this.livingIds = livingIds;
    this.fallenIds = fallenIds;

    console.log('[RosterApp] Initial partition:', { livingIds, fallenIds });

    // Initialize Three.js scene
    this.scene = new RosterScene(quality);
    await this.scene.init();

    // Initialize UI controller
    this.ui = new RosterUI(this.stateMachine, {
      onCardSelected: (charId) => this.handleCardSelected(charId),
      onSingleReroll: (charId) => this.handleSingleReroll(charId),
      onTotalReroll: () => this.handleTotalReroll(),
      onDescend: () => this.handleDescend()
    });

    // Initialize transition (entry cinematic)
    const blackoutElement = document.getElementById('roster-blackout');
    this.transition = new RosterTransition(blackoutElement);

    // Intro orb flourish
    const orbContainer = document.getElementById('orb-intro-layer');
    this.introOrbs = new RosterIntroOrbs(orbContainer);

    // Start animation loop
    this.startAnimationLoop();

    // Start entry cinematic
    this.startEntryCinematic();

    this.isInitialized = true;
    console.log('[RosterApp] Initialization complete');
  }

  /**
   * Parse URL parameters
   */
  parseURLParams() {
    const params = new URLSearchParams(window.location.search);

    if (params.has('seed')) {
      this.config.rosterSeed = params.get('seed');
      console.log('[RosterApp] Using seed from URL:', this.config.rosterSeed);
    }

    if (params.has('quality')) {
      this.config.quality = params.get('quality');
    }

    if (params.has('debug')) {
      this.config.debugMode = params.get('debug') === 'true';
    }
  }

  /**
   * Detect quality tier based on device capabilities
   */
  detectQuality() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio;
    const totalPixels = width * height * Math.min(pixelRatio, 2);

    if (totalPixels < 1920 * 1080) {
      return 'low';
    } else if (totalPixels < 2560 * 1440) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Start the entry cinematic
   * Per GDD §9.1
   */
  startEntryCinematic() {
    console.log('[RosterApp] Starting entry cinematic');

    // Kick off orb prelude immediately; transition timing already leaves room for the full 8.5-10s sequence
    if (this.introOrbs) {
      this.introOrbs.playSequence(this.livingIds, this.fallenIds);
    }

    this.transition.start(() => {
      console.log('[RosterApp] Entry cinematic complete');

      // Transition to Ready state
      this.stateMachine.transition(RosterState.READY);

      // Reveal UI overlay
      this.ui.revealOverlay();

      // Show UI elements with fade-in
      this.ui.showTitle();
      this.ui.renderLivingCards(this.livingIds);
      this.ui.renderFallenPortraits(this.fallenIds);
      this.ui.updateRerollStars(this.rerollsRemaining);
      this.updateButtonStates();

      // Emit FALLEN_ASSIGNED events per GDD §4.4
      this.fallenIds.forEach(id => {
        console.log('[RosterApp] FALLEN_ASSIGNED:', id);
        // Hook for persistence system (future integration)
      });

      // Start memory flicker timer per GDD §12
      this.ui.startMemoryFlicker();
    });
  }

  /**
   * Start animation loop
   */
  startAnimationLoop() {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const deltaTime = this.scene.clock.getDelta();

      // Update transition if playing
      if (this.transition && !this.transition.isComplete()) {
        this.transition.update(deltaTime);
      }

      // Update scene
      this.scene.update(deltaTime);

      // Render
      this.scene.render();
    };

    animate();
  }

  /**
   * Handle state changes
   * @param {string} newState
   * @param {string} oldState
   */
  handleStateChange(newState, oldState) {
    console.log('[RosterApp] State change:', oldState, '→', newState);

    // Update UI lock state
    const uiLocked = this.stateMachine.isLocked();
    this.ui.setPopoverLocked(uiLocked);
    this.updateButtonStates();
  }

  /**
   * Handle card selection
   * @param {string} charId
   */
  handleCardSelected(charId) {
    this.selectedCardId = charId;
    this.updateButtonStates();
    console.log('[RosterApp] Card selected:', charId);
  }

  /**
   * Handle single reroll
   * Per GDD §8.5: Costs 2 rerolls, swaps selected Living
   * @param {string} selectedCharId
   */
  handleSingleReroll(selectedCharId) {
    if (this.stateMachine.isLocked()) return;
    if (this.rerollsRemaining < 2) return;
    if (!selectedCharId) return;

    console.log('[RosterApp] Single reroll requested for:', selectedCharId);

    // Deduct rerolls immediately per GDD §8.5
    this.rerollsRemaining -= 2;
    this.ui.animateStarSpend(2);
    this.ui.updateRerollStars(this.rerollsRemaining);

    // Transition to animating state
    this.stateMachine.transition(RosterState.SINGLE_REROLL_ANIMATING);

    // Apply reroll logic
    const result = this.rosterLogic.applySingleReroll(
      this.config.rosterSeed,
      this.livingIds,
      selectedCharId
    );

    this.livingIds = result.newLivingIds;
    this.fallenIds = result.newFallenIds;

    // Animate reroll (simplified for now - just update after delay)
    setTimeout(() => {
      // Update UI
      this.ui.renderLivingCards(this.livingIds);
      this.ui.renderFallenPortraits(this.fallenIds);

      // Clear selection (per GDD §8.3: Total reroll clears selection)
      this.selectedCardId = null;
      this.ui.setSelectedCard(null);

      // Return to Ready state
      this.stateMachine.transition(RosterState.READY);
      this.updateButtonStates();
    }, 1000); // Placeholder animation duration
  }

  /**
   * Handle total reroll
   * Per GDD §8.5: Costs 1 reroll, replaces all 3 Living
   */
  handleTotalReroll() {
    if (this.stateMachine.isLocked()) return;
    if (this.rerollsRemaining < 1) return;

    console.log('[RosterApp] Total reroll requested');

    // Deduct reroll immediately per GDD §8.5
    this.rerollsRemaining -= 1;
    this.ui.animateStarSpend(1);
    this.ui.updateRerollStars(this.rerollsRemaining);

    // Transition to animating state
    this.stateMachine.transition(RosterState.TOTAL_REROLL_ANIMATING);

    // Apply reroll logic
    const result = this.rosterLogic.applyTotalReroll(
      this.config.rosterSeed,
      this.livingIds
    );

    this.livingIds = result.newLivingIds;
    this.fallenIds = result.newFallenIds;

    // Animate reroll (simplified for now - just update after delay)
    setTimeout(() => {
      // Update UI
      this.ui.renderLivingCards(this.livingIds);
      this.ui.renderFallenPortraits(this.fallenIds);

      // Clear selection per GDD §8.3
      this.selectedCardId = null;
      this.ui.setSelectedCard(null);

      // Return to Ready state
      this.stateMachine.transition(RosterState.READY);
      this.updateButtonStates();
    }, 1200); // Placeholder animation duration
  }

  /**
   * Handle descend button click
   * Per GDD §10
   */
  handleDescend() {
    if (this.stateMachine.isLocked()) return;

    console.log('[RosterApp] Descend clicked');

    // Transition to Confirming state
    this.stateMachine.transition(RosterState.CONFIRMING);

    // Prepare confirmation payload per GDD §4.3
    const payload = {
      rosterSeed: this.config.rosterSeed,
      livingIds: this.livingIds,
      fallenIds: this.fallenIds,
      rerollsRemaining: this.rerollsRemaining
    };

    console.log('[RosterApp] Confirmation payload:', payload);

    // For now, show alert (replace with actual navigation)
    setTimeout(() => {
      alert(`🌌 Descending with:\n\nLiving: ${this.livingIds.join(', ')}\n\nFallen: ${this.fallenIds.join(', ')}\n\nRerolls remaining: ${this.rerollsRemaining}`);

      // In production, navigate to next screen:
      // window.location.href = '/floor-1';

      // For demo, reload
      window.location.reload();
    }, 500);
  }

  /**
   * Update button enabled/disabled states
   */
  updateButtonStates() {
    this.ui.updateButtonStates({
      selectedCardId: this.selectedCardId,
      rerollsRemaining: this.rerollsRemaining,
      uiLocked: this.stateMachine.isLocked()
    });
  }

  /**
   * Destroy and clean up
   */
  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.scene) {
      this.scene.destroy();
    }

    if (this.ui) {
      this.ui.destroy();
    }

    this.isInitialized = false;
    console.log('[RosterApp] Destroyed');
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new RosterSelectionApp();
    app.init();

    // Expose globally for debugging
    window.rosterApp = app;
  });
} else {
  const app = new RosterSelectionApp();
  app.init();

  // Expose globally for debugging
  window.rosterApp = app;
}
