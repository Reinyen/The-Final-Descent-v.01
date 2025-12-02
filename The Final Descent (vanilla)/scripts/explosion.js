import * as THREE from 'three';

/**
 * Explosion system that creates a massive particle explosion,
 * then implodes/spirals back to center, creates shockwave,
 * and triggers black hole formation.
 */
export class Explosion {
  constructor() {
    this.explosionParticles = null;
    this.explosionMaterial = null;
    this.shockwave = null;
    this.shockwaveMaterial = null;

    this.particles = [];
    this.particleCount = 1000;
    this.explosionCenter = new THREE.Vector3(0, -8, -70); // Comet impact point
    this.blackHoleCenter = new THREE.Vector3(0, 0, -50); // Black hole center

    // Animation states
    this.state = 'idle'; // 'idle', 'exploding', 'imploding', 'shockwave', 'complete'
    this.stateTime = 0;
    this.explosionDuration = 1.0; // 1 second explosion
    this.implosionDuration = 1.5; // 1.5 second implosion
    this.shockwaveDuration = 0.5; // 0.5 second shockwave

    this.init();
  }

  init() {
    this.createExplosionParticles();
    this.createShockwave();
  }

  createExplosionParticles() {
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.particleCount * 3);
    const velocities = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const alphas = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Start all particles at explosion center
      positions[i3] = this.explosionCenter.x;
      positions[i3 + 1] = this.explosionCenter.y;
      positions[i3 + 2] = this.explosionCenter.z;

