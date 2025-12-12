import * as THREE from 'three';

/**
 * Map Background Scene
 * Creates a Three.js background with starfield and glass sphere
 * Matches the visual quality of the Intro UI black hole
 */
export class MapBackground {
  constructor(container) {
    this.container = container;

    // Single scene with both starfield and glass sphere
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.starfield = null;
    this.glassSphere = null;
    this.reflectionCamera = null;
    this.reflectionTarget = null;

    // Render target for fish-eye distortion
    this.backgroundRenderTarget = null;

    this.animationFrameId = null;
    this.elapsedTime = 0;
    this.clock = new THREE.Clock();

    this.starCount = 2000;
    this.dustCount = 1000;

    // Diagonal axis for planetary rotation (top-right to bottom-left)
    this.sphereRotationAxis = new THREE.Vector3(1, 1, 0).normalize();

    this.init();
  }

  init() {
    // Create single scene for both starfield and glass sphere (positioned in map area only)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02030a); // Dark background, matches page

    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 50);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false // Opaque background to match dark theme
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Create render target for background (for fish-eye distortion)
    this.backgroundRenderTarget = new THREE.WebGLRenderTarget(
      this.container.clientWidth,
      this.container.clientHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
      }
    );

    // Create starfield (will be behind glass sphere in same scene)
    this.createStarfield();

    // Create glass sphere (will be in front of starfield in same scene)
    this.createGlassSphere();

    // Setup window resize
    this.setupResize();

    // Start animation
    this.animate();

    console.log('[MapBackground] Initialized with starfield and glass sphere in map area');
  }

  createStarfield() {
    const totalCount = this.starCount + this.dustCount;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(totalCount * 3);
    const colors = new Float32Array(totalCount * 3);
    const sizes = new Float32Array(totalCount);
    const intensities = new Float32Array(totalCount);
    const twinkleSeeds = new Float32Array(totalCount);
    const twinkleSpeeds = new Float32Array(totalCount);

    const bounds = {
      x: 300,
      y: 225,
      zNear: -20,
      zFar: -250
    };

    for (let i = 0; i < totalCount; i++) {
      const i3 = i * 3;
      const isDust = i >= this.starCount;

      // Position with parallax depth
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * bounds.x * 0.95;
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = (Math.sin(angle) * radius * 0.75) + (Math.random() - 0.5) * 15;
      positions[i3 + 2] = bounds.zFar + Math.random() * (bounds.zNear - bounds.zFar);

      // Color variation
      const paletteRoll = Math.random();
      let color;

      if (isDust) {
        // Dust: cool tones with low brightness
        color = new THREE.Color().setHSL(0.58 + Math.random() * 0.05, 0.3 + Math.random() * 0.4, 0.25 + Math.random() * 0.35);
        sizes[i] = 0.3 + Math.random() * 0.4;
        twinkleSpeeds[i] = 0.25 + Math.random() * 0.35;
        intensities[i] = 0.5 + Math.random() * 0.5;
      } else {
        // Stars: blue-white, warm amber, or magenta - BRIGHTER
        if (paletteRoll < 0.55) {
          color = new THREE.Color().setHSL(0.6 + Math.random() * 0.04, 0.4 + Math.random() * 0.3, 0.75 + Math.random() * 0.25);
        } else if (paletteRoll < 0.8) {
          color = new THREE.Color().setHSL(0.1 + Math.random() * 0.03, 0.7 + Math.random() * 0.2, 0.75 + Math.random() * 0.2);
        } else {
          color = new THREE.Color().setHSL(0.8 + Math.random() * 0.03, 0.5 + Math.random() * 0.2, 0.7 + Math.random() * 0.25);
        }

        // Varying sizes for depth - LARGER
        const sizeRand = Math.random();
        if (sizeRand < 0.5) {
          sizes[i] = 0.4 + Math.random() * 0.6;
          intensities[i] = 0.8 + Math.random() * 0.5;
        } else if (sizeRand < 0.82) {
          sizes[i] = 1.0 + Math.random() * 0.8;
          intensities[i] = 1.1 + Math.random() * 0.6;
        } else if (sizeRand < 0.95) {
          sizes[i] = 1.8 + Math.random() * 1.0;
          intensities[i] = 1.3 + Math.random() * 0.5;
        } else {
          sizes[i] = 2.8 + Math.random() * 1.5;
          intensities[i] = 1.5 + Math.random() * 0.6;
        }

        twinkleSpeeds[i] = 0.75 + Math.random() * 1.4;
      }

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      twinkleSeeds[i] = Math.random() * 100.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
    geometry.setAttribute('twinkleSeed', new THREE.BufferAttribute(twinkleSeeds, 1));
    geometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1));

    // Create star texture
    const starTexture = this.createStarTexture();

    // Shader material for twinkling stars with parallax
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        starTexture: { value: starTexture },
        pixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute float intensity;
        attribute float twinkleSeed;
        attribute float twinkleSpeed;
        attribute vec3 color;

        uniform float time;
        uniform float pixelRatio;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color * mix(1.2, 1.8, intensity * 0.6);

          // Twinkling animation
          float twinkle1 = sin(time * twinkleSpeed * 1.5 + twinkleSeed) * 0.3;
          float twinkle2 = sin(time * twinkleSpeed * 2.3 + twinkleSeed * 1.7) * 0.2;
          float twinkle3 = sin(time * 0.5 + twinkleSeed * 2.7) * 0.15;
          float twinkle = twinkle1 + twinkle2 + twinkle3 + 0.85;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float viewDistance = -mvPosition.z;

          // Depth cueing for parallax
          float depthFactor = 1.0 - (viewDistance - 20.0) / 80.0;
          depthFactor = clamp(depthFactor, 0.6, 1.0);

          // Much larger stars for visibility
          gl_PointSize = size * twinkle * depthFactor * pixelRatio * 8.0;
          vAlpha = clamp(intensity * twinkle * depthFactor * 1.5, 0.0, 1.0);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D starTexture;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec4 texColor = texture2D(starTexture, gl_PointCoord);

          float dist = length(gl_PointCoord - vec2(0.5));
          float coreBrightness = smoothstep(0.5, 0.0, dist);

          vec3 finalColor = vColor * (0.9 + coreBrightness * 0.1);
          float finalAlpha = texColor.a * vAlpha;

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);

    console.log(`[MapBackground] Created starfield with ${this.starCount} stars and ${this.dustCount} dust particles`);
  }

  createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const center = 64;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.1, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return texture;
  }

  createGlassSphere() {
    const group = new THREE.Group();

    // Add ambient light for glass to reflect
    const ambientLight = new THREE.AmbientLight(0x8a7cff, 0.3);
    this.scene.add(ambientLight);

    // Add point light for highlights
    const pointLight = new THREE.PointLight(0xe8f4fd, 0.5, 100);
    pointLight.position.set(10, 10, 30);
    this.scene.add(pointLight);

    // Create reflection environment for glass material
    this.reflectionTarget = new THREE.WebGLCubeRenderTarget(256, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter
    });
    this.reflectionCamera = new THREE.CubeCamera(1, 400, this.reflectionTarget);
    group.add(this.reflectionCamera);

    // Glass sphere with custom fish-eye distortion shader
    const sphereGeometry = new THREE.SphereGeometry(18, 64, 64);
    const glassMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        backgroundTexture: { value: this.backgroundRenderTarget.texture },
        envMap: { value: this.reflectionTarget.texture },
        resolution: { value: new THREE.Vector2(this.container.clientWidth, this.container.clientHeight) },
        sphereCenter: { value: new THREE.Vector3(0, 0, 0) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying vec4 vScreenPos;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Screen space position for texture sampling
          vScreenPos = gl_Position;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform sampler2D backgroundTexture;
        uniform samplerCube envMap;
        uniform vec2 resolution;
        uniform vec3 sphereCenter;

        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying vec4 vScreenPos;

        void main() {
          // Convert screen position to UV coordinates
          vec2 screenUV = (vScreenPos.xy / vScreenPos.w) * 0.5 + 0.5;

          // Calculate distance from sphere center for fish-eye effect
          vec2 center = vec2(0.5, 0.5);
          vec2 offset = screenUV - center;
          float dist = length(offset);

          // Barrel distortion - EXTREME bulge at center for 3D spherical look
          float k1 = 0.8; // Radial distortion coefficient
          float k2 = 0.4; // Quadratic distortion coefficient
          float r2 = dist * dist;
          float distortionFactor = 1.0 + k1 * r2 + k2 * r2 * r2;

          // Inward distortion (magnification at center, like looking through a sphere)
          vec2 distortedUV = center + offset / distortionFactor;

          // Sample background with fish-eye distortion
          vec4 background = texture2D(backgroundTexture, distortedUV);

          // Fresnel effect for glass edges
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - abs(dot(viewDirection, vNormal)), 2.5);

          // Purple tint and glow
          vec3 glassColor = vec3(0.75, 0.72, 1.0);
          vec3 glassGlow = glassColor * fresnel * 0.4;

          // Environment reflection
          vec3 reflected = reflect(-viewDirection, vNormal);
          vec4 envColor = textureCube(envMap, reflected);

          // Combine: distorted background + glass glow + reflections
          vec3 finalColor = background.rgb * 0.15 + glassGlow + envColor.rgb * 0.3;

          // Glass opacity - 90% base opacity with slight variation
          float alpha = 0.90 + fresnel * 0.10;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false
    });

    const glassMesh = new THREE.Mesh(sphereGeometry, glassMaterial);
    glassMesh.renderOrder = 1;
    this.glassMaterial = glassMaterial; // Store reference for updates
    group.add(glassMesh);

    // Inner core with brighter glow (visible through glass)
    const coreGeometry = new THREE.SphereGeometry(17, 32, 32);
    const coreMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Rotating energy patterns
          float angle = atan(vPosition.y, vPosition.x);
          float spiral1 = sin(angle * 5.0 + time * 0.5) * 0.5 + 0.5;
          float spiral2 = sin(angle * 3.0 - time * 0.3) * 0.5 + 0.5;

          // Depth-based intensity
          float depth = length(vPosition) / 17.0;

          // Fresnel-like edge glow
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = 1.0 - abs(dot(viewDirection, vNormal));
          fresnel = pow(fresnel, 2.5);

          vec3 purpleGlow = vec3(0.6, 0.49, 1.0);
          float intensity = fresnel * 0.2 + (spiral1 * 0.08) + (spiral2 * 0.05);

          gl_FragColor = vec4(purpleGlow * intensity, intensity * 0.6);
        }
      `
    });

    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    coreMesh.renderOrder = 0;
    group.add(coreMesh);

    // Outer glow ring for visibility
    const glowGeometry = new THREE.SphereGeometry(19, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        // Simple noise function for electric crackling
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);

          vec3 glowColor = vec3(0.54, 0.49, 1.0);
          float pulse = sin(time * 0.5) * 0.1 + 0.9;

          // Electric crackling effect (every 2-8 seconds)
          float crackleFreq = 0.15; // Roughly every 6.67 seconds on average
          float cracklePhase = fract(time * crackleFreq);
          float crackleTime = time * 5.0;

          // Create bursts of crackling
          float burstTrigger = smoothstep(0.9, 1.0, cracklePhase) * smoothstep(0.1, 0.0, cracklePhase);

          // Electric arc patterns using noise
          vec2 noiseCoord = vNormal.xy * 8.0 + vec2(crackleTime * 2.0, crackleTime * 1.5);
          float crackle = noise(noiseCoord) * noise(noiseCoord * 2.3);
          crackle = pow(crackle, 3.0); // Sharp electric arcs

          // Combine crackle with burst timing
          float electricEffect = crackle * burstTrigger * 0.8;

          float intensity = fresnel * 0.15 * pulse + electricEffect;
          vec3 finalColor = glowColor * (1.0 + electricEffect * 2.0); // Brighten during crackles

          gl_FragColor = vec4(finalColor * intensity, intensity * 0.4);
        }
      `
    });

    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.renderOrder = -1;
    group.add(glowMesh);

    this.glassSphere = group;
    this.scene.add(this.glassSphere);

    console.log('[MapBackground] Created glass sphere with reflection, inner glow, and outer aura');
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    this.elapsedTime += delta;

    // Update starfield twinkling
    if (this.starfield) {
      this.starfield.material.uniforms.time.value = this.elapsedTime;

      // Slow rotation for parallax effect
      this.starfield.rotation.x += 0.00005;
      this.starfield.rotation.y += 0.000075;
    }

    // Update glass sphere rotation (planetary rotation with tilted axis)
    if (this.glassSphere) {
      // Rotate around diagonal axis (top-right to bottom-left) like a planet
      this.glassSphere.rotateOnAxis(this.sphereRotationAxis, delta * 0.1);

      // Update shader time uniforms for all children
      this.glassSphere.children.forEach(child => {
        if (child.material && child.material.uniforms && child.material.uniforms.time) {
          child.material.uniforms.time.value = this.elapsedTime;
        }
      });

      // Update reflection camera
      if (this.reflectionCamera) {
        // Hide glass mesh from its own reflection
        const glassMesh = this.glassSphere.children.find(child =>
          child.material && child.material.uniforms && child.material.uniforms.backgroundTexture
        );
        if (glassMesh) {
          glassMesh.visible = false;
          this.reflectionCamera.update(this.renderer, this.scene);
          glassMesh.visible = true;
        }
      }

      // Render background to texture for fish-eye distortion
      if (this.backgroundRenderTarget && this.glassMaterial) {
        // Hide glass sphere temporarily
        this.glassSphere.visible = false;

        // Render just the starfield to the background texture
        this.renderer.setRenderTarget(this.backgroundRenderTarget);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);

        // Show glass sphere again
        this.glassSphere.visible = true;

        // Update the glass material's background texture
        this.glassMaterial.uniforms.backgroundTexture.value = this.backgroundRenderTarget.texture;
        this.glassMaterial.uniforms.time.value = this.elapsedTime;
      }
    }

    // Render the final scene
    this.renderer.render(this.scene, this.camera);
  }

  setupResize() {
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    if (!this.container || !this.camera || !this.renderer) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    // Update background render target size
    if (this.backgroundRenderTarget) {
      this.backgroundRenderTarget.setSize(width, height);
    }

    // Update resolution uniform
    if (this.glassMaterial && this.glassMaterial.uniforms.resolution) {
      this.glassMaterial.uniforms.resolution.value.set(width, height);
    }
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.starfield) {
      this.starfield.geometry.dispose();
      this.starfield.material.dispose();
    }

    if (this.glassSphere) {
      this.glassSphere.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    if (this.reflectionTarget) {
      this.reflectionTarget.dispose();
    }

    if (this.backgroundRenderTarget) {
      this.backgroundRenderTarget.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    window.removeEventListener('resize', this.handleResize);

    console.log('[MapBackground] Disposed');
  }
}
