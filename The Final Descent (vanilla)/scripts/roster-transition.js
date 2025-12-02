/**
 * Roster Transition (Entry Cinematic)
 * Implements the entry animation per user specification:
 * 1. Black screen
 * 2. Golden stars falling in background
 * 3. 6 golden sphere effects appear with character names
 * 4. 3 fallen orbs turn purple and descend
 * 5. UI fades in
 * 6. Living orbs morph into character cards with golden glow
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

    // Six golden orbs
    this.orbs = [];

    // Phase timings (cumulative)
    this.phases = {
      A_BLACK_END: 1.0,           // Black screen hold
      B_STARS_END: 2.0,           // Stars falling (handled by scene)
      C_ORBS_APPEAR_END: 3.5,     // 6 golden orbs appear with names
      D_FALLEN_DESCEND_END: 5.0,  // 3 fallen turn purple and descend
      E_MORPH_END: 6.5            // Orbs morph to cards
    };

    // Golden and purple color palettes
    this.goldenPalette = {
      sphereColor1: new THREE.Color(1.0, 0.7, 0.0),
      sphereColor2: new THREE.Color(1.0, 0.9, 0.4),
      sphereRimColor: new THREE.Color(1.0, 1.0, 0.8),
      ringColor1: new THREE.Color(1.0, 0.8, 0.0),
      ringColor2: new THREE.Color(1.0, 0.95, 0.5),
      particleColor1: new THREE.Color(1.0, 0.7, 0.2),
      particleColor2: new THREE.Color(1.0, 1.0, 0.6)
    };

    this.purplePalette = {
      sphereColor1: new THREE.Color(0.5, 0.0, 0.8),
      sphereColor2: new THREE.Color(0.7, 0.2, 0.9),
      sphereRimColor: new THREE.Color(0.8, 0.4, 1.0),
      ringColor1: new THREE.Color(0.6, 0.1, 0.8),
      ringColor2: new THREE.Color(0.8, 0.3, 0.95),
      particleColor1: new THREE.Color(0.5, 0.0, 0.7),
      particleColor2: new THREE.Color(0.8, 0.4, 1.0)
    };

    console.log('[RosterTransition] Initialized');
  }

  /**
   * Start the entry cinematic
   */
  start(onComplete) {
    this.isPlaying = true;
    this.elapsedTime = 0;
    this.onCompleteCallback = onComplete;

    // Create the six golden orbs
    this.createSixOrbs();

    console.log('[RosterTransition] Starting cinematic');
  }

  /**
   * Create six golden sphere effects (similar to SelectionParticleEffect)
   */
  createSixOrbs() {
    const allIds = [...this.livingIds, ...this.fallenIds];

    for (let i = 0; i < 6; i++) {
      const charId = allIds[i];
      const char = getCharacterById(charId);
      const isFallen = this.fallenIds.includes(charId);

      // Create orb group
      const orbGroup = new THREE.Group();
      orbGroup.position.set(0, 0, 0);
      this.scene.add(orbGroup);

      // Create fiery sphere
      const sphere = this.createFierySphere();
      orbGroup.add(sphere);

      // Create 3 rotating light rings
      const rings = this.createLightRings();
      orbGroup.add(rings);

      // Create sphere particles
      const sphereParticles = this.createSphereParticles();
      orbGroup.add(sphereParticles);

      // Create ring particles
      const ringParticleSystems = this.createRingParticles(rings);

      // Create floating text label
      const textMesh = this.createTextLabel(char.name);
      textMesh.position.set(0, 1.8, 0);
      orbGroup.add(textMesh);

      // Store orb data
      this.orbs.push({
        group: orbGroup,
        sphere,
        rings,
        sphereParticles,
        ringParticleSystems,
        textLabel: textMesh,
        charId,
        charName: char.name,
        isFallen,
        targetPos: new THREE.Vector3(0, 0, 0),
        initialY: 0,
        clock: new THREE.Clock() // Individual clock for shader timing
      });
    }
  }

  /**
   * Create fiery sphere with shader
   */
  createFierySphere() {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.ShaderMaterial({
      vertexShader: this.getSphereVertexShader(),
      fragmentShader: this.getSphereFragmentShader(),
      uniforms: {
        time: { value: 0 },
        sphereColor1: { value: this.goldenPalette.sphereColor1.clone() },
        sphereColor2: { value: this.goldenPalette.sphereColor2.clone() },
        sphereRimColor: { value: this.goldenPalette.sphereRimColor.clone() }
      },
      transparent: true,
      opacity: 0 // Start invisible
    });

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Create rotating light rings
   */
  createLightRings() {
    const ringsGroup = new THREE.Group();

    for (let i = 0; i < 3; i++) {
      const innerRadius = 0.8 + i * 0.3;
      const outerRadius = 0.9 + i * 0.3;

      const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
      const ringMaterial = new THREE.ShaderMaterial({
        vertexShader: this.getRingVertexShader(),
        fragmentShader: this.getRingFragmentShader(),
        uniforms: {
          time: { value: 0 },
          ringColor1: { value: this.goldenPalette.ringColor1.clone() },
          ringColor2: { value: this.goldenPalette.ringColor2.clone() }
        },
        transparent: true,
        opacity: 0, // Start invisible
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + (i * 0.05);
      ring.rotation.y = (i * 0.1);
      ring.userData.ringIndex = i;

      ringsGroup.add(ring);
    }

    return ringsGroup;
  }

  /**
   * Create sphere particles
   */
  createSphereParticles() {
    const particleCount = 600;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const maxLifetimes = new Float32Array(particleCount);

    const radius = 0.55;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Random position on sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2.0 * Math.random() - 1.0);
      const r = radius + (Math.random() - 0.5) * 0.05;

      positions[i3] = Math.sin(phi) * Math.cos(theta) * r;
      positions[i3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
      positions[i3 + 2] = Math.cos(phi) * r;

      // Outward velocity
      const velocity = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      ).normalize().multiplyScalar(0.6 + Math.random() * 0.5);

      velocities[i3] = velocity.x;
      velocities[i3 + 1] = velocity.y;
      velocities[i3 + 2] = velocity.z;

      // Color
      const t = Math.random();
      const color = new THREE.Color().lerpColors(
        this.goldenPalette.particleColor1,
        this.goldenPalette.particleColor2,
        t * t
      );
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = 0.02 + Math.random() * 0.03;
      lifetimes[i] = Math.random() * 1.8;
      maxLifetimes[i] = 1.8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geometry.setAttribute('maxLifetime', new THREE.BufferAttribute(maxLifetimes, 1));

    const material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0, // Start invisible
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    points.userData.particleCount = particleCount;

    return points;
  }

  /**
   * Create ring particles for all rings
   */
  createRingParticles(ringsGroup) {
    const systems = [];

    ringsGroup.children.forEach((ring, ringIndex) => {
      const innerRadius = 0.8 + ringIndex * 0.3;
      const outerRadius = 0.9 + ringIndex * 0.3;
      const particleCount = 300;

      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      const velocities = new Float32Array(particleCount * 3);
      const lifetimes = new Float32Array(particleCount);
      const maxLifetimes = new Float32Array(particleCount);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const r = innerRadius + Math.random() * (outerRadius - innerRadius);

        positions[i3] = Math.cos(angle) * r;
        positions[i3 + 1] = Math.sin(angle) * r;
        positions[i3 + 2] = (Math.random() - 0.5) * 0.05;

        // Tangential velocity
        const tangent = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0);
        velocities[i3] = tangent.x * 0.4;
        velocities[i3 + 1] = tangent.y * 0.4;
        velocities[i3 + 2] = 0;

        const t = Math.random();
        const color = new THREE.Color().lerpColors(
          this.goldenPalette.particleColor1,
          this.goldenPalette.particleColor2,
          t
        );
        colors[i3] = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;

        sizes[i] = 0.015 + Math.random() * 0.025;
        lifetimes[i] = Math.random() * (1.0 + ringIndex * 0.2);
        maxLifetimes[i] = 1.0 + ringIndex * 0.2;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
      geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
      geometry.setAttribute('maxLifetime', new THREE.BufferAttribute(maxLifetimes, 1));

      const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0, // Start invisible
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      });

      const points = new THREE.Points(geometry, material);
      points.rotation.copy(ring.rotation);
      points.userData.particleCount = particleCount;
      points.userData.innerRadius = innerRadius;
      points.userData.outerRadius = outerRadius;

      ring.add(points);
      systems.push(points);
    });

    return systems;
  }

  /**
   * Create floating text label
   */
  createTextLabel(name) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 60px Cinzel, serif';
    context.fillStyle = '#FFD700';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = 'rgba(255, 215, 0, 0.8)';
    context.shadowBlur = 20;
    context.fillText(name, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);

    return sprite;
  }

  /**
   * Update particles for sphere and rings
   */
  updateParticles(particleSystem, deltaTime) {
    if (!particleSystem || !particleSystem.geometry) return;

    const positions = particleSystem.geometry.attributes.position;
    const velocities = particleSystem.geometry.attributes.velocity;
    const lifetimes = particleSystem.geometry.attributes.lifetime;
    const maxLifetimes = particleSystem.geometry.attributes.maxLifetime;
    const particleCount = particleSystem.userData.particleCount;

    if (!positions || !velocities || !lifetimes || !maxLifetimes) return;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Update lifetime
      lifetimes.array[i] += deltaTime;

      // Respawn if expired
      if (lifetimes.array[i] > maxLifetimes.array[i]) {
        lifetimes.array[i] = 0;

        // Check if it's a ring particle system
        if (particleSystem.userData.innerRadius !== undefined) {
          const angle = Math.random() * Math.PI * 2;
          const r = particleSystem.userData.innerRadius +
                   Math.random() * (particleSystem.userData.outerRadius - particleSystem.userData.innerRadius);
          positions.array[i3] = Math.cos(angle) * r;
          positions.array[i3 + 1] = Math.sin(angle) * r;
          positions.array[i3 + 2] = (Math.random() - 0.5) * 0.05;
        } else {
          // Sphere particle
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2.0 * Math.random() - 1.0);
          const r = 0.55 + (Math.random() - 0.5) * 0.05;
          positions.array[i3] = Math.sin(phi) * Math.cos(theta) * r;
          positions.array[i3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
          positions.array[i3 + 2] = Math.cos(phi) * r;
        }
      }

      // Update position
      positions.array[i3] += velocities.array[i3] * deltaTime;
      positions.array[i3 + 1] += velocities.array[i3 + 1] * deltaTime;
      positions.array[i3 + 2] += velocities.array[i3 + 2] * deltaTime;
    }

    positions.needsUpdate = true;
    lifetimes.needsUpdate = true;
  }

  /**
   * Change orb color palette (golden -> purple)
   */
  changeOrbColor(orb, palette) {
    // Update sphere colors
    orb.sphere.material.uniforms.sphereColor1.value.copy(palette.sphereColor1);
    orb.sphere.material.uniforms.sphereColor2.value.copy(palette.sphereColor2);
    orb.sphere.material.uniforms.sphereRimColor.value.copy(palette.sphereRimColor);

    // Update ring colors
    orb.rings.children.forEach(ring => {
      if (ring.material && ring.material.uniforms) {
        ring.material.uniforms.ringColor1.value.copy(palette.ringColor1);
        ring.material.uniforms.ringColor2.value.copy(palette.ringColor2);
      }
    });

    // Update particle colors
    const updateParticleColors = (particleSystem, color1, color2) => {
      if (!particleSystem || !particleSystem.geometry) return;
      const colors = particleSystem.geometry.attributes.color;
      if (!colors) return;

      for (let i = 0; i < particleSystem.userData.particleCount; i++) {
        const i3 = i * 3;
        const t = Math.random();
        const color = new THREE.Color().lerpColors(color1, color2, t);
        colors.array[i3] = color.r;
        colors.array[i3 + 1] = color.g;
        colors.array[i3 + 2] = color.b;
      }
      colors.needsUpdate = true;
    };

    updateParticleColors(orb.sphereParticles, palette.particleColor1, palette.particleColor2);
    orb.ringParticleSystems.forEach(system => {
      updateParticleColors(system, palette.particleColor1, palette.particleColor2);
    });
  }

  /**
   * Update transition animation
   */
  update(deltaTime) {
    if (!this.isPlaying) return;

    this.elapsedTime += deltaTime;

    // Update all orb particles and shaders
    this.orbs.forEach(orb => {
      const time = orb.clock.getElapsedTime();

      // Update sphere shader
      if (orb.sphere.material.uniforms.time) {
        orb.sphere.material.uniforms.time.value = time;
      }

      // Update ring shaders and rotation
      orb.rings.children.forEach((ring, i) => {
        if (ring.material && ring.material.uniforms && ring.material.uniforms.time) {
          ring.material.uniforms.time.value = time;
        }
        ring.rotation.z += 0.008 * (i + 1) * (i % 2 === 0 ? 1 : -1);
      });

      // Update particles
      this.updateParticles(orb.sphereParticles, deltaTime);
      orb.ringParticleSystems.forEach(system => {
        this.updateParticles(system, deltaTime);
      });

      // Rotate group
      orb.group.rotation.y += 0.003;
      orb.group.rotation.x += 0.001;
    });

    // Determine current phase and update accordingly
    if (this.elapsedTime < this.phases.A_BLACK_END) {
      this.updatePhaseA();
    } else if (this.elapsedTime < this.phases.B_STARS_END) {
      this.updatePhaseB();
    } else if (this.elapsedTime < this.phases.C_ORBS_APPEAR_END) {
      this.updatePhaseC();
    } else if (this.elapsedTime < this.phases.D_FALLEN_DESCEND_END) {
      this.updatePhaseD();
    } else if (this.elapsedTime < this.phases.E_MORPH_END) {
      this.updatePhaseE();
    } else {
      this.complete();
    }
  }

  /**
   * Phase A: Black screen hold
   */
  updatePhaseA() {
    // Just holding black - orbs remain invisible
  }

  /**
   * Phase B: Stars falling
   * (Handled by RosterScene starfield)
   */
  updatePhaseB() {
    // Stars handled by scene
  }

  /**
   * Phase C: 6 golden orbs appear with names
   */
  updatePhaseC() {
    const phaseStart = this.phases.B_STARS_END;
    const phaseEnd = this.phases.C_ORBS_APPEAR_END;
    const phaseDuration = phaseEnd - phaseStart;
    const t = (this.elapsedTime - phaseStart) / phaseDuration;

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const progress = easeOut(Math.min(t, 1));

    // Arrange orbs in two rows of three
    const spacing = 3;

    this.orbs.forEach((orb, i) => {
      // Fade in all elements
      orb.sphere.material.opacity = Math.min(progress * 1.5, 1);
      orb.rings.children.forEach(ring => {
        if (ring.material) ring.material.opacity = Math.min(progress * 1.5, 0.5);
      });
      orb.sphereParticles.material.opacity = Math.min(progress * 1.5, 0.9);
      orb.ringParticleSystems.forEach(system => {
        system.material.opacity = Math.min(progress * 1.5, 0.8);
      });
      orb.textLabel.material.opacity = Math.min(progress * 1.2, 1);

      // Calculate target position (two rows of three)
      let row, col;
      if (i < 3) {
        // Top row (will become Living)
        row = 2;
        col = i - 1;
      } else {
        // Bottom row (will become Fallen)
        row = -2;
        col = (i - 3) - 1;
      }

      const targetX = col * spacing;
      const targetY = row;

      // Move to position
      orb.group.position.x = THREE.MathUtils.lerp(0, targetX, progress);
      orb.group.position.y = THREE.MathUtils.lerp(0, targetY, progress);
      orb.group.position.z = 0;

      orb.initialY = targetY;
    });
  }

  /**
   * Phase D: 3 fallen orbs turn purple and descend
   */
  updatePhaseD() {
    const phaseStart = this.phases.C_ORBS_APPEAR_END;
    const phaseEnd = this.phases.D_FALLEN_DESCEND_END;
    const phaseDuration = phaseEnd - phaseStart;
    const t = (this.elapsedTime - phaseStart) / phaseDuration;

    const progress = Math.min(t, 1);

    this.orbs.forEach((orb) => {
      if (orb.isFallen) {
        // Change to purple (happens quickly at start)
        if (t < 0.2) {
          const colorT = t / 0.2;
          const lerpColor = (uniform, golden, purple) => {
            uniform.value.lerpColors(golden, purple, colorT);
          };

          lerpColor(orb.sphere.material.uniforms.sphereColor1,
                   this.goldenPalette.sphereColor1,
                   this.purplePalette.sphereColor1);
          lerpColor(orb.sphere.material.uniforms.sphereColor2,
                   this.goldenPalette.sphereColor2,
                   this.purplePalette.sphereColor2);
          lerpColor(orb.sphere.material.uniforms.sphereRimColor,
                   this.goldenPalette.sphereRimColor,
                   this.purplePalette.sphereRimColor);

          orb.rings.children.forEach(ring => {
            if (ring.material && ring.material.uniforms) {
              lerpColor(ring.material.uniforms.ringColor1,
                       this.goldenPalette.ringColor1,
                       this.purplePalette.ringColor1);
              lerpColor(ring.material.uniforms.ringColor2,
                       this.goldenPalette.ringColor2,
                       this.purplePalette.ringColor2);
            }
          });
        }

        // Descend
        const targetY = -5;
        orb.group.position.y = THREE.MathUtils.lerp(orb.initialY, targetY, progress);
      }
    });
  }

  /**
   * Phase E: Orbs morph to cards (fade out)
   */
  updatePhaseE() {
    const phaseStart = this.phases.D_FALLEN_DESCEND_END;
    const phaseEnd = this.phases.E_MORPH_END;
    const phaseDuration = phaseEnd - phaseStart;
    const t = (this.elapsedTime - phaseStart) / phaseDuration;

    const progress = Math.min(t, 1);

    // Fade out all orbs
    this.orbs.forEach((orb) => {
      orb.sphere.material.opacity = 1 - progress;
      orb.rings.children.forEach(ring => {
        if (ring.material) ring.material.opacity = (0.5) * (1 - progress);
      });
      orb.sphereParticles.material.opacity = 0.9 * (1 - progress);
      orb.ringParticleSystems.forEach(system => {
        system.material.opacity = 0.8 * (1 - progress);
      });
      orb.textLabel.material.opacity = 1 - progress;
    });
  }

  /**
   * Complete the transition
   */
  complete() {
    this.isPlaying = false;

    // Clean up all orbs
    this.orbs.forEach((orb) => {
      this.scene.remove(orb.group);

      // Dispose geometries and materials
      orb.sphere.geometry.dispose();
      orb.sphere.material.dispose();

      orb.rings.children.forEach(ring => {
        ring.geometry.dispose();
        ring.material.dispose();
      });

      orb.sphereParticles.geometry.dispose();
      orb.sphereParticles.material.dispose();

      orb.ringParticleSystems.forEach(system => {
        system.geometry.dispose();
        system.material.dispose();
      });

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

  // Shader code
  getSphereVertexShader() {
    return `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform float time;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);

        vec3 pos = position;
        float pulse = sin(time * 2.5 + position.y * 8.0) * 0.03;
        pos += normal * pulse;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewPosition = -mvPosition.xyz;

        gl_Position = projectionMatrix * mvPosition;
      }
    `;
  }

  getSphereFragmentShader() {
    return `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform float time;
      uniform vec3 sphereColor1;
      uniform vec3 sphereColor2;
      uniform vec3 sphereRimColor;

      void main() {
        float glow1 = sin(time * 1.5 + vUv.y * 5.0) * 0.5 + 0.5;
        float glow2 = cos(time * 1.0 - vUv.y * 7.0) * 0.5 + 0.5;
        float glowCombined = mix(glow1, glow2, 0.6);

        vec3 baseColor = mix(sphereColor1, sphereColor2, vUv.y + glowCombined * 0.3);

        vec3 normal = normalize(vNormal);
        vec3 viewDirection = normalize(vViewPosition);
        float fresnelTerm = dot(normal, viewDirection);
        fresnelTerm = pow(1.0 - fresnelTerm, 3.5);
        fresnelTerm = clamp(fresnelTerm * 1.2, 0.0, 1.0);

        vec3 rimColor = sphereRimColor * fresnelTerm * 0.6;
        vec3 finalColor = baseColor + rimColor;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }

  getRingVertexShader() {
    return `
      varying vec2 vUv;
      varying float vDistortion;
      uniform float time;

      void main() {
        vUv = uv;
        vec3 pos = position;

        float wave1 = sin(time * 2.0 + position.x * 3.0) * 0.04;
        float wave2 = cos(time * 1.5 + position.y * 3.5) * 0.03;
        pos.z += wave1 + wave2;
        vDistortion = abs(wave1 + wave2) / 0.07;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;
  }

  getRingFragmentShader() {
    return `
      varying vec2 vUv;
      varying float vDistortion;
      uniform float time;
      uniform vec3 ringColor1;
      uniform vec3 ringColor2;

      void main() {
        float pulse = pow(sin(time * 3.0 + vUv.x * 7.0) * 0.5 + 0.5, 2.0);
        vec3 color = mix(ringColor1, ringColor2, clamp(vUv.y + pulse * 0.5, 0.0, 1.0));

        float edgeFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
        float alpha = (0.4 + pulse * 0.4) * edgeFade * (1.0 - vDistortion * 0.4);
        alpha = clamp(alpha, 0.0, 1.0);

        gl_FragColor = vec4(color, alpha);
      }
    `;
  }
}