      // Random velocity in all directions (sphere)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 20 + Math.random() * 30; // 20-50 units/sec

      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i3 + 2] = Math.cos(phi) * speed;

      // Purple or green colors
      const isGreen = Math.random() > 0.5;
      if (isGreen) {
        colors[i3] = 0.3;
        colors[i3 + 1] = 0.9;
        colors[i3 + 2] = 0.4;
      } else {
        colors[i3] = 0.6;
        colors[i3 + 1] = 0.2;
        colors[i3 + 2] = 0.8;
      }

      sizes[i] = 2 + Math.random() * 4;
      alphas[i] = 1.0;

      this.particles.push({
        velocity: new THREE.Vector3(velocities[i3], velocities[i3 + 1], velocities[i3 + 2]),
        baseVelocity: new THREE.Vector3(velocities[i3], velocities[i3 + 1], velocities[i3 + 2]),
        spiralPhase: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    this.explosionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 }
      },
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
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Soft particle edge
          float alpha = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.explosionParticles = new THREE.Points(geometry, this.explosionMaterial);
    this.explosionParticles.visible = false;
  }

  createShockwave() {
    const geometry = new THREE.RingGeometry(0.1, 1, 64);

    this.shockwaveMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        radius: { value: 0.0 },
        opacity: { value: 1.0 }
      },
      vertexShader: `
        uniform float radius;

        void main() {
          vec3 pos = position * radius;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float opacity;

        void main() {
          // Purple/green shockwave ring
          vec3 color1 = vec3(0.6, 0.2, 0.8); // Purple
          vec3 color2 = vec3(0.3, 0.9, 0.4); // Green
          vec3 color = mix(color1, color2, 0.5);

          gl_FragColor = vec4(color, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.shockwave = new THREE.Mesh(geometry, this.shockwaveMaterial);
    this.shockwave.visible = false;
    this.shockwave.position.copy(this.blackHoleCenter);
  }

  trigger() {
    if (this.state !== 'idle') return;

    this.state = 'exploding';
    this.stateTime = 0;
    this.explosionParticles.visible = true;

    console.log('[Explosion] Triggered - massive explosion starting');
  }

  update(deltaTime, elapsedTime) {
    if (this.state === 'idle') return;

    this.stateTime += deltaTime;

    // Update based on current state
    if (this.state === 'exploding') {
      this.updateExplosion(deltaTime);

      // Transition to implosion after explosion duration
      if (this.stateTime >= this.explosionDuration) {
        this.state = 'imploding';
        this.stateTime = 0;
        console.log('[Explosion] Transitioning to implosion phase');
      }
    } else if (this.state === 'imploding') {
      this.updateImplosion(deltaTime);

      // Transition to shockwave when particles converge
      if (this.stateTime >= this.implosionDuration) {
        this.state = 'shockwave';
        this.stateTime = 0;
        this.explosionParticles.visible = false;
        this.shockwave.visible = true;
        console.log('[Explosion] Particles converged - shockwave starting');
      }
    } else if (this.state === 'shockwave') {
      this.updateShockwave();

      // Transition to complete
      if (this.stateTime >= this.shockwaveDuration) {
        this.state = 'complete';
        this.shockwave.visible = false;
        console.log('[Explosion] Shockwave complete - black hole ready to emerge');
      }
    }
  }

  updateExplosion(deltaTime) {
    const positions = this.explosionParticles.geometry.attributes.position.array;
    const alphas = this.explosionParticles.geometry.attributes.alpha.array;

    const t = this.stateTime / this.explosionDuration;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      // Move particles outward with velocity
      positions[i3] += this.particles[i].velocity.x * deltaTime;
      positions[i3 + 1] += this.particles[i].velocity.y * deltaTime;
      positions[i3 + 2] += this.particles[i].velocity.z * deltaTime;

      // Keep full opacity during explosion
      alphas[i] = 1.0;
    }

    this.explosionParticles.geometry.attributes.position.needsUpdate = true;
    this.explosionParticles.geometry.attributes.alpha.needsUpdate = true;
  }

  updateImplosion(deltaTime) {
    const positions = this.explosionParticles.geometry.attributes.position.array;
    const sizes = this.explosionParticles.geometry.attributes.size.array;
    const alphas = this.explosionParticles.geometry.attributes.alpha.array;

    const t = this.stateTime / this.implosionDuration;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      const currentPos = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );

      // Vector toward black hole center
      const toCenter = new THREE.Vector3()
        .subVectors(this.blackHoleCenter, currentPos);
      const distanceToCenter = toCenter.length();

      // Normalize direction
      toCenter.normalize();

      // Acceleration toward center (gravity simulation)
      // Stronger as particles get closer
      const gravityStrength = 50 + (1.0 - distanceToCenter / 100) * 100;
      const acceleration = toCenter.multiplyScalar(gravityStrength * deltaTime);

      // Apply acceleration to velocity
      this.particles[i].velocity.add(acceleration);

      // Add spiral motion
      const spiralSpeed = 2.0;
      const spiralRadius = distanceToCenter * 0.3;
      this.particles[i].spiralPhase += spiralSpeed * deltaTime;

      const spiralX = Math.cos(this.particles[i].spiralPhase) * spiralRadius * deltaTime;
      const spiralY = Math.sin(this.particles[i].spiralPhase) * spiralRadius * deltaTime;

      // Update position with velocity and spiral
      positions[i3] += this.particles[i].velocity.x * deltaTime + spiralX;
      positions[i3 + 1] += this.particles[i].velocity.y * deltaTime + spiralY;
      positions[i3 + 2] += this.particles[i].velocity.z * deltaTime;

      // Shrink and fade as particles approach center
      const fadeStart = 0.3; // Start fading at 30% of implosion
      if (t > fadeStart) {
        const fadeFactor = (t - fadeStart) / (1.0 - fadeStart);
        sizes[i] = (2 + Math.random() * 4) * (1.0 - fadeFactor * 0.7);
        alphas[i] = 1.0 - fadeFactor * 0.5;
      }
    }

    this.explosionParticles.geometry.attributes.position.needsUpdate = true;
    this.explosionParticles.geometry.attributes.size.needsUpdate = true;
    this.explosionParticles.geometry.attributes.alpha.needsUpdate = true;
  }

  updateShockwave() {
    const t = this.stateTime / this.shockwaveDuration;

    // Expand shockwave ring rapidly
    const maxRadius = 80;
    this.shockwaveMaterial.uniforms.radius.value = t * maxRadius;

    // Fade out shockwave
    this.shockwaveMaterial.uniforms.opacity.value = 1.0 - t;
  }

  isComplete() {
    return this.state === 'complete';
  }

  getExplosionMesh() {
    return this.explosionParticles;
  }

  getShockwave() {
    return this.shockwave;
  }

  reset() {
    this.state = 'idle';
    this.stateTime = 0;
    this.explosionParticles.visible = false;
    this.shockwave.visible = false;

    // Reset particle positions
    const positions = this.explosionParticles.geometry.attributes.position.array;
    const alphas = this.explosionParticles.geometry.attributes.alpha.array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = this.explosionCenter.x;
      positions[i3 + 1] = this.explosionCenter.y;
      positions[i3 + 2] = this.explosionCenter.z;
      alphas[i] = 1.0;

      // Reset velocities
      this.particles[i].velocity.copy(this.particles[i].baseVelocity);
    }

    this.explosionParticles.geometry.attributes.position.needsUpdate = true;
    this.explosionParticles.geometry.attributes.alpha.needsUpdate = true;
  }

  destroy() {
    if (this.explosionParticles) {
      this.explosionParticles.geometry.dispose();
      this.explosionMaterial.dispose();
    }
    if (this.shockwave) {
      this.shockwave.geometry.dispose();
      this.shockwaveMaterial.dispose();
    }
  }
}
