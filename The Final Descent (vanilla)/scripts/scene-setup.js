import * as THREE from 'three';
import { PostProcessing } from './post-processing.js';
import { Starfield } from './starfield.js';
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

    // Add lighting for reflective materials
    const ambientLight = new THREE.AmbientLight(0x404060, 0.8);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x8080ff, 0.5);
    directionalLight.position.set(5, 10, 7.5);
    this.scene.add(directionalLight);

    const rimLight = new THREE.DirectionalLight(0xff80ff, 0.3);
    rimLight.position.set(-5, -5, -10);
    this.scene.add(rimLight);

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
    const starfieldMesh = this.starfield.getMesh();
    this.scene.add(starfieldMesh);

    // Initialize black hole (default layer 0 - not affected by lensing)
    this.blackHole = new BlackHole(this.renderer, this.scene);
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
      this.starfield,
      this.blackHole,
      this.scene
    );

    console.log('[IntroScene] Initialization complete');
  }

  updateStarfield(phase, elapsedTime) {
    this.starfield.update(phase, elapsedTime);
  }

  updateCamera(phase, elapsedTime) {
    // Keep camera at base position (custom camera logic can be added during placeholder_content phase)
    this.camera.position.copy(this.cameraBasePosition);
  }

  updateParticles(phase, elapsedTime, deltaTime) {
    this.particleSystem.update(phase, elapsedTime, deltaTime);
  }

  updateBlackHole(phase, elapsedTime) {
    // Show black hole after placeholder content completes
    if (phase.name === 'ui_reveal' || phase.name === 'complete') {
      this.blackHole.getGroup().visible = true;
    } else {
      this.blackHole.getGroup().visible = false;
    }

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

  getCamera() {
    return this.camera;
  }

  getStarfield() {
    return this.starfield;
  }

  getBlackHole() {
    return this.blackHole;
  }

  destroy() {
    console.log('[IntroScene] Destroying...');

    if (this.starfield) this.starfield.destroy();
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
