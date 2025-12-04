import * as THREE from 'three';

export class StarPhysics {
  constructor(starfield, blackHole, scene) {
    this.starfield = starfield;
    this.starGeometry = starfield.getGeometry();
    this.blackHole = blackHole;
    this.blackHolePosition = blackHole.getPosition();
    this.starCount = this.starGeometry.attributes.position.count;

    this.bounds = starfield.getBounds();

    this.pulledStars = [];
    this.activeRipples = [];
    this.pullFlags = new Array(this.starCount).fill(false);
    this.waveIdForStar = new Int32Array(this.starCount).fill(-1);

    this.ambientVelocities = new Float32Array(this.starCount * 3);

    this.selectionRadius = 60;
    this.waveActive = false;
    this.activeWaveRemaining = 0;
    this.nextWaveTime = null;
    this.currentWaveId = 0;
    this.waveDelayRange = { min: 5, max: 13 };
    this.waveCountRange = { min: 5, max: 14 };
    this.blackHoleRadius = 10.5;
    this.ambientMotionScale = 0.25;

    // Impact burst particles
    this.scene = scene;
    this.impactParticleCount = 400;
    this.impactGeometry = null;
    this.impactMaterial = null;
    this.impactParticles = null;
    this.impactData = [];
    this.nextImpactIndex = 0;

    // Scratch vectors to avoid allocations
    this.scratchVec3A = new THREE.Vector3();
    this.scratchVec3B = new THREE.Vector3();

    this.initImpactSystem();
  }

  initImpactSystem() {
    this.impactGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.impactParticleCount * 3);
    const colors = new Float32Array(this.impactParticleCount * 3);
    const sizes = new Float32Array(this.impactParticleCount);
    const alphas = new Float32Array(this.impactParticleCount);

    this.impactGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.impactGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.impactGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.impactGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    this.impactMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;
          vAlpha = alpha;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float viewDistance = max(0.0001, -mvPosition.z);
          gl_PointSize = size * (250.0 / viewDistance);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float falloff = (1.0 - dist * 2.0);
          gl_FragColor = vec4(vColor, vAlpha * falloff * falloff);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.impactParticles = new THREE.Points(this.impactGeometry, this.impactMaterial);
    this.impactParticles.visible = true;

    for (let i = 0; i < this.impactParticleCount; i++) {
      this.impactData.push({
        velocity: new THREE.Vector3(),
        lifetime: 0,
        age: Infinity,
        active: false
      });
      sizes[i] = 0;
      alphas[i] = 0;
    }

