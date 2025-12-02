/**
 * Roster Scene (Three.js Layer A)
 * Handles 3D rendering: starfield, particles, reroll effects, cinematic transitions
 * Per GDD §3.1: Visual-only layer, no input capture
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class RosterScene {
  constructor(quality = 'high') {
    this.quality = quality;
    this.container = document.getElementById('roster-canvas-container');

    // Three.js core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.clock = new THREE.Clock();

    // Scene objects
    this.starfield = null;
    this.globalParticles = null;

    // Quality settings per GDD §13
    this.qualityConfig = {
      high: { starCount: 2500, dustCount: 800, bloom: 0.35 },
      medium: { starCount: 1500, dustCount: 480, bloom: 0.25 },
      low: { starCount: 750, dustCount: 240, bloom: 0.15 }
    };

    this.config = this.qualityConfig[quality] || this.qualityConfig.high;

    console.log('[RosterScene] Initializing with quality:', quality, this.config);
  }

  /**
   * Initialize Three.js scene
   */
  async init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 10);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });

    // Cap pixel ratio per GDD §13
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);

    // Setup post-processing
    this.setupPostProcessing();

    // Create scene objects
    this.createStarfield();
    this.createGlobalParticles();

    // Setup resize handler
    window.addEventListener('resize', () => this.handleResize());

    console.log('[RosterScene] Initialization complete');
  }

  /**
   * Setup post-processing pipeline
   * Per GDD §13: Bloom with quality-based strength
   */
  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);

    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom pass
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.config.bloom, // Strength
      0.4, // Radius
      0.85 // Threshold
    );
    this.composer.addPass(bloomPass);

    // Output pass
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  /**
   * Create starfield
   * Per GDD §12: Subtle stardust drifting downward
   */
  createStarfield() {
    const starCount = this.config.starCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      // Position stars in a large volume
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = (Math.random() - 0.5) * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 50 - 20; // Behind camera

      // Star colors (mostly white with slight tint)
      const tint = Math.random();
      if (tint < 0.1) {
        // Purple tint
        colors[i3] = 0.9 + Math.random() * 0.1;
        colors[i3 + 1] = 0.6 + Math.random() * 0.2;
        colors[i3 + 2] = 1.0;
      } else if (tint < 0.2) {
        // Teal tint
        colors[i3] = 0.6 + Math.random() * 0.2;
        colors[i3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i3 + 2] = 0.8 + Math.random() * 0.2;
      } else {
        // White
        colors[i3] = 0.9 + Math.random() * 0.1;
        colors[i3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i3 + 2] = 0.9 + Math.random() * 0.1;
      }

      // Size variation
      sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Shader material for stars
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - (dist * 2.0);
          alpha = smoothstep(0.0, 1.0, alpha);

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.starfield = new THREE.Points(geometry, material);
    this.scene.add(this.starfield);
  }

  /**
   * Create global particles
   * Per GDD §12: Stardust drifting downward
   */
  createGlobalParticles() {
    const dustCount = this.config.dustCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(dustCount * 3);
    const velocities = new Float32Array(dustCount * 3);
    const lifetimes = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;

      // Random positions
      positions[i3] = (Math.random() - 0.5) * 60;
      positions[i3 + 1] = (Math.random() - 0.5) * 60 + 20; // Start higher
      positions[i3 + 2] = (Math.random() - 0.5) * 30;

      // Downward drift with slight horizontal variation
      velocities[i3] = (Math.random() - 0.5) * 0.5;
      velocities[i3 + 1] = -Math.random() * 1.5 - 0.5; // Downward
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;

      lifetimes[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xE8F4FD,
      size: 1.5,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.globalParticles = new THREE.Points(geometry, material);
    this.scene.add(this.globalParticles);
  }

  /**
   * Update scene
   * @param {number} deltaTime - Time since last frame
   */
  update(deltaTime) {
    const elapsedTime = this.clock.getElapsedTime();

    // Update starfield time uniform
    if (this.starfield && this.starfield.material.uniforms.time) {
      this.starfield.material.uniforms.time.value = elapsedTime;
    }

    // Update global particles (drift downward)
    if (this.globalParticles) {
      const positions = this.globalParticles.geometry.attributes.position.array;
      const velocities = this.globalParticles.geometry.attributes.velocity.array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * deltaTime;
        positions[i + 1] += velocities[i + 1] * deltaTime;
        positions[i + 2] += velocities[i + 2] * deltaTime;

        // Reset particles that go too far down
        if (positions[i + 1] < -30) {
          positions[i] = (Math.random() - 0.5) * 60;
          positions[i + 1] = 30 + Math.random() * 20;
          positions[i + 2] = (Math.random() - 0.5) * 30;
        }
      }

      this.globalParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Slowly rotate starfield
    if (this.starfield) {
      this.starfield.rotation.y += 0.0001;
    }
  }

  /**
   * Render scene
   */
  render() {
    if (this.composer) {
      this.composer.render();
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  /**
   * Get camera (for transition)
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Get scene (for transition)
   */
  getScene() {
    return this.scene;
  }

  /**
   * Destroy and clean up
   */
  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    console.log('[RosterScene] Destroyed');
  }
}
