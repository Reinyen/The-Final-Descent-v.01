/**
 * Roster Transition (Entry Cinematic)
 * Implements the 6-star partition animation per GDD §9
 *
 * Phases A-E (authoritative):
 * A - Void expansion (1.0s) + blackout (0.18s)
 * B - Six stars emerge + arrange (1.1s)
 * C - Fate chooses + death insinuation (1.2s)
 * D - The fall (0.9s)
 * E - Morph to UI (0.9s)
 *
 * Total: ~5.3s
 */

import * as THREE from 'three';
import { getCharacterById } from './character-data.js';

export class RosterTransition {
  constructor(scene, camera, livingIds, fallenIds) {
    this.scene = scene;
    this.camera = camera;
    this.livingIds = livingIds;
    this.fallenIds = fallenIds;

    // Transition state
    this.isPlaying = false;
    this.elapsedTime = 0;
    this.onCompleteCallback = null;

    // Six stars
    this.stars = [];

    // Phase timings (cumulative) per GDD §9.2
    this.phases = {
      A_VOID_START: 0,
      A_VOID_END: 1.0,
      A_BLACKOUT_END: 1.18,
      B_EMERGE_END: 2.28,
      C_FATE_END: 3.48,
      D_FALL_END: 4.38,
      E_MORPH_END: 5.28
    };

    console.log('[RosterTransition] Initialized');
  }

  /**
   * Start the entry cinematic
   * @param {Function} onComplete - Callback when cinematic completes
   */
  start(onComplete) {
    this.isPlaying = true;
    this.elapsedTime = 0;
    this.onCompleteCallback = onComplete;

    // Create the six stars
    this.createSixStars();

    console.log('[RosterTransition] Starting cinematic');
  }

