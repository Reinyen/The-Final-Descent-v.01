/**
 * Roster Selection Particle Effect
 * Creates a dramatic golden fiery sphere with rings effect when a card is selected
 * Based on the visual style provided by the user
 */

import * as THREE from 'three';

export class SelectionParticleEffect {
  constructor(containerElement) {
    this.container = containerElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;

    // Effect objects
    this.coreGroup = null;
    this.fierySphere = null;
    this.lightRings = null;
    this.sphereParticles = null;
    this.ringParticleSystems = [];

    // Animation state
    this.animationFrameId = null;
    this.isActive = false;

    // Particle counts
    this.sphereParticleCount = 800;
    this.ringParticleCount = 400;

    // Golden palette
    this.palette = {
      pointLightColor: new THREE.Color(0xFFD700),
      pointLightIntensity: 1.8,
      sphereColor1: new THREE.Color(1.0, 0.7, 0.0),
      sphereColor2: new THREE.Color(1.0, 0.9, 0.4),
      sphereRimColor: new THREE.Color(1.0, 1.0, 0.8),
      ringColor1: new THREE.Color(1.0, 0.8, 0.0),
      ringColor2: new THREE.Color(1.0, 0.95, 0.5),
      sphereParticleColor1: new THREE.Color(1.0, 0.7, 0.2),
      sphereParticleColor2: new THREE.Color(1.0, 1.0, 0.6),
      sphereParticleEndColor: new THREE.Color(0.6, 0.4, 0.0),
      ringParticleColor1: new THREE.Color(1.0, 0.8, 0.1),
      ringParticleColor2: new THREE.Color(1.0, 1.0, 0.7),
      ringParticleEndColor: new THREE.Color(0.5, 0.3, 0.0)
    };
  }

  /**
   * Initialize the effect
   */
  init() {
    if (this.isActive) return;

    // Create scene
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 4);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true // Transparent background
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.container.appendChild(this.renderer.domElement);