    if (this.scene) {
      this.scene.add(this.impactParticles);
    }
  }

  getImpactParticles() {
    return this.impactParticles;
  }

  scheduleNextWave(elapsedTime) {
    const delay = this.waveDelayRange.min + Math.random() * (this.waveDelayRange.max - this.waveDelayRange.min);
    this.nextWaveTime = elapsedTime + delay;
  }

  startWave(elapsedTime) {
    const positions = this.starGeometry.attributes.position.array;
    const basePositions = this.starGeometry.attributes.basePosition.array;
    const candidates = [];

    for (let i = 0; i < this.starCount; i++) {
      if (this.pullFlags[i]) continue;

      const i3 = i * 3;
      this.scratchVec3A.set(basePositions[i3], basePositions[i3 + 1], basePositions[i3 + 2]);
      const distance = this.scratchVec3A.distanceTo(this.blackHolePosition);

      if (distance < this.selectionRadius * 1.6) {
        candidates.push(i);
      }
    }

    // If not enough nearby candidates, allow more distant ones
    if (candidates.length < this.waveCountRange.min) {
      for (let i = 0; i < this.starCount; i++) {
        if (this.pullFlags[i]) continue;
        if (!candidates.includes(i)) {
          candidates.push(i);
        }
      }
    }

    const waveCount = Math.min(
      candidates.length,
      Math.floor(this.waveCountRange.min + Math.random() * (this.waveCountRange.max - this.waveCountRange.min + 1))
    );

    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, waveCount);

    if (selected.length === 0) {
      this.scheduleNextWave(elapsedTime);
      return;
    }

    this.currentWaveId += 1;
    this.activeWaveRemaining = selected.length;
    this.waveActive = true;
    this.nextWaveTime = null;

    for (const index of selected) {
      const i3 = index * 3;
      this.pulledStars.push({
        index,
        pullStartTime: elapsedTime,
        velocity: new THREE.Vector3(),
        hasImpacted: false,
        respawnTime: null,
        waveId: this.currentWaveId
      });
      this.pullFlags[index] = true;
      this.waveIdForStar[index] = this.currentWaveId;

      // Nudge starting point toward base position to ensure we pull from original coordinates
      positions[i3] = basePositions[i3];
      positions[i3 + 1] = basePositions[i3 + 1];
      positions[i3 + 2] = basePositions[i3 + 2];
    }

    this.starGeometry.attributes.position.needsUpdate = true;
  }

  selectStarsForPulling(phase, elapsedTime) {
    const phaseActive = phase.name === 'crater_settle' || phase.name === 'button_reveal' || phase.name === 'complete';

    if (!phaseActive) {
      this.waveActive = false;
      this.nextWaveTime = null;
      return;
    }

    if (!this.waveActive && this.nextWaveTime === null) {
      this.scheduleNextWave(elapsedTime);
    }

    if (!this.waveActive && this.nextWaveTime !== null && elapsedTime >= this.nextWaveTime) {
      this.startWave(elapsedTime);
    }
  }

  updateStarPulling(phase, elapsedTime, deltaTime) {
    if (this.pulledStars.length === 0) return;

    const positions = this.starGeometry.attributes.position.array;
    const absorptionScales = this.starGeometry.attributes.absorptionScale.array;

    let needsUpdate = false;

    for (const star of this.pulledStars) {
      if (star.hasImpacted) {
        if (star.respawnTime !== null && elapsedTime >= star.respawnTime) {
          this.respawnParticle(star.index);
          star.markedForRemoval = true;
        }
        continue;
      }

      const i3 = star.index * 3;

      // Current position
      this.scratchVec3A.set(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );

      // Direction to black hole
      this.scratchVec3B.copy(this.blackHolePosition).sub(this.scratchVec3A);
      const distance = this.scratchVec3B.length();

      // Accelerate toward black hole with stronger pull as they get closer
      const acceleration = 22.0 / Math.max(distance, 1.0);
      this.scratchVec3B.normalize().multiplyScalar(acceleration * deltaTime);
      star.velocity.add(this.scratchVec3B);

      // Apply velocity
      this.scratchVec3A.add(star.velocity.clone().multiplyScalar(deltaTime));

      // Update position
      positions[i3] = this.scratchVec3A.x;
      positions[i3 + 1] = this.scratchVec3A.y;
      positions[i3 + 2] = this.scratchVec3A.z;

      // Shrink as it approaches
      const distanceRatio = distance / this.selectionRadius;
      absorptionScales[star.index] = Math.max(0.1, distanceRatio);

      // Check for impact (outer edge of event horizon)
      const horizonScale = this.blackHole ? this.blackHole.getGroup().scale.x : 1.0;
      const impactRadius = Math.max(1.5, this.blackHoleRadius * horizonScale);

      if (distance < impactRadius) {
        star.hasImpacted = true;
        absorptionScales[star.index] = 0;
        star.respawnTime = elapsedTime + 0.5 + Math.random() * 0.75;

        this.waveIdForStar[star.index] = -1;

        // Create ripple
        this.createRipple(this.scratchVec3A.clone(), elapsedTime);

        // Small fiery burst on contact
        this.spawnImpactBurst(this.scratchVec3A.clone());

        if (this.waveActive && star.waveId === this.currentWaveId) {
          this.activeWaveRemaining -= 1;
          if (this.activeWaveRemaining <= 0) {
            this.waveActive = false;
            this.scheduleNextWave(elapsedTime);
          }
        }
      }

      needsUpdate = true;
    }

    if (needsUpdate) {
      this.starGeometry.attributes.position.needsUpdate = true;
      this.starGeometry.attributes.absorptionScale.needsUpdate = true;
    }

    // Remove respawned particles from pull list
    this.pulledStars = this.pulledStars.filter(star => {
      if (star.markedForRemoval) {
        this.pullFlags[star.index] = false;
        return false;
      }
      return true;
    });
  }

  respawnParticle(index) {
    this.starfield.regenerateParticle(index);
    this.ambientVelocities[index * 3] = 0;
    this.ambientVelocities[index * 3 + 1] = 0;
    this.ambientVelocities[index * 3 + 2] = 0;
    this.waveIdForStar[index] = -1;
  }

  createRipple(position, currentTime) {
    const duration = 0.3 + Math.random() * 0.5; // 0.3-0.8s
    const maxRadius = 15 + Math.random() * 10; // 15-25 units

    this.activeRipples.push({
      position: position,
      startTime: currentTime,
      duration: duration,
      maxRadius: maxRadius
    });
  }

  spawnImpactBurst(position) {
    if (!this.impactGeometry) return;

    const positions = this.impactGeometry.attributes.position.array;
    const colors = this.impactGeometry.attributes.color.array;
    const sizes = this.impactGeometry.attributes.size.array;
    const alphas = this.impactGeometry.attributes.alpha.array;

    const particlesPerBurst = 20 + Math.floor(Math.random() * 10);

    for (let i = 0; i < particlesPerBurst; i++) {
      const idx = this.nextImpactIndex;
      const i3 = idx * 3;

      this.nextImpactIndex = (this.nextImpactIndex + 1) % this.impactParticleCount;

      positions[i3] = position.x;
      positions[i3 + 1] = position.y;
      positions[i3 + 2] = position.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 8 + Math.random() * 12;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      const paletteRoll = Math.random();
      let color;
      if (paletteRoll < 0.4) {
        color = new THREE.Color(1.0, 0.7, 0.4);
      } else if (paletteRoll < 0.75) {
        color = new THREE.Color(0.9, 0.5, 0.9);
      } else {
        color = new THREE.Color(0.55, 0.85, 1.0);
      }

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[idx] = 3.0 + Math.random() * 6.0;
      alphas[idx] = 1.0;

      this.impactData[idx] = {
        velocity,
        lifetime: 0.35 + Math.random() * 0.4,
        age: 0,
        active: true
      };
    }

    this.impactGeometry.attributes.position.needsUpdate = true;
    this.impactGeometry.attributes.color.needsUpdate = true;
    this.impactGeometry.attributes.size.needsUpdate = true;
    this.impactGeometry.attributes.alpha.needsUpdate = true;
  }

  updateRippleEffects(elapsedTime) {
    const colors = this.starGeometry.attributes.color.array;
    const baseColors = this.starGeometry.attributes.baseColor.array;
    const rippleOffsets = this.starGeometry.attributes.rippleOffset.array;

    // Prune expired ripples
    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
      const r = this.activeRipples[i];
      if (elapsedTime - r.startTime > r.duration) {
        this.activeRipples.splice(i, 1);
      }
    }

    let colorChanged = false;
    let offsetChanged = false;

    // No ripples: restore base state
    if (this.activeRipples.length === 0) {
      for (let i = 0; i < this.starCount; i++) {
        const i3 = i * 3;

        // Clear offset
        if (rippleOffsets[i3] !== 0 || rippleOffsets[i3 + 1] !== 0 || rippleOffsets[i3 + 2] !== 0) {
          rippleOffsets[i3] = 0;
          rippleOffsets[i3 + 1] = 0;
          rippleOffsets[i3 + 2] = 0;
          offsetChanged = true;
        }

        // Restore base color
        if (colors[i3] !== baseColors[i3] || colors[i3 + 1] !== baseColors[i3 + 1] || colors[i3 + 2] !== baseColors[i3 + 2]) {
          colors[i3] = baseColors[i3];
          colors[i3 + 1] = baseColors[i3 + 1];
          colors[i3 + 2] = baseColors[i3 + 2];
          colorChanged = true;
        }
      }

      if (offsetChanged) this.starGeometry.attributes.rippleOffset.needsUpdate = true;
      if (colorChanged) this.starGeometry.attributes.color.needsUpdate = true;
      return;
    }

    // Apply ripple effects
    const positions = this.starGeometry.attributes.position.array;

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;

      const px = positions[i3];
      const py = positions[i3 + 1];
      const pz = positions[i3 + 2];

      let totalGlow = 0.0;
      let totalDX = 0.0, totalDY = 0.0, totalDZ = 0.0;

      this.scratchVec3A.set(px, py, pz);

      for (const ripple of this.activeRipples) {
        const age = elapsedTime - ripple.startTime;
        const progress = age / ripple.duration;
        if (progress < 0 || progress > 1) continue;

        const currentRadius = progress * ripple.maxRadius;
        const distance = this.scratchVec3A.distanceTo(ripple.position);

        const ringThickness = ripple.maxRadius * 0.15;
        const distanceToRing = Math.abs(distance - currentRadius);

        if (distanceToRing < ringThickness) {
          const ringIntensity = 1.0 - (distanceToRing / ringThickness);
          const glowFalloff = 1.0 - progress;

          totalGlow += ringIntensity * glowFalloff * 0.8;

          const distortionStrength = ringIntensity * glowFalloff * 0.5 * Math.sin(progress * Math.PI * 2.0);

          const dx = px - ripple.position.x;
          const dy = py - ripple.position.y;
          const dz = pz - ripple.position.z;

          const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (len > 0.0001) {
            const invLen = 1.0 / len;
            totalDX += dx * invLen * distortionStrength;
            totalDY += dy * invLen * distortionStrength;
            totalDZ += dz * invLen * distortionStrength;
          }
        }
      }

      // Apply glow
      if (totalGlow > 0.01) {
        const nr = Math.min(1.0, baseColors[i3] + totalGlow * 0.8);
        const ng = Math.min(1.0, baseColors[i3 + 1] + totalGlow * 0.6);
        const nb = Math.min(1.0, baseColors[i3 + 2] + totalGlow * 0.2);

        if (colors[i3] !== nr || colors[i3 + 1] !== ng || colors[i3 + 2] !== nb) {
          colors[i3] = nr;
          colors[i3 + 1] = ng;
          colors[i3 + 2] = nb;
          colorChanged = true;
        }
      } else {
        if (colors[i3] !== baseColors[i3] || colors[i3 + 1] !== baseColors[i3 + 1] || colors[i3 + 2] !== baseColors[i3 + 2]) {
          colors[i3] = baseColors[i3];
          colors[i3 + 1] = baseColors[i3 + 1];
          colors[i3 + 2] = baseColors[i3 + 2];
          colorChanged = true;
        }
      }

      // Apply offset
      const mag = Math.sqrt(totalDX * totalDX + totalDY * totalDY + totalDZ * totalDZ);
      const ox = mag > 0.001 ? totalDX : 0.0;
      const oy = mag > 0.001 ? totalDY : 0.0;
      const oz = mag > 0.001 ? totalDZ : 0.0;

      if (rippleOffsets[i3] !== ox || rippleOffsets[i3 + 1] !== oy || rippleOffsets[i3 + 2] !== oz) {
        rippleOffsets[i3] = ox;
        rippleOffsets[i3 + 1] = oy;
        rippleOffsets[i3 + 2] = oz;
        offsetChanged = true;
      }
    }

    if (offsetChanged) this.starGeometry.attributes.rippleOffset.needsUpdate = true;
    if (colorChanged) this.starGeometry.attributes.color.needsUpdate = true;
  }

  updateImpactBursts(deltaTime) {
    if (!this.impactGeometry) return;

    const positions = this.impactGeometry.attributes.position.array;
    const colors = this.impactGeometry.attributes.color.array;
    const sizes = this.impactGeometry.attributes.size.array;
    const alphas = this.impactGeometry.attributes.alpha.array;

    let needsUpdate = false;

    for (let i = 0; i < this.impactParticleCount; i++) {
      const data = this.impactData[i];
      if (!data.active) continue;

      data.age += deltaTime;
      const lifeT = data.age / data.lifetime;

      if (lifeT >= 1.0) {
        data.active = false;
        sizes[i] = 0;
        alphas[i] = 0;
        continue;
      }

      const i3 = i * 3;

      positions[i3] += data.velocity.x * deltaTime;
      positions[i3 + 1] += data.velocity.y * deltaTime;
      positions[i3 + 2] += data.velocity.z * deltaTime;

      data.velocity.multiplyScalar(0.9);

      const fade = 1.0 - lifeT;
      alphas[i] = fade;
      sizes[i] = sizes[i] * 0.98 + 0.15;

      // Cool the colors over time for dustier edges
      colors[i3] *= 0.98;
      colors[i3 + 1] *= 0.98;
      colors[i3 + 2] = Math.max(0, colors[i3 + 2] * 0.99 + 0.01 * fade);

      needsUpdate = true;
    }

    if (needsUpdate) {
      this.impactGeometry.attributes.position.needsUpdate = true;
      this.impactGeometry.attributes.alpha.needsUpdate = true;
      this.impactGeometry.attributes.size.needsUpdate = true;
      this.impactGeometry.attributes.color.needsUpdate = true;
    }
  }

  applyAmbientFlow(elapsedTime, deltaTime) {
    const positions = this.starGeometry.attributes.position.array;
    const isDust = this.starGeometry.attributes.isDust.array;
    let changed = false;

    for (let i = 0; i < this.starCount; i++) {
      if (this.pullFlags[i]) continue;

      const i3 = i * 3;

      this.scratchVec3A.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      this.scratchVec3B.copy(this.blackHolePosition).sub(this.scratchVec3A);
      const distance = this.scratchVec3B.length();

      const gravity = ((isDust[i] ? 18.0 : 12.0) * this.ambientMotionScale) / Math.max(distance, 35.0);
      const swirl = (0.8 + Math.sin(elapsedTime * 0.35 + i * 0.15) * 0.4) * this.ambientMotionScale;

      if (distance > 0.001) {
        this.scratchVec3B.normalize().multiplyScalar(gravity * deltaTime);

        // Add perpendicular swirl for slow orbiting motion
        this.scratchVec3A.set(-this.scratchVec3B.y, this.scratchVec3B.x, 0).normalize().multiplyScalar(swirl * 0.4 * deltaTime);
        this.scratchVec3B.add(this.scratchVec3A);

        this.ambientVelocities[i3] = (this.ambientVelocities[i3] + this.scratchVec3B.x) * 0.985;
        this.ambientVelocities[i3 + 1] = (this.ambientVelocities[i3 + 1] + this.scratchVec3B.y) * 0.985;
        this.ambientVelocities[i3 + 2] = (this.ambientVelocities[i3 + 2] + this.scratchVec3B.z) * 0.985;
      }

      positions[i3] += (this.ambientVelocities[i3] + Math.sin(elapsedTime * 0.2 + i * 0.1) * 0.12) * this.ambientMotionScale;
      positions[i3 + 1] += (this.ambientVelocities[i3 + 1] + Math.cos(elapsedTime * 0.27 + i * 0.07) * 0.1) * this.ambientMotionScale;
      positions[i3 + 2] += this.ambientVelocities[i3 + 2] * this.ambientMotionScale;

      const outOfBounds =
        Math.abs(positions[i3]) > this.bounds.x ||
        Math.abs(positions[i3 + 1]) > this.bounds.y ||
        positions[i3 + 2] < this.bounds.zFar ||
        positions[i3 + 2] > this.bounds.zNear;

      if (outOfBounds) {
        this.respawnParticle(i);
        continue;
      }

      changed = true;
    }

    if (changed) {
      this.starGeometry.attributes.position.needsUpdate = true;
    }
  }

  update(phase, elapsedTime, deltaTime) {
    // Select stars for pulling
    this.selectStarsForPulling(phase, elapsedTime);

    // Update star pulling physics
    this.updateStarPulling(phase, elapsedTime, deltaTime);

    // Update ripple effects
    this.updateRippleEffects(elapsedTime);

    // Update small impact bursts
    this.updateImpactBursts(deltaTime);

    // Apply slow ambient gravity swirl to keep space lively
    this.applyAmbientFlow(elapsedTime, deltaTime);
  }

  getPulledStarCount() {
    return this.pulledStars.length;
  }
}
