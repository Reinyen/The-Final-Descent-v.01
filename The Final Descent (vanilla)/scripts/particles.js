import * as THREE from 'three';

export class ParticleSystem {
  constructor(qualityConfig, maxPointSize, impactPoint) {
    this.qualityConfig = qualityConfig;
    this.maxPointSize = maxPointSize;
    this.impactPoint = impactPoint;

    this.debrisParticles = null;
    this.debrisGeometry = null;
    this.debrisMaterial = null;

    this.debrisCount = Math.floor(3000 * qualityConfig.particleScale);
    this.debrisData = [];

    this.impactStartTime = -1;

    this.init();
  }

  init() {
    // Create debris geometry
    this.debrisGeometry = new THREE.BufferGeometry();

    const debrisPositions = new Float32Array(this.debrisCount * 3);
    const debrisColors = new Float32Array(this.debrisCount * 3);
    const debrisSizes = new Float32Array(this.debrisCount);

    this.debrisGeometry.setAttribute('position', new THREE.BufferAttribute(debrisPositions, 3));
    this.debrisGeometry.setAttribute('color', new THREE.BufferAttribute(debrisColors, 3));
    this.debrisGeometry.setAttribute('size', new THREE.BufferAttribute(debrisSizes, 1));

    // Create debris material
    this.debrisMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        pixelRatio: { value: Math.min(window.devicePixelRatio, this.qualityConfig.pixelRatioMax) },
        maxPointSize: { value: this.maxPointSize }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;

        uniform float pixelRatio;
        uniform float maxPointSize;

        void main() {
          vColor = color;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float viewDistance = max(0.0001, -mvPosition.z);

          float pixelSize = size * (50.0 / viewDistance) * pixelRatio;
          gl_PointSize = clamp(pixelSize, 1.0, min(maxPointSize, 12.0 * pixelRatio));

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.2, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.debrisParticles = new THREE.Points(this.debrisGeometry, this.debrisMaterial);

    console.log('[Particles] Debris system created with', this.debrisCount, 'particles');
  }

  emit() {
    // Initialize debris particles on impact
    const positions = this.debrisGeometry.attributes.position.array;
    const colors = this.debrisGeometry.attributes.color.array;
    const sizes = this.debrisGeometry.attributes.size.array;

    this.debrisData = [];

    for (let i = 0; i < this.debrisCount; i++) {
      const i3 = i * 3;

      // Start at impact point
      positions[i3] = this.impactPoint.x;
      positions[i3 + 1] = this.impactPoint.y;
      positions[i3 + 2] = this.impactPoint.z;

      // Random velocity in all directions (360° burst)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 5 + Math.random() * 10;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      // Random hot colors
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        // Orange
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.5;
        colors[i3 + 2] = 0.1;
      } else if (colorChoice < 0.7) {
        // Yellow-white
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.9;
        colors[i3 + 2] = 0.7;
      } else {
        // Purple-pink
        colors[i3] = 0.8;
        colors[i3 + 1] = 0.3;
        colors[i3 + 2] = 0.6;
      }

      // Base size for 3-8px chunks
      const baseSize = 0.5 + Math.random() * 1.0;
      sizes[i] = baseSize;

      // Lifetime
      const lifetime = 1.5 + Math.random() * 1.0; // 1.5-2.5 seconds

      this.debrisData.push({
        velocity,
        baseSize,
        lifetime,
        age: 0
      });
    }

    this.debrisGeometry.attributes.position.needsUpdate = true;
    this.debrisGeometry.attributes.color.needsUpdate = true;
    this.debrisGeometry.attributes.size.needsUpdate = true;

    console.log('[Particles] Debris emitted');
  }

  update(phase, elapsedTime, deltaTime) {
    // Emit debris on impact
    if (phase.name === 'impact' && this.impactStartTime === -1) {
      this.impactStartTime = elapsedTime;
      this.emit();
    }

    // Update debris physics
    if (this.debrisData.length > 0) {
      const positions = this.debrisGeometry.attributes.position.array;
      const sizes = this.debrisGeometry.attributes.size.array;

      let needsUpdate = false;

      for (let i = 0; i < this.debrisCount; i++) {
        const data = this.debrisData[i];
        if (!data) continue;

        data.age += deltaTime;

        if (data.age < data.lifetime) {
          const i3 = i * 3;

          // Update position with velocity damping
          const damping = 0.95;
          data.velocity.multiplyScalar(damping);

          positions[i3] += data.velocity.x * deltaTime;
          positions[i3 + 1] += data.velocity.y * deltaTime;
          positions[i3 + 2] += data.velocity.z * deltaTime;

          // Fade out based on lifetime
          const lifeRatio = data.age / data.lifetime;
          sizes[i] = data.baseSize * (1.0 - lifeRatio);

          needsUpdate = true;
        } else {
          // Particle dead
          sizes[i] = 0;
        }
      }

      if (needsUpdate) {
        this.debrisGeometry.attributes.position.needsUpdate = true;
        this.debrisGeometry.attributes.size.needsUpdate = true;
      }
    }
  }

  getMesh() {
    return this.debrisParticles;
  }

  destroy() {
    if (this.debrisGeometry) {
      this.debrisGeometry.dispose();
    }
    if (this.debrisMaterial) {
      this.debrisMaterial.dispose();
    }
  }
}
