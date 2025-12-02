import * as THREE from 'three';

export class Starfield {
  constructor(qualityConfig, maxPointSize) {
    this.qualityConfig = qualityConfig;
    this.maxPointSize = maxPointSize;
    this.starCount = 2500;
    this.dustCount = 800; // Additional dust particles for depth

    this.starField = null;
    this.starGeometry = null;
    this.starMaterial = null;

    this.init();
  }

  init() {
    this.starGeometry = new THREE.BufferGeometry();

    const totalCount = this.starCount + this.dustCount;
    const starPositions = new Float32Array(totalCount * 3);
    const starColors = new Float32Array(totalCount * 3);
    const starBaseColors = new Float32Array(totalCount * 3);
    const starBaseSizes = new Float32Array(totalCount);
    const starTwinkleSeeds = new Float32Array(totalCount);
    const starTwinkleSpeed = new Float32Array(totalCount); // Individual flicker speeds
    const starAbsorptionScales = new Float32Array(totalCount);
    const starOriginalPositions = new Float32Array(totalCount * 3);
    const starRippleOffsets = new Float32Array(totalCount * 3);

    // Create star texture
    const starTexture = this.createStarTexture();

    // Initialize star and dust properties
    for (let i = 0; i < totalCount; i++) {
      const i3 = i * 3;
      const isDust = i >= this.starCount; // Last 800 are dust particles

      // Position: Evenly distributed across visible frustum
      starPositions[i3] = (Math.random() - 0.5) * 400; // X: -200 to 200
      starPositions[i3 + 1] = (Math.random() - 0.5) * 300; // Y: -150 to 150
      starPositions[i3 + 2] = -130 + Math.random() * 100; // Z: -130 to -30

      // Store original positions
      starOriginalPositions[i3] = starPositions[i3];
      starOriginalPositions[i3 + 1] = starPositions[i3 + 1];
      starOriginalPositions[i3 + 2] = starPositions[i3 + 2];

      if (isDust) {
        // Dust particles: very dim, small, subtle
        const dustBrightness = 0.2 + Math.random() * 0.3; // 0.2 to 0.5 (dimmer)
        starColors[i3] = dustBrightness;
        starColors[i3 + 1] = dustBrightness;
        starColors[i3 + 2] = dustBrightness;

        // Dust sizes: very small
        starBaseSizes[i] = 0.1 + Math.random() * 0.2; // 0.1 - 0.3

        // Dust twinkle: very slow, subtle
        starTwinkleSpeed[i] = 0.3 + Math.random() * 0.4; // 0.3 - 0.7 (slower)
      } else {
        // Stars: bright, varied sizes, dynamic flickering
        const brightness = 0.85 + Math.random() * 0.15; // 0.85 to 1.0
        starColors[i3] = brightness;
        starColors[i3 + 1] = brightness;
        starColors[i3 + 2] = brightness;

        // Enhanced size variation for more dramatic starfield
        const sizeRand = Math.random();
        if (sizeRand < 0.50) {
          // 50%: Small pinpoint stars
          starBaseSizes[i] = 0.2 + Math.random() * 0.4; // 0.2 - 0.6
        } else if (sizeRand < 0.80) {
          // 30%: Medium stars
          starBaseSizes[i] = 0.6 + Math.random() * 0.5; // 0.6 - 1.1
        } else if (sizeRand < 0.95) {
          // 15%: Large bright stars
          starBaseSizes[i] = 1.1 + Math.random() * 0.6; // 1.1 - 1.7
        } else {
          // 5%: Very large brilliant stars
          starBaseSizes[i] = 1.7 + Math.random() * 0.8; // 1.7 - 2.5
        }

        // Varied twinkle speeds for more dynamic flickering
        starTwinkleSpeed[i] = 0.8 + Math.random() * 1.2; // 0.8 - 2.0 (varied speeds)
      }

      // Twinkle seed
      starTwinkleSeeds[i] = Math.random() * 100.0;

      // Absorption scale
      starAbsorptionScales[i] = 1.0;

      // Store base color
      starBaseColors[i3] = starColors[i3];
      starBaseColors[i3 + 1] = starColors[i3 + 1];
      starBaseColors[i3 + 2] = starColors[i3 + 2];
    }

    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starGeometry.setAttribute('basePosition', new THREE.BufferAttribute(starOriginalPositions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    this.starGeometry.setAttribute('baseColor', new THREE.BufferAttribute(starBaseColors, 3));
    this.starGeometry.setAttribute('baseSize', new THREE.BufferAttribute(starBaseSizes, 1));
    this.starGeometry.setAttribute('twinkleSeed', new THREE.BufferAttribute(starTwinkleSeeds, 1));
    this.starGeometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(starTwinkleSpeed, 1));
    this.starGeometry.setAttribute('absorptionScale', new THREE.BufferAttribute(starAbsorptionScales, 1));
    this.starGeometry.setAttribute('rippleOffset', new THREE.BufferAttribute(starRippleOffsets, 3));

    // Create shader material
    this.starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        starTexture: { value: starTexture },
        baseOpacity: { value: 1.0 },
        starIntensity: { value: 0.85 },
        pixelRatio: { value: Math.min(window.devicePixelRatio, this.qualityConfig.pixelRatioMax) },
        viewportHeight: { value: window.innerHeight },
        maxPointSize: { value: this.maxPointSize }
      },
      vertexShader: `
        attribute float baseSize;
        attribute float twinkleSeed;
        attribute float twinkleSpeed;
        attribute float absorptionScale;
        attribute vec3 color;
        attribute vec3 rippleOffset;

        uniform float time;
        uniform float baseOpacity;
        uniform float starIntensity;
        uniform float pixelRatio;
        uniform float viewportHeight;
        uniform float maxPointSize;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;

        void main() {
          vColor = color;

          // Enhanced dynamic twinkle with individual speeds and intensities
          float twinkle1 = sin(time * twinkleSpeed * 1.5 + twinkleSeed) * 0.25;
          float twinkle2 = sin(time * twinkleSpeed * 2.3 + twinkleSeed * 1.7) * 0.15;
          float twinkle = twinkle1 + twinkle2 + 0.75; // Range: 0.35 to 1.15

          float sizeMultiplier = twinkle * absorptionScale;
          float brightnessMultiplier = twinkle * absorptionScale * starIntensity;

          // Apply ripple offset without mutating position buffer
          vec3 warpedPos = position + rippleOffset;

          vec4 mvPosition = modelViewMatrix * vec4(warpedPos, 1.0);
          float viewDistance = -mvPosition.z;

          // Depth cueing
          float depthFactor = 1.0 - (viewDistance - 30.0) / 100.0;
          depthFactor = clamp(depthFactor, 0.6, 1.0);

          // Pixel-consistent sizing for crisp pinpoints
          float screenScale = viewportHeight * pixelRatio * 1.5;
          float pixelSize = baseSize * sizeMultiplier * depthFactor * screenScale / max(0.0001, viewDistance);

          gl_PointSize = clamp(pixelSize, 1.0, min(maxPointSize, 4.0 * pixelRatio));

          vAlpha = clamp(baseOpacity * brightnessMultiplier * depthFactor, 0.0, 1.0);
          vDepth = (viewDistance - 30.0) / 100.0;

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D starTexture;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;

        void main() {
          vec4 texColor = texture2D(starTexture, gl_PointCoord);

          float dist = length(gl_PointCoord - vec2(0.5));
          float coreBrightness = smoothstep(0.5, 0.0, dist);

          vec3 finalColor = vColor * (0.9 + coreBrightness * 0.1);
          float finalAlpha = texColor.a * vAlpha;

          gl_FragColor = vec4(finalColor, clamp(finalAlpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    this.starField = new THREE.Points(this.starGeometry, this.starMaterial);
    console.log(`[Starfield] Created with ${this.starCount} stars and ${this.dustCount} dust particles (${totalCount} total)`);
  }

  createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; // Higher resolution for crisper stars
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const center = 64;

    // Create a sharper, more realistic star with tight bright core
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.1, 'rgba(255, 255, 255, 1.0)'); // Tight bright core
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)'); // Sharp falloff
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter; // Better filtering for crisp look
    texture.magFilter = THREE.LinearFilter;

    return texture;
  }

  update(phase, elapsedTime) {
    // Update time uniform for twinkling
    this.starMaterial.uniforms.time.value = elapsedTime;

    // Fade in during fade_in phase
    if (phase.name === 'fade_in') {
      this.starMaterial.uniforms.baseOpacity.value = phase.phaseT;
    } else {
      this.starMaterial.uniforms.baseOpacity.value = 1.0;
    }

    // Automatic slow rotation (inspired by canvas 3D rotation)
    // Rotate on both axes for interesting motion
    this.starField.rotation.x += 0.0002;
    this.starField.rotation.y += 0.0003;
  }

  getMesh() {
    return this.starField;
  }

  getGeometry() {
    return this.starGeometry;
  }

  handleResize() {
    this.starMaterial.uniforms.viewportHeight.value = window.innerHeight;
  }

  destroy() {
    if (this.starGeometry) {
      this.starGeometry.dispose();
    }
    if (this.starMaterial) {
      this.starMaterial.dispose();
    }
  }
}
