import * as THREE from 'three';

export class Starfield {
  constructor(qualityConfig, maxPointSize) {
    this.qualityConfig = qualityConfig;
    this.maxPointSize = maxPointSize;
    this.starCount = 3400;
    this.dustCount = 1400; // Additional dust particles for depth

    this.starField = null;
    this.starGeometry = null;
    this.starMaterial = null;

    this.bounds = {
      x: 230,
      y: 170,
      zNear: -30,
      zFar: -170
    };

    this.init();
  }

  init() {
    this.starGeometry = new THREE.BufferGeometry();

    const totalCount = this.starCount + this.dustCount;
    const starPositions = new Float32Array(totalCount * 3);
    const starColors = new Float32Array(totalCount * 3);
    const starBaseColors = new Float32Array(totalCount * 3);
    const starBaseSizes = new Float32Array(totalCount);
    const starBaseIntensities = new Float32Array(totalCount);
    const starTwinkleSeeds = new Float32Array(totalCount);
    const starTwinkleSpeed = new Float32Array(totalCount); // Individual flicker speeds
    const starAbsorptionScales = new Float32Array(totalCount);
    const starOriginalPositions = new Float32Array(totalCount * 3);
    const starRippleOffsets = new Float32Array(totalCount * 3);
    const starMotionSeeds = new Float32Array(totalCount);
    const starTypes = new Float32Array(totalCount);

    // Create star texture
    const starTexture = this.createStarTexture();

    // Initialize star and dust properties
    for (let i = 0; i < totalCount; i++) {
      const i3 = i * 3;
      const isDust = i >= this.starCount; // Last entries are dust particles

      this.populateParticle(i, {
        isDust,
        positions: starPositions,
        basePositions: starOriginalPositions,
        colors: starColors,
        baseColors: starBaseColors,
        baseSizes: starBaseSizes,
        baseIntensities: starBaseIntensities,
        twinkleSeeds: starTwinkleSeeds,
        twinkleSpeeds: starTwinkleSpeed,
        absorption: starAbsorptionScales,
        rippleOffsets: starRippleOffsets,
        motionSeeds: starMotionSeeds,
        types: starTypes
      });
    }

    this.starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starGeometry.setAttribute('basePosition', new THREE.BufferAttribute(starOriginalPositions, 3));
    this.starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    this.starGeometry.setAttribute('baseColor', new THREE.BufferAttribute(starBaseColors, 3));
    this.starGeometry.setAttribute('baseSize', new THREE.BufferAttribute(starBaseSizes, 1));
    this.starGeometry.setAttribute('baseIntensity', new THREE.BufferAttribute(starBaseIntensities, 1));
    this.starGeometry.setAttribute('twinkleSeed', new THREE.BufferAttribute(starTwinkleSeeds, 1));
    this.starGeometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(starTwinkleSpeed, 1));
    this.starGeometry.setAttribute('absorptionScale', new THREE.BufferAttribute(starAbsorptionScales, 1));
    this.starGeometry.setAttribute('rippleOffset', new THREE.BufferAttribute(starRippleOffsets, 3));
    this.starGeometry.setAttribute('motionSeed', new THREE.BufferAttribute(starMotionSeeds, 1));
    this.starGeometry.setAttribute('isDust', new THREE.BufferAttribute(starTypes, 1));

