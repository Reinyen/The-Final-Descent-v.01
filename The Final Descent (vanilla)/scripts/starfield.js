import * as THREE from 'three';

export class Starfield {
  constructor(qualityConfig, maxPointSize) {
    this.qualityConfig = qualityConfig;
    this.maxPointSize = maxPointSize;
    this.starCount = 3000;

    this.starField = null;
    this.starGeometry = null;
    this.starMaterial = null;

    this.init();
  }

  init() {
    this.starGeometry = new THREE.BufferGeometry();

    const starPositions = new Float32Array(this.starCount * 3);
    const starColors = new Float32Array(this.starCount * 3);
    const starBaseColors = new Float32Array(this.starCount * 3);
    const starBaseSizes = new Float32Array(this.starCount);
    const starTwinkleSeeds = new Float32Array(this.starCount);
    const starAbsorptionScales = new Float32Array(this.starCount);
    const starOriginalPositions = new Float32Array(this.starCount * 3);
    const starRippleOffsets = new Float32Array(this.starCount * 3);

    // Create star texture
    const starTexture = this.createStarTexture();

    // Initialize star properties
    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;

      // Position: X: -100 to 100, Y: -75 to 75, Z: -130 to -30
      starPositions[i3] = (Math.random() - 0.5) * 200;
      starPositions[i3 + 1] = (Math.random() - 0.5) * 150;
      starPositions[i3 + 2] = -130 + Math.random() * 100;

      // Store original positions
      starOriginalPositions[i3] = starPositions[i3];
      starOriginalPositions[i3 + 1] = starPositions[i3 + 1];
      starOriginalPositions[i3 + 2] = starPositions[i3 + 2];

      // Star color distribution
      const colorRand = Math.random();
      if (colorRand < 0.7) {
        // 70% white stars
        starColors[i3] = 0.95 + Math.random() * 0.05;
        starColors[i3 + 1] = 0.95 + Math.random() * 0.05;
        starColors[i3 + 2] = 1.0;
      } else if (colorRand < 0.9) {
        // 20% blue-tinted
        starColors[i3] = 0.85;
        starColors[i3 + 1] = 0.9;
        starColors[i3 + 2] = 1.0;
      } else {
        // 10% yellow-tinted
        starColors[i3] = 1.0;
        starColors[i3 + 1] = 0.9;
        starColors[i3 + 2] = 0.8;
      }

      // Base size: weighted distribution for crisp pinpoints
      const sizeRand = Math.random();
      if (sizeRand < 0.70) {
        starBaseSizes[i] = 0.3 + Math.random() * 0.3; // 0.3 - 0.6
      } else if (sizeRand < 0.95) {
        starBaseSizes[i] = 0.6 + Math.random() * 0.3; // 0.6 - 0.9
      } else {
        starBaseSizes[i] = 0.9 + Math.random() * 0.3; // 0.9 - 1.2
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

          // Subtle twinkle: 0.8-1.0 range
          float twinkle = sin(time * 1.5 + twinkleSeed * 0.5) * 0.1 + 0.9;

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
    console.log('[Starfield] Created with', this.starCount, 'stars');
  }

  createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

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
