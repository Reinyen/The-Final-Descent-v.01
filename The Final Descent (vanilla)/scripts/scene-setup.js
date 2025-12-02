import * as THREE from 'three';
import { PostProcessing } from './post-processing.js';
import { Starfield } from './starfield.js';
import { Comet } from './comet.js';
import { BlackHole } from './black-hole.js';
import { ParticleSystem } from './particles.js';
import { StarPhysics } from './physics.js';

const QUALITY_CONFIGS = {
  high: {
    particleScale: 1.0,
    bloomStrengthScale: 1.0,
    pixelRatioMax: 2.0,
    enableGlassParticles: true
  },
  low: {
    particleScale: 0.5,
    bloomStrengthScale: 0.7,
    pixelRatioMax: 1.5,
    enableGlassParticles: false
  }
};

export class IntroScene {
  constructor(quality, debugMode) {
    this.quality = quality;
    this.debugMode = debugMode;
    this.qualityConfig = QUALITY_CONFIGS[quality];

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = null;

    this.postProcessing = null;
    this.starfield = null;
    this.comet = null;
    this.blackHole = null;
    this.particleSystem = null;
    this.starPhysics = null;

    this.cameraBasePosition = new THREE.Vector3(0, 0, 30);
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  async init() {
    console.log('[IntroScene] Initializing...');

    // Create scene
    this.scene = new THREE.Scene();

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.cameraBasePosition);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.qualityConfig.pixelRatioMax));
    this.renderer.setClearColor(0x000000);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Get device max point size
    const gl = this.renderer.getContext();
    const maxPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
    console.log('[IntroScene] Device max point size:', maxPointSize);

    // Add canvas to container
    const container = document.getElementById('canvas-container');
    container.appendChild(this.renderer.domElement);

    // Create clock
    this.clock = new THREE.Clock();

    // Initialize post-processing
    this.postProcessing = new PostProcessing(
      this.renderer,
      this.scene,
      this.camera,
      this.qualityConfig
    );

    // Initialize starfield
    this.starfield = new Starfield(this.qualityConfig, maxPointSize);
    this.scene.add(this.starfield.getMesh());

    // Initialize comet
    this.comet = new Comet();
    this.scene.add(this.comet.getMesh());

    // Initialize black hole
    this.blackHole = new BlackHole();
    this.scene.add(this.blackHole.getGroup());

    // Initialize particle system
    this.particleSystem = new ParticleSystem(
      this.qualityConfig,
      maxPointSize,
      this.blackHole.getPosition()
    );
    this.scene.add(this.particleSystem.getMesh());

    // Initialize star physics
    this.starPhysics = new StarPhysics(
      this.starfield.getGeometry(),
      this.blackHole.getPosition()
    );

    console.log('[IntroScene] Initialization complete');
  }

  updateStarfield(phase, elapsedTime) {
    this.starfield.update(phase, elapsedTime);
  }

  updateComet(phase, elapsedTime) {
    this.comet.update(phase, elapsedTime);
  }

  updateCamera(phase, elapsedTime) {
    // Camera shake during impact
    if (phase.name === 'impact' && !this.prefersReducedMotion) {
      const timeSinceImpact = elapsedTime - phase.phaseStart;
      const shake = this.getCameraShake(timeSinceImpact);

      this.camera.position.set(
        this.cameraBasePosition.x + shake.x,
        this.cameraBasePosition.y + shake.y,
        this.cameraBasePosition.z
      );
    } else {
      this.camera.position.copy(this.cameraBasePosition);
    }
  }

  getCameraShake(timeSinceImpact) {
    if (timeSinceImpact < 0 || timeSinceImpact > 0.5) {
      return { x: 0, y: 0 };
    }

    const amplitude = 0.8 * Math.exp(-timeSinceImpact * 10);
    const shake1 = Math.sin(timeSinceImpact * 17.3);
    const shake2 = Math.sin(timeSinceImpact * 23.7);
    const shake3 = Math.sin(timeSinceImpact * 31.1);

    return {
      x: amplitude * (shake1 * 0.5 + shake2 * 0.3 + shake3 * 0.2),
      y: amplitude * (shake2 * 0.5 + shake1 * 0.3 + shake3 * 0.2) * 0.625
    };
  }

  updateParticles(phase, elapsedTime, deltaTime) {
    this.particleSystem.update(phase, elapsedTime, deltaTime);
  }

  updateBlackHole(phase, elapsedTime) {
    this.blackHole.update(phase, elapsedTime, this.camera);
  }

  updateStarPhysics(phase, elapsedTime, deltaTime) {
    this.starPhysics.update(phase, elapsedTime, deltaTime);
  }

  updatePostProcessing(phase, elapsedTime) {
    this.postProcessing.update(phase, elapsedTime);
  }

  render(phase, elapsedTime) {
    this.postProcessing.render();
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.postProcessing.handleResize();
    this.starfield.handleResize();
  }

  destroy() {
    console.log('[IntroScene] Destroying...');

    if (this.starfield) this.starfield.destroy();
    if (this.comet) this.comet.destroy();
    if (this.blackHole) this.blackHole.destroy();
    if (this.particleSystem) this.particleSystem.destroy();
    if (this.postProcessing) this.postProcessing.destroy();

    if (this.renderer) {
      const container = document.getElementById('canvas-container');
      if (container && this.renderer.domElement) {
        container.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }

    console.log('[IntroScene] Destroyed');
  }
}