    // Create shader material
    this.starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        starTexture: { value: starTexture },
        baseOpacity: { value: 1.0 },
        starIntensity: { value: 1.05 },
        pixelRatio: { value: Math.min(window.devicePixelRatio, this.qualityConfig.pixelRatioMax) },
        viewportHeight: { value: window.innerHeight },
        maxPointSize: { value: this.maxPointSize },
        flowStrength: { value: 0.25 }
      },
      vertexShader: `
        attribute float baseSize;
        attribute float twinkleSeed;
        attribute float twinkleSpeed;
        attribute float absorptionScale;
        attribute vec3 color;
        attribute vec3 rippleOffset;
        attribute float motionSeed;
        attribute float isDust;
        attribute float baseIntensity;

        uniform float time;
        uniform float baseOpacity;
        uniform float starIntensity;
        uniform float pixelRatio;
        uniform float viewportHeight;
        uniform float maxPointSize;
        uniform float flowStrength;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;

        void main() {
          float sparkleIntensity = clamp(baseIntensity, 0.35, 1.6);
          vColor = color * mix(0.85, 1.4, sparkleIntensity * 0.6);

          // Enhanced dynamic twinkle with individual speeds and intensities
          float twinkle1 = sin(time * twinkleSpeed * 1.5 * flowStrength + twinkleSeed) * 0.25;
          float twinkle2 = sin(time * twinkleSpeed * 2.3 * flowStrength + twinkleSeed * 1.7) * 0.15;
          float twinkle3 = sin(time * (0.35 + twinkleSpeed * 0.15) + twinkleSeed * 2.7) * 0.12;
          float twinkle = twinkle1 + twinkle2 + twinkle3 + 0.75; // Range: 0.33 to 1.27

          float sizeMultiplier = twinkle * absorptionScale * mix(0.8, 1.25, sparkleIntensity * 0.5);
          float brightnessMultiplier = twinkle * absorptionScale * starIntensity * mix(0.9, 1.45, sparkleIntensity * 0.7);

          // Apply ripple offset without mutating position buffer
          float swirl = sin(time * 0.18 * flowStrength + motionSeed * 4.0) * 0.6;
          vec3 flow = vec3(
            sin(time * 0.12 * flowStrength + motionSeed * 6.2831) * 2.5,
            cos(time * 0.1 * flowStrength + motionSeed * 3.7) * 2.0,
            sin(time * 0.15 * flowStrength + motionSeed * 2.1) * 1.8
          ) * flowStrength * mix(1.0, 0.35, isDust);

          vec3 warpedPos = position + rippleOffset + flow + vec3(swirl * 0.6, swirl * 0.2, 0.0);

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

  populateParticle(index, buffers) {
    const { isDust, positions, basePositions, colors, baseColors, baseSizes, baseIntensities, twinkleSeeds, twinkleSpeeds, absorption, rippleOffsets, motionSeeds, types } = buffers;
    const i3 = index * 3;

    // Position: weighted radial distribution to avoid sparse areas
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * (this.bounds.x * 0.95);
    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = (Math.sin(angle) * radius * 0.75) + (Math.random() - 0.5) * 25;
    positions[i3 + 2] = this.bounds.zFar + Math.random() * (this.bounds.zNear - this.bounds.zFar);

    basePositions[i3] = positions[i3];
    basePositions[i3 + 1] = positions[i3 + 1];
    basePositions[i3 + 2] = positions[i3 + 2];

    const paletteRoll = Math.random();
    let color;

    if (isDust) {
      // Dust: cool tones with wide alpha falloff
      color = new THREE.Color().setHSL(0.58 + Math.random() * 0.05, 0.2 + Math.random() * 0.3, 0.15 + Math.random() * 0.25);
      baseSizes[index] = 0.1 + Math.random() * 0.25;
      twinkleSpeeds[index] = 0.25 + Math.random() * 0.35;
      baseIntensities[index] = 0.35 + Math.random() * 0.35;
    } else {
      if (paletteRoll < 0.55) {
        color = new THREE.Color().setHSL(0.6 + Math.random() * 0.04, 0.35 + Math.random() * 0.25, 0.6 + Math.random() * 0.35); // blue-white
      } else if (paletteRoll < 0.8) {
        color = new THREE.Color().setHSL(0.1 + Math.random() * 0.03, 0.6 + Math.random() * 0.25, 0.65 + Math.random() * 0.25); // warm amber
      } else {
        color = new THREE.Color().setHSL(0.8 + Math.random() * 0.03, 0.4 + Math.random() * 0.2, 0.55 + Math.random() * 0.3); // magenta tint
      }

      const sizeRand = Math.random();
      if (sizeRand < 0.5) {
        baseSizes[index] = 0.2 + Math.random() * 0.5;
        baseIntensities[index] = 0.65 + Math.random() * 0.4;
      } else if (sizeRand < 0.82) {
        baseSizes[index] = 0.7 + Math.random() * 0.7;
        baseIntensities[index] = 0.9 + Math.random() * 0.5;
      } else if (sizeRand < 0.95) {
        baseSizes[index] = 1.4 + Math.random() * 0.8;
        baseIntensities[index] = 1.1 + Math.random() * 0.35;
      } else {
        baseSizes[index] = 2.2 + Math.random() * 1.0;
        baseIntensities[index] = 1.2 + Math.random() * 0.45;
      }

      twinkleSpeeds[index] = 0.75 + Math.random() * 1.4;
    }

    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    baseColors[i3] = color.r;
    baseColors[i3 + 1] = color.g;
    baseColors[i3 + 2] = color.b;

    twinkleSeeds[index] = Math.random() * 100.0;
    absorption[index] = 1.0;

    // Subtle depth bias for brighter stars
    if (!isDust && baseIntensities[index] > 1.1) {
      positions[i3 + 2] = positions[i3 + 2] + 6;
      basePositions[i3 + 2] = positions[i3 + 2];
    }

    rippleOffsets[i3] = 0;
    rippleOffsets[i3 + 1] = 0;
    rippleOffsets[i3 + 2] = 0;

    motionSeeds[index] = Math.random() * Math.PI * 2;
    types[index] = isDust ? 1.0 : 0.0;
  }

  regenerateParticle(index) {
    if (!this.starGeometry) return;

    this.populateParticle(index, {
      isDust: index >= this.starCount,
      positions: this.starGeometry.attributes.position.array,
      basePositions: this.starGeometry.attributes.basePosition.array,
      colors: this.starGeometry.attributes.color.array,
      baseColors: this.starGeometry.attributes.baseColor.array,
      baseSizes: this.starGeometry.attributes.baseSize.array,
      baseIntensities: this.starGeometry.attributes.baseIntensity.array,
      twinkleSeeds: this.starGeometry.attributes.twinkleSeed.array,
      twinkleSpeeds: this.starGeometry.attributes.twinkleSpeed.array,
      absorption: this.starGeometry.attributes.absorptionScale.array,
      rippleOffsets: this.starGeometry.attributes.rippleOffset.array,
      motionSeeds: this.starGeometry.attributes.motionSeed.array,
      types: this.starGeometry.attributes.isDust.array
    });

    this.starGeometry.attributes.position.needsUpdate = true;
    this.starGeometry.attributes.basePosition.needsUpdate = true;
    this.starGeometry.attributes.color.needsUpdate = true;
    this.starGeometry.attributes.baseColor.needsUpdate = true;
    this.starGeometry.attributes.baseSize.needsUpdate = true;
    this.starGeometry.attributes.twinkleSeed.needsUpdate = true;
    this.starGeometry.attributes.twinkleSpeed.needsUpdate = true;
    this.starGeometry.attributes.absorptionScale.needsUpdate = true;
    this.starGeometry.attributes.baseIntensity.needsUpdate = true;
    this.starGeometry.attributes.rippleOffset.needsUpdate = true;
    this.starGeometry.attributes.motionSeed.needsUpdate = true;
    this.starGeometry.attributes.isDust.needsUpdate = true;
  }

  getBounds() {
    return this.bounds;
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
    this.starField.rotation.x += 0.00005;
    this.starField.rotation.y += 0.000075;
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