    // Add lighting
    const pointLight = new THREE.PointLight(
      this.palette.pointLightColor,
      this.palette.pointLightIntensity,
      10
    );
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);

    // Create core group (will rotate)
    this.coreGroup = new THREE.Group();
    this.scene.add(this.coreGroup);

    // Create fiery sphere
    this.createFierySphere();

    // Create light rings
    this.createLightRings();

    // Create sphere particles
    this.createSphereParticles();

    this.isActive = true;
    console.log('[SelectionEffect] Initialized');
  }

  /**
   * Create the central fiery sphere
   */
  createFierySphere() {
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.ShaderMaterial({
      vertexShader: this.getSphereVertexShader(),
      fragmentShader: this.getSphereFragmentShader(),
      uniforms: {
        time: { value: 0 },
        sphereColor1: { value: this.palette.sphereColor1 },
        sphereColor2: { value: this.palette.sphereColor2 },
        sphereRimColor: { value: this.palette.sphereRimColor }
      }
    });

    this.fierySphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.coreGroup.add(this.fierySphere);
  }

  /**
   * Create rotating light rings
   */
  createLightRings() {
    this.lightRings = new THREE.Group();

    for (let i = 0; i < 3; i++) {
      const innerRadius = 0.8 + i * 0.3;
      const outerRadius = 0.9 + i * 0.3;

      const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
      const ringMaterial = new THREE.ShaderMaterial({
        vertexShader: this.getRingVertexShader(),
        fragmentShader: this.getRingFragmentShader(),
        uniforms: {
          time: { value: 0 },
          ringColor1: { value: this.palette.ringColor1 },
          ringColor2: { value: this.palette.ringColor2 }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + (i * 0.05);
      ring.rotation.y = (i * 0.1);

      this.lightRings.add(ring);

      // Create ring particles
      const ringParticles = this.createParticleLayer(
        this.ringParticleCount,
        {
          shape: 'ring',
          innerRadius: innerRadius,
          outerRadius: outerRadius + 0.05,
          lifetime: 1.0 + i * 0.2,
          velocityScale: 0.8 + i * 0.3,
          baseSize: 0.015,
          sizeVariation: 0.025
        }
      );
      ringParticles.rotation.copy(ring.rotation);
      this.ringParticleSystems.push(ringParticles);
      ring.add(ringParticles);
    }

    this.coreGroup.add(this.lightRings);
  }

  /**
   * Create sphere particles
   */
  createSphereParticles() {
    this.sphereParticles = this.createParticleLayer(
      this.sphereParticleCount,
      {
        shape: 'sphere',
        radius: 0.55,
        lifetime: 1.8,
        velocityScale: 1.2,
        baseSize: 0.02,
        sizeVariation: 0.03
      }
    );
    this.coreGroup.add(this.sphereParticles);
  }

  /**
   * Create a particle layer
   */
  createParticleLayer(count, options) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const initialVelocities = new Float32Array(count * 3);
    const creationTimes = new Float32Array(count);

    const baseColor1 = options.shape === 'sphere'
      ? this.palette.sphereParticleColor1
      : this.palette.ringParticleColor1;
    const baseColor2 = options.shape === 'sphere'
      ? this.palette.sphereParticleColor2
      : this.palette.ringParticleColor2;
    const lifetime = options.lifetime || 2.0;
    const velocityScale = options.velocityScale || 1.0;
    const baseSize = options.baseSize || 0.03;
    const sizeVariation = options.sizeVariation || 0.04;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let originPos = new THREE.Vector3();
      let velocity = new THREE.Vector3();

      if (options.shape === 'sphere') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2.0 * Math.random() - 1.0);
        const r = options.radius + (Math.random() - 0.5) * 0.05;
        originPos.set(
          Math.sin(phi) * Math.cos(theta) * r,
          Math.sin(phi) * Math.sin(theta) * r,
          Math.cos(phi) * r
        );
        velocity.copy(originPos).normalize().multiplyScalar((0.6 + Math.random() * 0.5) * velocityScale);
      } else if (options.shape === 'ring') {
        const angle = Math.random() * Math.PI * 2;
        const r = options.innerRadius + Math.random() * (options.outerRadius - options.innerRadius);
        originPos.set(
          Math.cos(angle) * r,
          Math.sin(angle) * r,
          (Math.random() - 0.5) * 0.05
        );
        const tangent = new THREE.Vector3(-Math.sin(angle), Math.cos(angle), 0).multiplyScalar(0.4);
        const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(0.2 + Math.random() * 0.2);
        velocity.add(tangent).add(radial).normalize().multiplyScalar((0.4 + Math.random() * 0.4) * velocityScale);
      }

      positions[i3] = originPos.x;
      positions[i3 + 1] = originPos.y;
      positions[i3 + 2] = originPos.z;

      initialVelocities[i3] = velocity.x;
      initialVelocities[i3 + 1] = velocity.y;
      initialVelocities[i3 + 2] = velocity.z;

      const t = Math.random();
      const color = new THREE.Color().lerpColors(baseColor1, baseColor2, t * t);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = baseSize + Math.random() * sizeVariation;
      creationTimes[i] = -Math.random() * lifetime;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('initialVelocity', new THREE.BufferAttribute(initialVelocities, 3));
    geometry.setAttribute('creationTime', new THREE.BufferAttribute(creationTimes, 1));

    const endColor = options.shape === 'sphere'
      ? this.palette.sphereParticleEndColor
      : this.palette.ringParticleEndColor;

    const material = new THREE.ShaderMaterial({
      vertexShader: this.getParticleVertexShader(),
      fragmentShader: this.getParticleFragmentShader(),
      uniforms: {
        time: { value: 0 },
        lifetime: { value: lifetime },
        endColor: { value: endColor }
      },
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.userData.creationOptions = options;
    return points;
  }

  /**
   * Respawn expired particles
   */
  respawnParticles(particleSystem) {
    if (!particleSystem || !particleSystem.geometry || !particleSystem.userData.creationOptions) return;

    const attributes = particleSystem.geometry.attributes;
    const creationTimes = attributes.creationTime;
    const positions = attributes.position;
    const initialVelocities = attributes.initialVelocity;

    if (!creationTimes || !positions || !initialVelocities) return;

    const options = particleSystem.userData.creationOptions;
    const lifetime = particleSystem.material.uniforms.lifetime.value;
    const currentTime = particleSystem.material.uniforms.time.value;
    const velocityScale = options.velocityScale || 1.0;

    let needsUpdate = false;

    for (let i = 0; i < creationTimes.count; i++) {
      if (currentTime > creationTimes.array[i] + lifetime) {
        creationTimes.array[i] = currentTime + Math.random() * 0.1;
        needsUpdate = true;

        const i3 = i * 3;

        if (options.shape === 'sphere') {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2.0 * Math.random() - 1.0);
          const r = options.radius + (Math.random() - 0.5) * 0.05;
          positions.array[i3] = Math.sin(phi) * Math.cos(theta) * r;
          positions.array[i3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
          positions.array[i3 + 2] = Math.cos(phi) * r;

          const velocity = new THREE.Vector3(
            positions.array[i3],
            positions.array[i3 + 1],
            positions.array[i3 + 2]
          ).normalize().multiplyScalar((0.6 + Math.random() * 0.5) * velocityScale);

          initialVelocities.array[i3] = velocity.x;
          initialVelocities.array[i3 + 1] = velocity.y;
          initialVelocities.array[i3 + 2] = velocity.z;
        } else if (options.shape === 'ring') {
          const angle = Math.random() * Math.PI * 2;
          const r = options.innerRadius + Math.random() * (options.outerRadius - options.innerRadius);
          positions.array[i3] = Math.cos(angle) * r;
          positions.array[i3 + 1] = Math.sin(angle) * r;
          positions.array[i3 + 2] = (Math.random() - 0.5) * 0.05;
        }
      }
    }

    if (needsUpdate) {
      creationTimes.needsUpdate = true;
      positions.needsUpdate = true;
      initialVelocities.needsUpdate = true;
    }
  }

  /**
   * Start animation loop
   */
  start() {
    if (!this.isActive) return;

    const animate = () => {
      if (!this.isActive) return;

      this.animationFrameId = requestAnimationFrame(animate);

      const time = this.clock.getElapsedTime();

      // Update sphere shader
      if (this.fierySphere && this.fierySphere.material.uniforms.time) {
        this.fierySphere.material.uniforms.time.value = time;
      }

      // Update sphere particles
      if (this.sphereParticles) {
        this.sphereParticles.material.uniforms.time.value = time;
        this.respawnParticles(this.sphereParticles);
      }

      // Update ring particles
      this.ringParticleSystems.forEach(system => {
        if (system && system.material && system.material.uniforms) {
          system.material.uniforms.time.value = time;
          this.respawnParticles(system);
        }
      });

      // Rotate core group
      if (this.coreGroup) {
        this.coreGroup.rotation.y += 0.003;
        this.coreGroup.rotation.x += 0.001;
      }

      // Rotate rings
      if (this.lightRings) {
        this.lightRings.children.forEach((ring, i) => {
          if (ring.isMesh && ring.material.uniforms && ring.material.uniforms.time) {
            ring.material.uniforms.time.value = time;
          }
          if (ring.isMesh) {
            ring.rotation.z += 0.008 * (i + 1) * (i % 2 === 0 ? 1 : -1);
          }
        });
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * Stop animation and cleanup
   */
  stop() {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.renderer && this.renderer.domElement && this.container) {
      this.container.removeChild(this.renderer.domElement);
    }

    // Dispose of geometries and materials
    this.scene?.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.scene = null;
    this.camera = null;
    this.clock = null;
    this.coreGroup = null;
    this.fierySphere = null;
    this.lightRings = null;
    this.sphereParticles = null;
    this.ringParticleSystems = [];

    console.log('[SelectionEffect] Stopped and cleaned up');
  }

  /**
   * Handle window resize
   */
  resize() {
    if (!this.isActive || !this.camera || !this.renderer) return;

    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
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

  getParticleVertexShader() {
    return `
      attribute float size;
      attribute vec3 initialVelocity;
      attribute float creationTime;
      varying vec3 vColor;
      varying float vLifeProgress;
      uniform float time;
      uniform float lifetime;

      void main() {
        vColor = color;
        float timeElapsed = time - creationTime;
        vLifeProgress = clamp(timeElapsed / lifetime, 0.0, 1.0);

        if (vLifeProgress >= 1.0) {
          gl_PointSize = 0.0;
          return;
        }

        vec3 gravity = vec3(0.0, -0.03, 0.0);
        vec3 currentPos = position + initialVelocity * timeElapsed + 0.5 * gravity * timeElapsed * timeElapsed;

        vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);

        float sizeMultiplier = (1.0 - vLifeProgress * 0.4);
        float pointSize = size * ( 300.0 / max(1.0, -mvPosition.z) ) * sizeMultiplier;

        gl_PointSize = max(0.0, pointSize);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
  }

  getParticleFragmentShader() {
    return `
      varying vec3 vColor;
      varying float vLifeProgress;
      uniform vec3 endColor;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float distSqr = dot(coord, coord);

        if (distSqr > 0.25) discard;

        vec3 currentColor = mix(vColor, endColor, vLifeProgress * vLifeProgress);

        float edgeAlpha = 1.0 - smoothstep(0.15, 0.25, distSqr);
        float lifeAlpha = smoothstep(1.0, 0.5, vLifeProgress);

        float finalAlpha = edgeAlpha * lifeAlpha;

        float coreBrightness = smoothstep(0.05, 0.0, distSqr) * 0.4;

        gl_FragColor = vec4(currentColor + coreBrightness, finalAlpha);
      }
    `;
  }
}
