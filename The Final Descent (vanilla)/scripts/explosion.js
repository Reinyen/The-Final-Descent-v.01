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
    this.impactFlash = null;
    this.impactFlashMaterial = null;
    this.ejectaParticles = null;
    this.ejectaMaterial = null;
    this.fireballParticles = null;
    this.fireballMaterial = null;

    this.particles = [];
    this.ejecta = [];
    this.fireballParticleData = [];
    this.particleCount = 2000; // Increased for more detail
    this.ejectaCount = 500;
    this.fireballCount = 300;
    this.explosionCenter = new THREE.Vector3(0, -8, -70); // Comet impact point
    this.blackHoleCenter = new THREE.Vector3(0, 0, -50); // Black hole center

    // Animation states
    this.state = 'idle'; // 'idle', 'flash', 'exploding', 'imploding', 'shockwave', 'complete'
    this.stateTime = 0;
    this.flashDuration = 0.1; // 0.1 second bright flash
    this.explosionDuration = 1.2; // 1.2 second explosion
    this.implosionDuration = 1.5; // 1.5 second implosion
    this.shockwaveDuration = 0.5; // 0.5 second shockwave

    this.init();
  }

  init() {
    this.createImpactFlash();
    this.createExplosionParticles();
    this.createEjectaParticles();
    this.createFireballParticles();
    this.createShockwave();
  }

  createImpactFlash() {
    // Bright flash at impact point
    const geometry = new THREE.SphereGeometry(5, 32, 32);

    this.impactFlashMaterial = new THREE.ShaderMaterial({
      uniforms: {
        intensity: { value: 0.0 }
      },
      vertexShader: `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float intensity;

        void main() {
          // White-hot flash
          vec3 color = vec3(1.0, 1.0, 1.0);
          gl_FragColor = vec4(color, intensity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.impactFlash = new THREE.Mesh(geometry, this.impactFlashMaterial);
    this.impactFlash.position.copy(this.explosionCenter);
    this.impactFlash.visible = false;
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

      // Random velocity in all directions (sphere) with bias upward
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 25 + Math.random() * 45; // 25-70 units/sec (faster!)

      let vx = Math.sin(phi) * Math.cos(theta) * speed;
      let vy = Math.sin(phi) * Math.sin(theta) * speed;
      let vz = Math.cos(phi) * speed;

      // Add upward bias for hemisphere explosion
      velocities[i3] = vx;
      velocities[i3 + 1] = Math.abs(vy) * 0.8 + vy * 0.2; // Bias upward
      velocities[i3 + 2] = vz;

      // More varied colors - cool cosmic flames and dusty chunks
      const colorType = Math.random();
      const dusty = Math.random() < 0.25;
      if (dusty) {
        // Ash and debris with faint violet sparks
        const tone = 0.2 + Math.random() * 0.2;
        colors[i3] = tone + 0.05;
        colors[i3 + 1] = tone;
        colors[i3 + 2] = tone + 0.08;
        const velocityScale = 0.35;
        velocities[i3] *= velocityScale;
        velocities[i3 + 1] *= velocityScale;
        velocities[i3 + 2] *= velocityScale;
      } else if (colorType < 0.33) {
        // Electric blue-white core
        colors[i3] = 0.85 + Math.random() * 0.15;
        colors[i3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i3 + 2] = 1.0;
      } else if (colorType < 0.66) {
        // Teal flames
        colors[i3] = 0.35 + Math.random() * 0.25;
        colors[i3 + 1] = 0.8 + Math.random() * 0.15;
        colors[i3 + 2] = 0.9 + Math.random() * 0.08;
      } else {
        // Deep violet heat
        colors[i3] = 0.7 + Math.random() * 0.15;
        colors[i3 + 1] = 0.4 + Math.random() * 0.2;
        colors[i3 + 2] = 0.9 + Math.random() * 0.1;
      }

      sizes[i] = dusty ? 3 + Math.random() * 5 : 2 + Math.random() * 6;
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

  createEjectaParticles() {
    // Ejecta are large debris chunks thrown upward/outward from impact
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.ejectaCount * 3);
    const velocities = new Float32Array(this.ejectaCount * 3);
    const angularVelocities = new Float32Array(this.ejectaCount * 3);
    const sizes = new Float32Array(this.ejectaCount);
    const alphas = new Float32Array(this.ejectaCount);

    for (let i = 0; i < this.ejectaCount; i++) {
      const i3 = i * 3;

      // Start at impact point
      positions[i3] = this.explosionCenter.x;
      positions[i3 + 1] = this.explosionCenter.y;
      positions[i3 + 2] = this.explosionCenter.z;

      // Ejecta goes mostly upward and outward
      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.4 + Math.PI * 0.1; // 10-50 degrees
      const speed = 15 + Math.random() * 25; // 15-40 units/sec

      velocities[i3] = Math.cos(angle) * Math.sin(elevation) * speed;
      velocities[i3 + 1] = Math.cos(elevation) * speed;
      velocities[i3 + 2] = Math.sin(angle) * Math.sin(elevation) * speed;

      // Angular velocity for rotation
      angularVelocities[i3] = (Math.random() - 0.5) * 10;
      angularVelocities[i3 + 1] = (Math.random() - 0.5) * 10;
      angularVelocities[i3 + 2] = (Math.random() - 0.5) * 10;

      sizes[i] = 3 + Math.random() * 8; // Larger chunks
      alphas[i] = 1.0;

      this.ejecta.push({
        velocity: new THREE.Vector3(velocities[i3], velocities[i3 + 1], velocities[i3 + 2]),
        angularVelocity: new THREE.Vector3(angularVelocities[i3], angularVelocities[i3 + 1], angularVelocities[i3 + 2]),
        rotation: new THREE.Vector3(0, 0, 0)
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    this.ejectaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;

        varying float vAlpha;

        void main() {
          vAlpha = alpha;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Rocky debris color with cool glow
          vec3 baseDust = vec3(0.3, 0.32, 0.36);
          vec3 coolEmber = vec3(0.4, 0.7, 0.8);
          vec3 color = baseDust + coolEmber * (1.0 - dist) * 0.7;
          float alpha = (1.0 - dist * 2.0) * vAlpha * 0.8;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.ejectaParticles = new THREE.Points(geometry, this.ejectaMaterial);
    this.ejectaParticles.visible = false;
  }

  createFireballParticles() {
    // Fireball is a roiling sphere of hot gas
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.fireballCount * 3);
    const sizes = new Float32Array(this.fireballCount);
    const alphas = new Float32Array(this.fireballCount);
    const colors = new Float32Array(this.fireballCount * 3);

    for (let i = 0; i < this.fireballCount; i++) {
      const i3 = i * 3;

      // Random position within sphere around impact point
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = Math.random() * 10;

      positions[i3] = this.explosionCenter.x + Math.sin(phi) * Math.cos(theta) * radius;
      positions[i3 + 1] = this.explosionCenter.y + Math.sin(phi) * Math.sin(theta) * radius;
      positions[i3 + 2] = this.explosionCenter.z + Math.cos(phi) * radius;

      // Cool fire colors
      const temp = Math.random();
      if (temp < 0.4) {
        colors[i3] = 0.8 + Math.random() * 0.2;
        colors[i3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i3 + 2] = 1.0;
      } else if (temp < 0.75) {
        colors[i3] = 0.45 + Math.random() * 0.25;
        colors[i3 + 1] = 0.75 + Math.random() * 0.2;
        colors[i3 + 2] = 0.95 + Math.random() * 0.05;
      } else {
        colors[i3] = 0.7 + Math.random() * 0.2;
        colors[i3 + 1] = 0.45 + Math.random() * 0.3;
        colors[i3 + 2] = 0.9 + Math.random() * 0.1;
      }

      sizes[i] = 5 + Math.random() * 10;
      alphas[i] = 0.7 + Math.random() * 0.3;

      this.fireballParticleData.push({
        basePosition: new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]),
        offset: new THREE.Vector3(0, 0, 0),
        phase: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    this.fireballMaterial = new THREE.ShaderMaterial({
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

          // Soft glow
          float alpha = (1.0 - dist * 2.0) * (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.fireballParticles = new THREE.Points(geometry, this.fireballMaterial);
    this.fireballParticles.visible = false;
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
          // Purple/teal shockwave ring
          vec3 color1 = vec3(0.6, 0.25, 0.85); // Purple
          vec3 color2 = vec3(0.2, 0.8, 0.9); // Teal
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

    this.state = 'flash';
    this.stateTime = 0;
    this.impactFlash.visible = true;
    this.fireballParticles.visible = true;

    console.log('[Explosion] Triggered - impact flash starting');
  }

  update(deltaTime, elapsedTime) {
    if (this.state === 'idle') return;

    this.stateTime += deltaTime;

    // Update based on current state
    if (this.state === 'flash') {
      this.updateFlash(deltaTime);

      // Transition to explosion after flash
      if (this.stateTime >= this.flashDuration) {
        this.state = 'exploding';
        this.stateTime = 0;
        this.impactFlash.visible = false;
        this.explosionParticles.visible = true;
        this.ejectaParticles.visible = true;
        console.log('[Explosion] Flash complete - explosion starting');
      }
    } else if (this.state === 'exploding') {
      this.updateExplosion(deltaTime);
      this.updateFireball(deltaTime, elapsedTime);
      this.updateEjecta(deltaTime);

      // Transition to implosion after explosion duration
      if (this.stateTime >= this.explosionDuration) {
        this.state = 'imploding';
        this.stateTime = 0;
        this.ejectaParticles.visible = false;
        this.fireballParticles.visible = false;
        this.prepareImplosion();
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

  updateFlash(deltaTime) {
    const t = this.stateTime / this.flashDuration;

    // Quick flash and fade
    if (t < 0.3) {
      // Rapid rise
      this.impactFlashMaterial.uniforms.intensity.value = t / 0.3;
    } else {
      // Fade out
      this.impactFlashMaterial.uniforms.intensity.value = 1.0 - ((t - 0.3) / 0.7);
    }

    // Expand flash
    const scale = 1.0 + t * 4.0;
    this.impactFlash.scale.setScalar(scale);

    // Fireball initial expansion
    this.updateFireball(deltaTime, this.stateTime);
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

  prepareImplosion() {
    const positions = this.explosionParticles.geometry.attributes.position.array;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const currentPos = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );

      const toCenter = new THREE.Vector3().subVectors(this.blackHoleCenter, currentPos);
      toCenter.normalize();

      const baseSpeed = 35 + Math.random() * 45;
      const spiralInfluence = 10 + Math.random() * 18;
      const spiral = new THREE.Vector3(-toCenter.y, toCenter.x, (Math.random() - 0.5) * 0.6).normalize();

      const newVelocity = toCenter.multiplyScalar(baseSpeed).add(spiral.multiplyScalar(spiralInfluence));
      this.particles[i].velocity.copy(newVelocity);
      this.particles[i].spiralPhase = Math.random() * Math.PI * 2;
    }
  }

  updateFireball(deltaTime, time) {
    const positions = this.fireballParticles.geometry.attributes.position.array;
    const alphas = this.fireballParticles.geometry.attributes.alpha.array;

    const t = this.stateTime / this.explosionDuration;

    for (let i = 0; i < this.fireballCount; i++) {
      const i3 = i * 3;

      // Roiling turbulent motion
      this.fireballParticleData[i].phase += deltaTime * 2;
      const turbulence = Math.sin(this.fireballParticleData[i].phase) * 2;

      const offset = new THREE.Vector3(
        Math.cos(time * 3 + i) * turbulence,
        Math.sin(time * 2 + i) * turbulence,
        Math.cos(time * 2.5 + i) * turbulence
      );

      // Expand and rise
      const expansion = t * 15;
      const rise = t * 10;

      positions[i3] = this.fireballParticleData[i].basePosition.x + offset.x + (Math.random() - 0.5) * expansion;
      positions[i3 + 1] = this.fireballParticleData[i].basePosition.y + offset.y + rise;
      positions[i3 + 2] = this.fireballParticleData[i].basePosition.z + offset.z + (Math.random() - 0.5) * expansion;

      // Fade out over time
      alphas[i] = (0.7 + Math.random() * 0.3) * (1.0 - t * 0.7);
    }

    this.fireballParticles.geometry.attributes.position.needsUpdate = true;
    this.fireballParticles.geometry.attributes.alpha.needsUpdate = true;
  }

  updateEjecta(deltaTime) {
    const positions = this.ejectaParticles.geometry.attributes.position.array;
    const sizes = this.ejectaParticles.geometry.attributes.size.array;
    const alphas = this.ejectaParticles.geometry.attributes.alpha.array;

    const t = this.stateTime / this.explosionDuration;

    for (let i = 0; i < this.ejectaCount; i++) {
      const i3 = i * 3;

      // Update position with velocity and gravity
      this.ejecta[i].velocity.y -= 30 * deltaTime; // Gravity

      positions[i3] += this.ejecta[i].velocity.x * deltaTime;
      positions[i3 + 1] += this.ejecta[i].velocity.y * deltaTime;
      positions[i3 + 2] += this.ejecta[i].velocity.z * deltaTime;

      // Update rotation (visual variety through size pulsing)
      this.ejecta[i].rotation.add(
        this.ejecta[i].angularVelocity.clone().multiplyScalar(deltaTime)
      );

      // Vary size based on rotation for visual interest
      const baseSize = 3 + Math.random() * 8;
      const rotationEffect = Math.sin(this.ejecta[i].rotation.x) * 0.5 + 0.5;
      sizes[i] = baseSize * (0.7 + rotationEffect * 0.6);

      // Fade and cool down
      alphas[i] = 1.0 - t * 0.3;
    }

    this.ejectaParticles.geometry.attributes.position.needsUpdate = true;
    this.ejectaParticles.geometry.attributes.size.needsUpdate = true;
    this.ejectaParticles.geometry.attributes.alpha.needsUpdate = true;
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
      const gravityStrength = 70 + (1.0 - distanceToCenter / 120) * 180;
      const acceleration = toCenter.normalize().multiplyScalar(gravityStrength * deltaTime);

      // Apply acceleration and gentle drag to velocity
      this.particles[i].velocity.add(acceleration);
      this.particles[i].velocity.multiplyScalar(0.99);

      // Add spiral motion
      const spiralSpeed = 3.0;
      const spiralRadius = Math.max(4.0, distanceToCenter * 0.25);
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

  getImpactFlash() {
    return this.impactFlash;
  }

  getEjectaParticles() {
    return this.ejectaParticles;
  }

  getFireballParticles() {
    return this.fireballParticles;
  }

  getShockwave() {
    return this.shockwave;
  }

  reset() {
    this.state = 'idle';
    this.stateTime = 0;
    this.explosionParticles.visible = false;
    this.impactFlash.visible = false;
    this.ejectaParticles.visible = false;
    this.fireballParticles.visible = false;
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
    if (this.impactFlash) {
      this.impactFlash.geometry.dispose();
      this.impactFlashMaterial.dispose();
    }
    if (this.ejectaParticles) {
      this.ejectaParticles.geometry.dispose();
      this.ejectaMaterial.dispose();
    }
    if (this.fireballParticles) {
      this.fireballParticles.geometry.dispose();
      this.fireballMaterial.dispose();
    }
    if (this.shockwave) {
      this.shockwave.geometry.dispose();
      this.shockwaveMaterial.dispose();
    }
  }
}
