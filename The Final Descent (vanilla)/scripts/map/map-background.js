import * as THREE from 'three';

/**
 * Map Background Scene
 * Creates a Three.js background with starfield and glass sphere
 * Matches the visual quality of the Intro UI black hole
 */
export class MapBackground {
  constructor(starfieldContainer, glassSphereContainer) {
    this.starfieldContainer = starfieldContainer;
    this.glassSphereContainer = glassSphereContainer;

    // Starfield scene
    this.starfieldScene = null;
    this.starfieldCamera = null;
    this.starfieldRenderer = null;
    this.starfield = null;

    // Glass sphere scene
    this.glassScene = null;
    this.glassCamera = null;
    this.glassRenderer = null;
    this.glassSphere = null;
    this.reflectionCamera = null;
    this.reflectionTarget = null;

    this.animationFrameId = null;
    this.elapsedTime = 0;
    this.clock = new THREE.Clock();

    this.starCount = 1000;
    this.dustCount = 500;

    this.init();
  }

  init() {
    // Create starfield scene
    this.starfieldScene = new THREE.Scene();
    this.starfieldScene.background = new THREE.Color(0x02030a); // Match map background

    const starfieldAspect = this.starfieldContainer.clientWidth / this.starfieldContainer.clientHeight;
    this.starfieldCamera = new THREE.PerspectiveCamera(50, starfieldAspect, 0.1, 1000);
    this.starfieldCamera.position.set(0, 0, 50);
    this.starfieldCamera.lookAt(0, 0, 0);

    this.starfieldRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.starfieldRenderer.setSize(this.starfieldContainer.clientWidth, this.starfieldContainer.clientHeight);
    this.starfieldRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.starfieldContainer.appendChild(this.starfieldRenderer.domElement);

    // Create glass sphere scene
    this.glassScene = new THREE.Scene();
    // Transparent background so starfield shows through
    this.glassScene.background = null;

    const glassAspect = this.glassSphereContainer.clientWidth / this.glassSphereContainer.clientHeight;
    this.glassCamera = new THREE.PerspectiveCamera(50, glassAspect, 0.1, 1000);
    this.glassCamera.position.set(0, 0, 50);
    this.glassCamera.lookAt(0, 0, 0);

    this.glassRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true // Transparent background
    });
    this.glassRenderer.setSize(this.glassSphereContainer.clientWidth, this.glassSphereContainer.clientHeight);
    this.glassRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.glassSphereContainer.appendChild(this.glassRenderer.domElement);

    // Create starfield
    this.createStarfield();

    // Create glass sphere
    this.createGlassSphere();

    // Setup window resize
    this.setupResize();

    // Start animation
    this.animate();

    console.log('[MapBackground] Initialized with starfield and glass sphere in separate layers');
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
      x: 120,
      y: 90,
      zNear: -20,
      zFar: -100
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
        color = new THREE.Color().setHSL(0.58 + Math.random() * 0.05, 0.2 + Math.random() * 0.3, 0.15 + Math.random() * 0.25);
        sizes[i] = 0.1 + Math.random() * 0.25;
        twinkleSpeeds[i] = 0.25 + Math.random() * 0.35;
        intensities[i] = 0.35 + Math.random() * 0.35;
      } else {
        // Stars: blue-white, warm amber, or magenta
        if (paletteRoll < 0.55) {
          color = new THREE.Color().setHSL(0.6 + Math.random() * 0.04, 0.35 + Math.random() * 0.25, 0.6 + Math.random() * 0.35);
        } else if (paletteRoll < 0.8) {
          color = new THREE.Color().setHSL(0.1 + Math.random() * 0.03, 0.6 + Math.random() * 0.25, 0.65 + Math.random() * 0.25);
        } else {
          color = new THREE.Color().setHSL(0.8 + Math.random() * 0.03, 0.4 + Math.random() * 0.2, 0.55 + Math.random() * 0.3);
        }

        // Varying sizes for depth
        const sizeRand = Math.random();
        if (sizeRand < 0.5) {
          sizes[i] = 0.2 + Math.random() * 0.5;
          intensities[i] = 0.65 + Math.random() * 0.4;
        } else if (sizeRand < 0.82) {
          sizes[i] = 0.7 + Math.random() * 0.7;
          intensities[i] = 0.9 + Math.random() * 0.5;
        } else if (sizeRand < 0.95) {
          sizes[i] = 1.4 + Math.random() * 0.8;
          intensities[i] = 1.1 + Math.random() * 0.35;
        } else {
          sizes[i] = 2.2 + Math.random() * 1.0;
          intensities[i] = 1.2 + Math.random() * 0.45;
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
          vColor = color * mix(0.85, 1.4, intensity * 0.6);

          // Twinkling animation
          float twinkle1 = sin(time * twinkleSpeed * 1.5 + twinkleSeed) * 0.25;
          float twinkle2 = sin(time * twinkleSpeed * 2.3 + twinkleSeed * 1.7) * 0.15;
          float twinkle3 = sin(time * 0.5 + twinkleSeed * 2.7) * 0.12;
          float twinkle = twinkle1 + twinkle2 + twinkle3 + 0.75;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float viewDistance = -mvPosition.z;

          // Depth cueing for parallax
          float depthFactor = 1.0 - (viewDistance - 20.0) / 80.0;
          depthFactor = clamp(depthFactor, 0.6, 1.0);

          gl_PointSize = size * twinkle * depthFactor * pixelRatio * 3.0;
          vAlpha = clamp(intensity * twinkle * depthFactor, 0.0, 1.0);

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
    this.starfieldScene.add(this.starfield);

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

    // Create reflection environment for glass material
    this.reflectionTarget = new THREE.WebGLCubeRenderTarget(256, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter
    });
    this.reflectionCamera = new THREE.CubeCamera(1, 400, this.reflectionTarget);
    group.add(this.reflectionCamera);

    // Glass sphere - matches intro black hole event horizon
    const sphereGeometry = new THREE.SphereGeometry(25, 64, 64);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      transmission: 0.9,
      transparent: true,
      opacity: 0.95,
      roughness: 0.05,
      metalness: 0.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      thickness: 2.5,
      envMap: this.reflectionTarget.texture,
      envMapIntensity: 1.6,
      ior: 1.25,
      color: new THREE.Color(0x8a7cff), // Purple tint to match map halo
      side: THREE.FrontSide
    });

    const glassMesh = new THREE.Mesh(sphereGeometry, glassMaterial);
    glassMesh.renderOrder = -1;
    group.add(glassMesh);

    // Inner core with subtle glow (visible through glass)
    const coreGeometry = new THREE.SphereGeometry(24, 32, 32);
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
          // Subtle rotating energy patterns
          float angle = atan(vPosition.y, vPosition.x);
          float spiral = sin(angle * 5.0 + time * 0.5) * 0.5 + 0.5;

          // Fresnel-like edge glow
          vec3 viewDirection = normalize(cameraPosition - vPosition);
          float fresnel = 1.0 - abs(dot(viewDirection, vNormal));
          fresnel = pow(fresnel, 2.0);

          vec3 purpleGlow = vec3(0.54, 0.49, 1.0);
          float intensity = fresnel * 0.15 + spiral * 0.05;

          gl_FragColor = vec4(purpleGlow * intensity, intensity * 0.8);
        }
      `
    });

    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(coreMesh);

    this.glassSphere = group;
    this.glassScene.add(this.glassSphere);

    console.log('[MapBackground] Created glass sphere with reflection and inner glow');
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

    // Update glass sphere rotation (like black hole)
    if (this.glassSphere) {
      this.glassSphere.rotation.z = this.elapsedTime * 0.1;

      // Update inner core time uniform
      const coreMesh = this.glassSphere.children.find(child => child.material && child.material.uniforms && child.material.uniforms.time);
      if (coreMesh) {
        coreMesh.material.uniforms.time.value = this.elapsedTime;
      }

      // Update reflection camera
      if (this.reflectionCamera) {
        this.glassSphere.children[0].visible = false; // Hide glass sphere from reflection
        this.reflectionCamera.update(this.glassRenderer, this.glassScene);
        this.glassSphere.children[0].visible = true;
      }
    }

    // Render both scenes
    this.starfieldRenderer.render(this.starfieldScene, this.starfieldCamera);
    this.glassRenderer.render(this.glassScene, this.glassCamera);
  }

  setupResize() {
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    // Resize starfield
    if (this.starfieldContainer && this.starfieldCamera && this.starfieldRenderer) {
      const starWidth = this.starfieldContainer.clientWidth;
      const starHeight = this.starfieldContainer.clientHeight;

      this.starfieldCamera.aspect = starWidth / starHeight;
      this.starfieldCamera.updateProjectionMatrix();

      this.starfieldRenderer.setSize(starWidth, starHeight);
    }

    // Resize glass sphere
    if (this.glassSphereContainer && this.glassCamera && this.glassRenderer) {
      const glassWidth = this.glassSphereContainer.clientWidth;
      const glassHeight = this.glassSphereContainer.clientHeight;

      this.glassCamera.aspect = glassWidth / glassHeight;
      this.glassCamera.updateProjectionMatrix();

      this.glassRenderer.setSize(glassWidth, glassHeight);
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

    if (this.starfieldRenderer) {
      this.starfieldRenderer.dispose();
      if (this.starfieldRenderer.domElement && this.starfieldRenderer.domElement.parentNode) {
        this.starfieldRenderer.domElement.parentNode.removeChild(this.starfieldRenderer.domElement);
      }
    }

    if (this.glassRenderer) {
      this.glassRenderer.dispose();
      if (this.glassRenderer.domElement && this.glassRenderer.domElement.parentNode) {
        this.glassRenderer.domElement.parentNode.removeChild(this.glassRenderer.domElement);
      }
    }

    window.removeEventListener('resize', this.handleResize);

    console.log('[MapBackground] Disposed');
  }
}