  /**
   * Create six stars for the cinematic
   * Per GDD §9.2 Phase B: Six stars emerge
   */
  createSixStars() {
    const allIds = [...this.livingIds, ...this.fallenIds];

    for (let i = 0; i < 6; i++) {
      const charId = allIds[i];
      const char = getCharacterById(charId);
      const isFallen = this.fallenIds.includes(charId);

      // Create star mesh
      const geometry = new THREE.SphereGeometry(0.5, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(char.themeColor),
        transparent: true,
        opacity: 0
      });

      const star = new THREE.Mesh(geometry, material);
      star.position.set(0, 0, 0); // Start at center

      // Add glow
      const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(char.themeColor),
        transparent: true,
        opacity: 0,
        side: THREE.BackSide
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      star.add(glow);

      this.scene.add(star);

      // Store star data
      this.stars.push({
        mesh: star,
        glow,
        charId,
        isFallen,
        themeColor: new THREE.Color(char.themeColor),
        initialPos: new THREE.Vector3(0, 0, 0),
        targetPos: new THREE.Vector3(0, 0, 0),
        currentPos: new THREE.Vector3(0, 0, 0)
      });
    }
  }

  /**
   * Update transition animation
   * @param {number} deltaTime
   */
  update(deltaTime) {
    if (!this.isPlaying) return;

    this.elapsedTime += deltaTime;

    // Determine current phase and update accordingly
    if (this.elapsedTime < this.phases.A_VOID_END) {
      this.updatePhaseA();
    } else if (this.elapsedTime < this.phases.A_BLACKOUT_END) {
      this.updateBlackout();
    } else if (this.elapsedTime < this.phases.B_EMERGE_END) {
      this.updatePhaseB();
    } else if (this.elapsedTime < this.phases.C_FATE_END) {
      this.updatePhaseC();
    } else if (this.elapsedTime < this.phases.D_FALL_END) {
      this.updatePhaseD();
    } else if (this.elapsedTime < this.phases.E_MORPH_END) {
      this.updatePhaseE();
    } else {
      this.complete();
    }
  }

  /**
   * Phase A: Void expansion (1.0s)
   * Visual: Fade in from black (prep for stars)
   */
  updatePhaseA() {
    const t = this.elapsedTime / this.phases.A_VOID_END;
    // Stars remain invisible, void is expanding (handled by intro page transition)
  }

  /**
   * Blackout hold (0.18s)
   */
  updateBlackout() {
    // Brief pause in darkness
  }

  /**
   * Phase B: Six stars emerge + arrange (1.1s)
   * Per GDD §9.2: Stars ignite, arrange into two rows of three, pulse once
   */
  updatePhaseB() {
    const phaseStart = this.phases.A_BLACKOUT_END;
    const phaseEnd = this.phases.B_EMERGE_END;
    const phaseDuration = phaseEnd - phaseStart;
    const t = (this.elapsedTime - phaseStart) / phaseDuration;

    // Ease function
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const progress = easeOut(Math.min(t, 1));

    // Arrange stars into two rows of three
    // Top row (y = 2): Living stars
    // Bottom row (y = -2): Fallen stars
    const spacing = 3;

    this.stars.forEach((star, i) => {
      // Fade in stars
      star.mesh.material.opacity = Math.min(progress * 1.5, 1);
      star.glow.material.opacity = Math.min(progress * 1.5, 0.4);

      // Calculate target position (two rows of three)
      let row, col;
      if (i < 3) {
        // Top row (will become Living)
        row = 2;
        col = i - 1; // -1, 0, 1
      } else {
        // Bottom row (will become Fallen)
        row = -2;
        col = (i - 3) - 1; // -1, 0, 1
      }

      const targetX = col * spacing;
      const targetY = row;
      const targetZ = 0;

      // Interpolate position
      star.mesh.position.x = THREE.MathUtils.lerp(0, targetX, progress);
      star.mesh.position.y = THREE.MathUtils.lerp(0, targetY, progress);
      star.mesh.position.z = THREE.MathUtils.lerp(0, targetZ, progress);

      // Synchronous pulse at end of phase
      if (t > 0.8) {
        const pulseT = (t - 0.8) / 0.2;
        const pulseScale = 1 + Math.sin(pulseT * Math.PI) * 0.2;
        star.mesh.scale.setScalar(pulseScale);
      }
    });
  }

  /**
   * Phase C: Fate chooses + death insinuation (1.2s)
   * Per GDD §9.2: Fallen stars show death tell (fracture, collapse, ash)
   */
  updatePhaseC() {
    const phaseStart = this.phases.B_EMERGE_END;
    const phaseEnd = this.phases.C_FATE_END;
    const phaseDuration = phaseEnd - phaseStart;
    const t = (this.elapsedTime - phaseStart) / phaseDuration;

    this.stars.forEach((star) => {
      if (star.isFallen) {
        // Death insinuation for Fallen
        if (t < 0.3) {
          // Halo tightens
          const tighten = t / 0.3;
          star.glow.scale.setScalar(1 - tighten * 0.3);
        } else if (t < 0.6) {
          // Core light collapses
          const collapse = (t - 0.3) / 0.3;
          star.mesh.material.opacity = 1 - collapse * 0.5;
          star.mesh.material.color.lerp(new THREE.Color(0x404040), collapse);
        } else {
          // Star ash sheds (reduce glow)
          const shed = (t - 0.6) / 0.4;
          star.glow.material.opacity = 0.4 * (1 - shed);
        }
      } else {
        // Living stars remain bright
        star.mesh.material.opacity = 1;
        star.glow.material.opacity = 0.4;
      }
    });
  }

  /**
   * Phase D: The fall (0.9s)
   * Per GDD §9.2: Fallen drop to bottom positions, Living hold higher
   */
  updatePhaseD() {
    const phaseStart = this.phases.C_FATE_END;
    const phaseEnd = this.phases.D_FALL_END;
    const phaseDuration = phaseEnd - phaseStart;
    const t = (this.elapsedTime - phaseStart) / phaseDuration;

    // Ease with weight/drag
    const easeFall = (t) => t * t * (3 - 2 * t); // Smoothstep
    const progress = easeFall(Math.min(t, 1));

    this.stars.forEach((star) => {
      if (star.isFallen) {
        // Fallen drop down
        const currentY = star.mesh.position.y;
        const targetY = -4; // Drop further down
        star.mesh.position.y = THREE.MathUtils.lerp(currentY, targetY, progress);
      } else {
        // Living hold position (slight adjustment)
        // Already at correct position from Phase B
      }
    });
  }

  /**
   * Phase E: Morph to UI (0.9s)
   * Per GDD §9.2: Stars morph into UI card/portrait frames
   * Stars fade out as DOM elements fade in
   */
  updatePhaseE() {
    const phaseStart = this.phases.D_FALL_END;
    const phaseEnd = this.phases.E_MORPH_END;
    const phaseDuration = phaseEnd - phaseStart;
    const t = (this.elapsedTime - phaseStart) / phaseDuration;

    const progress = Math.min(t, 1);

    // Fade out stars
    this.stars.forEach((star) => {
      star.mesh.material.opacity = 1 - progress;
      star.glow.material.opacity = 0.4 * (1 - progress);
    });

    // UI elements will fade in via CSS (triggered by main app)
  }

  /**
   * Complete the transition
   */
  complete() {
    this.isPlaying = false;

    // Clean up stars
    this.stars.forEach((star) => {
      this.scene.remove(star.mesh);
      star.mesh.geometry.dispose();
      star.mesh.material.dispose();
      star.glow.geometry.dispose();
      star.glow.material.dispose();
    });
    this.stars = [];

    console.log('[RosterTransition] Cinematic complete');

    // Trigger callback
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
      this.onCompleteCallback = null;
    }
  }

  /**
   * Get completion progress [0, 1]
   */
  getProgress() {
    return Math.min(this.elapsedTime / this.phases.E_MORPH_END, 1);
  }

  /**
   * Check if transition is complete
   */
  isComplete() {
    return !this.isPlaying;
  }
}
