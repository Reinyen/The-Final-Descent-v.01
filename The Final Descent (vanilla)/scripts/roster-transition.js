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

    // Six energy orbs with particles
    this.orbs = [];

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

    // Create the six energy orbs
    this.createSixOrbs();

    console.log('[RosterTransition] Starting cinematic');
  }

  /**
   * Create six energy orbs with particle systems
   * Per GDD §9.2 Phase B: Six stars emerge
   */
  createSixOrbs() {
    const allIds = [...this.livingIds, ...this.fallenIds];

    for (let i = 0; i < 6; i++) {
      const charId = allIds[i];
      const char = getCharacterById(charId);
      const isFallen = this.fallenIds.includes(charId);

      // Create particle system for energy orb
      const particleSystem = this.createEnergyOrbParticles();
      particleSystem.position.set(0, 0, 0); // Start at center
      this.scene.add(particleSystem);

      // Create core light
      const coreGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xFFD700), // Golden
        transparent: true,
        opacity: 0
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.position.copy(particleSystem.position);
      this.scene.add(core);

      // Create glow sphere
      const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xFFD700),
        transparent: true,
        opacity: 0,
        side: THREE.BackSide
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(particleSystem.position);
      this.scene.add(glow);

      // Create floating text label (character name)
      const textMesh = this.createTextLabel(char.name);
      textMesh.position.set(0, 1.5, 0); // Above the orb
      this.scene.add(textMesh);

      // Store orb data
      this.orbs.push({
        particles: particleSystem,
        core,
        glow,
        textLabel: textMesh,
        charId,
        charName: char.name,
        isFallen,
        targetPos: new THREE.Vector3(0, 0, 0),
        particleData: {
          positions: particleSystem.geometry.attributes.position,
          velocities: particleSystem.geometry.attributes.velocity,
          lifetimes: particleSystem.geometry.attributes.lifetime,
          maxLifetime: particleSystem.geometry.attributes.maxLifetime,
          particleCount: 600
        }
      });
    }
  }

  /**
   * Create energy orb particle system
   * Particles emit from outer circle and pull toward center
   */
  createEnergyOrbParticles() {
    const particleCount = 600;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const maxLifetimes = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);

    const emitRadius = 1.75; // Outer circle radius
    const targetRadius = 0.2; // Inner circle radius (orb core)

    for (let i = 0; i < particleCount; i++) {
      // Spawn on outer circle
      const angle = Math.random() * Math.PI * 2;
      const i3 = i * 3;

      positions[i3] = Math.cos(angle) * emitRadius;
      positions[i3 + 1] = Math.sin(angle) * emitRadius;
      positions[i3 + 2] = (Math.random() - 0.5) * 0.3;

      // Random target point on inner circle
      const targetAngle = Math.random() * Math.PI * 2;
      const targetX = Math.cos(targetAngle) * targetRadius;
      const targetY = Math.sin(targetAngle) * targetRadius;

      // Velocity toward target
      velocities[i3] = (targetX - positions[i3]) * 0.3;
      velocities[i3 + 1] = (targetY - positions[i3 + 1]) * 0.3;
      velocities[i3 + 2] = -positions[i3 + 2] * 0.2;

      lifetimes[i] = Math.random() * 5.0;
      maxLifetimes[i] = 2.0 + Math.random() * 3.0;
      sizes[i] = 0.05 + Math.random() * 0.08;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('maxLifetime', new THREE.BufferAttribute(maxLifetimes, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Shader material for particles
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float lifetime;
        attribute float maxLifetime;
        varying float vAlpha;

        void main() {
          vAlpha = smoothstep(0.0, 0.2, lifetime / maxLifetime) * smoothstep(1.0, 0.7, lifetime / maxLifetime);

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = (1.0 - smoothstep(0.3, 0.5, dist)) * vAlpha;

          // Golden color
          vec3 color = vec3(1.0, 0.843, 0.0); // Gold
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  /**
   * Create floating text label for character name
   * @param {string} name - Character name
   * @returns {THREE.Sprite}
   */
  createTextLabel(name) {
    // Create canvas for text texture
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Set font style
    context.font = 'bold 60px Cinzel, serif';
    context.fillStyle = '#FFD700'; // Golden
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Draw text with glow
    context.shadowColor = 'rgba(255, 215, 0, 0.8)';
    context.shadowBlur = 20;
    context.fillText(name, canvas.width / 2, canvas.height / 2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create sprite material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1); // Scale to readable size

    return sprite;
  }

  /**
   * Update particle system
   * @param {object} orb
   * @param {number} deltaTime
   */
  updateParticles(orb, deltaTime) {
    const data = orb.particleData;
    const positions = data.positions.array;
    const velocities = data.velocities.array;
    const lifetimes = data.lifetimes.array;
    const maxLifetimes = data.maxLifetimes.array;

    const emitRadius = 1.75;
    const targetRadius = 0.2;

    for (let i = 0; i < data.particleCount; i++) {
      const i3 = i * 3;

      // Update lifetime
      lifetimes[i] += deltaTime;

      // Respawn particle if lifetime exceeded
      if (lifetimes[i] > maxLifetimes[i]) {
        const angle = Math.random() * Math.PI * 2;
        positions[i3] = Math.cos(angle) * emitRadius;
        positions[i3 + 1] = Math.sin(angle) * emitRadius;
        positions[i3 + 2] = (Math.random() - 0.5) * 0.3;

        const targetAngle = Math.random() * Math.PI * 2;
        const targetX = Math.cos(targetAngle) * targetRadius;
        const targetY = Math.sin(targetAngle) * targetRadius;

        velocities[i3] = (targetX - positions[i3]) * 0.3;
        velocities[i3 + 1] = (targetY - positions[i3 + 1]) * 0.3;
        velocities[i3 + 2] = -positions[i3 + 2] * 0.2;

        lifetimes[i] = 0;
        maxLifetimes[i] = 2.0 + Math.random() * 3.0;
      }

      // Update position
      positions[i3] += velocities[i3] * deltaTime * 2;
      positions[i3 + 1] += velocities[i3 + 1] * deltaTime * 2;
      positions[i3 + 2] += velocities[i3 + 2] * deltaTime * 2;
    }

    data.positions.needsUpdate = true;
    data.lifetimes.needsUpdate = true;
  }

  /**
   * Update transition animation
   * @param {number} deltaTime
   */
  update(deltaTime) {
    if (!this.isPlaying) return;

    this.elapsedTime += deltaTime;

    // Update all particle systems
    this.orbs.forEach(orb => this.updateParticles(orb, deltaTime));

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
   * Visual: Fade in from black (prep for orbs)
   */
  updatePhaseA() {
    const t = this.elapsedTime / this.phases.A_VOID_END;
    // Orbs remain invisible, void is expanding
  }

  /**
   * Blackout hold (0.18s)
   */
  updateBlackout() {
    // Brief pause in darkness
  }

  /**
   * Phase B: Six orbs emerge + arrange (1.1s)
   * Per GDD §9.2: Orbs ignite, arrange into two rows of three, pulse once
   */
  updatePhaseB() {
    const phaseStart = this.phases.A_BLACKOUT_END;
    const phaseEnd = this.phases.B_EMERGE_END;
    const phaseDuration = phaseEnd - phaseStart;
    const t = (this.elapsedTime - phaseStart) / phaseDuration;

    // Ease function
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const progress = easeOut(Math.min(t, 1));

    // Arrange orbs into two rows of three
    const spacing = 3;

    this.orbs.forEach((orb, i) => {
      // Fade in particles and core
      orb.particles.material.opacity = Math.min(progress * 1.5, 1);
      orb.core.material.opacity = Math.min(progress * 1.5, 0.9);
      orb.glow.material.opacity = Math.min(progress * 1.5, 0.3);
      orb.textLabel.material.opacity = Math.min(progress * 1.2, 1);

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

      // Interpolate position for all elements
      orb.particles.position.x = THREE.MathUtils.lerp(0, targetX, progress);
      orb.particles.position.y = THREE.MathUtils.lerp(0, targetY, progress);
      orb.particles.position.z = THREE.MathUtils.lerp(0, targetZ, progress);

      orb.core.position.copy(orb.particles.position);
      orb.glow.position.copy(orb.particles.position);
      orb.textLabel.position.set(orb.particles.position.x, orb.particles.position.y + 1.5, orb.particles.position.z);

      // Synchronous pulse at end of phase
      if (t > 0.8) {
        const pulseT = (t - 0.8) / 0.2;
        const pulseScale = 1 + Math.sin(pulseT * Math.PI) * 0.3;
        orb.core.scale.setScalar(pulseScale);
        orb.glow.scale.setScalar(pulseScale);
      }
    });
  }

  /**
   * Phase C: Fate chooses + death insinuation (1.2s)
   * Per GDD §9.2: Fallen orbs show death tell (dim, collapse, dissipate)
   */
  updatePhaseC() {
    const phaseStart = this.phases.B_EMERGE_END;
    const phaseEnd = this.phases.C_FATE_END;
    const phaseDuration = phaseEnd - phaseStart;
    const t = (this.elapsedTime - phaseStart) / phaseDuration;

    this.orbs.forEach((orb) => {
      if (orb.isFallen) {
        // Death insinuation for Fallen
        if (t < 0.3) {
          // Particle system dims
          const dim = t / 0.3;
          orb.particles.material.opacity = 1 - dim * 0.5;
        } else if (t < 0.6) {
          // Core light collapses
          const collapse = (t - 0.3) / 0.3;
          orb.core.material.opacity = 0.9 * (1 - collapse * 0.6);
          orb.glow.scale.setScalar(1 - collapse * 0.4);
        } else {
          // Particles dissipate
          const dissipate = (t - 0.6) / 0.4;
          orb.glow.material.opacity = 0.3 * (1 - dissipate);
        }
      } else {
        // Living orbs remain bright
        orb.particles.material.opacity = 1;
        orb.core.material.opacity = 0.9;
        orb.glow.material.opacity = 0.3;
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

    this.orbs.forEach((orb) => {
      if (orb.isFallen) {
        // Fallen drop down
        const currentY = orb.particles.position.y;
        const targetY = -4; // Drop further down
        const newY = THREE.MathUtils.lerp(currentY, targetY, progress);

        orb.particles.position.y = newY;
        orb.core.position.y = newY;
        orb.glow.position.y = newY;
        orb.textLabel.position.y = newY + 1.5;
      }
    });
  }

  /**
   * Phase E: Morph to UI (0.9s)
   * Per GDD §9.2: Orbs morph into UI card/portrait frames
   * Orbs fade out as DOM elements fade in
   */
  updatePhaseE() {
    const phaseStart = this.phases.D_FALL_END;
    const phaseEnd = this.phases.E_MORPH_END;
    const phaseDuration = phaseEnd - phaseStart;
    const t = (this.elapsedTime - phaseStart) / phaseDuration;

    const progress = Math.min(t, 1);

    // Fade out orbs and text
    this.orbs.forEach((orb) => {
      orb.particles.material.opacity = 1 - progress;
      orb.core.material.opacity = 0.9 * (1 - progress);
      orb.glow.material.opacity = 0.3 * (1 - progress);
      orb.textLabel.material.opacity = 1 - progress;
    });

    // UI elements will fade in via CSS (triggered by main app)
  }

  /**
   * Complete the transition
   */
  complete() {
    this.isPlaying = false;

    // Clean up orbs and particles
    this.orbs.forEach((orb) => {
      this.scene.remove(orb.particles);
      this.scene.remove(orb.core);
      this.scene.remove(orb.glow);
      this.scene.remove(orb.textLabel);

      orb.particles.geometry.dispose();
      orb.particles.material.dispose();
      orb.core.geometry.dispose();
      orb.core.material.dispose();
      orb.glow.geometry.dispose();
      orb.glow.material.dispose();
      orb.textLabel.material.map.dispose();
      orb.textLabel.material.dispose();
    });
    this.orbs = [];

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
