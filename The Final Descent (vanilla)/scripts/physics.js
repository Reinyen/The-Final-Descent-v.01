import * as THREE from 'three';

export class StarPhysics {
  constructor(starGeometry, blackHolePosition) {
    this.starGeometry = starGeometry;
    this.blackHolePosition = blackHolePosition;
    this.starCount = starGeometry.attributes.position.count;

    this.pulledStars = [];
    this.activeRipples = [];

    this.lastPullTime = -10;
    this.selectionRadius = 60;

    // Scratch vectors to avoid allocations
    this.scratchVec3A = new THREE.Vector3();
    this.scratchVec3B = new THREE.Vector3();
  }

  selectStarsForPulling(phase, elapsedTime) {
    // Initial batch: select ~8% of stars within radius
    if (phase.name === 'crater_settle' && this.pulledStars.length === 0) {
      const positions = this.starGeometry.attributes.position.array;
      const basePositions = this.starGeometry.attributes.basePosition.array;

      let candidateIndices = [];

      // Find all stars within selection radius
      for (let i = 0; i < this.starCount; i++) {
        const i3 = i * 3;
        this.scratchVec3A.set(
          basePositions[i3],
          basePositions[i3 + 1],
          basePositions[i3 + 2]
        );

        const distance = this.scratchVec3A.distanceTo(this.blackHolePosition);

        if (distance < this.selectionRadius) {
          candidateIndices.push(i);
        }
      }

      // Randomly select ~8% of candidates
      const targetCount = Math.floor(candidateIndices.length * 0.08);
      const shuffled = candidateIndices.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, targetCount);

      // Add to pulled stars
      for (const index of selected) {
        const i3 = index * 3;
        this.pulledStars.push({
          index,
          pullStartTime: elapsedTime,
          velocity: new THREE.Vector3(),
          hasImpacted: false
        });
      }

      console.log(`[Physics] Selected ${selected.length} stars for pulling (from ${candidateIndices.length} candidates)`);
    }

    // Periodic batch additions (every 2-5 seconds)
    if ((phase.name === 'crater_settle' || phase.name === 'button_reveal' || phase.name === 'complete') &&
        elapsedTime - this.lastPullTime >= 2.0 + Math.random() * 3.0) {

      // Add 1-3 more stars
      const positions = this.starGeometry.attributes.position.array;
      const basePositions = this.starGeometry.attributes.basePosition.array;

      const alreadyPulled = new Set(this.pulledStars.map(s => s.index));
      let candidates = [];

      for (let i = 0; i < this.starCount; i++) {
        if (alreadyPulled.has(i)) continue;

        const i3 = i * 3;
        this.scratchVec3A.set(
          basePositions[i3],
          basePositions[i3 + 1],
          basePositions[i3 + 2]
        );

        const distance = this.scratchVec3A.distanceTo(this.blackHolePosition);
        if (distance < this.selectionRadius) {
          candidates.push(i);
        }
      }

      if (candidates.length > 0) {
        const addCount = Math.min(3, candidates.length);
        const shuffled = candidates.sort(() => Math.random() - 0.5);

        for (let j = 0; j < addCount; j++) {
          const index = shuffled[j];
          this.pulledStars.push({
            index,
            pullStartTime: elapsedTime,
            velocity: new THREE.Vector3(),
            hasImpacted: false
          });
        }
      }

      this.lastPullTime = elapsedTime;
    }
  }

  updateStarPulling(phase, elapsedTime, deltaTime) {
    if (this.pulledStars.length === 0) return;

    const positions = this.starGeometry.attributes.position.array;
    const absorptionScales = this.starGeometry.attributes.absorptionScale.array;

    let needsUpdate = false;

    for (const star of this.pulledStars) {
      if (star.hasImpacted) continue;

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

      // Accelerate toward black hole
      const acceleration = 20.0 / Math.max(distance, 1.0);
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

      // Check for impact (within 2 units of black hole)
      if (distance < 2.0) {
        star.hasImpacted = true;
        absorptionScales[star.index] = 0;

        // Create ripple
        this.createRipple(this.scratchVec3A.clone(), elapsedTime);
      }

      needsUpdate = true;
    }

    if (needsUpdate) {
      this.starGeometry.attributes.position.needsUpdate = true;
      this.starGeometry.attributes.absorptionScale.needsUpdate = true;
    }
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

  update(phase, elapsedTime, deltaTime) {
    // Select stars for pulling
    this.selectStarsForPulling(phase, elapsedTime);

    // Update star pulling physics
    this.updateStarPulling(phase, elapsedTime, deltaTime);

    // Update ripple effects
    this.updateRippleEffects(elapsedTime);
  }

  getPulledStarCount() {
    return this.pulledStars.length;
  }
}
