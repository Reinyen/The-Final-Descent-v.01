import * as THREE from 'three';
import { PostProcessing } from './post-processing.js';
import { Starfield } from './starfield.js';
import { BlackHole } from './black-hole.js';
import { ParticleSystem } from './particles.js';
import { StarPhysics } from './physics.js';
import { ExplosionCanvas } from './explosion-canvas.js';

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
    this.explosionCanvas = null;

    this.cameraBasePosition = new THREE.Vector3(0, 0, 30);
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.explosionStarted = false;
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

    // Initialize explosion canvas (2D overlay)
    this.explosionCanvas = new ExplosionCanvas();
    this.explosionCanvas.init();

    console.log('[IntroScene] Initialization complete');
  }

  updateStarfield(phase, elapsedTime) {
    this.starfield.update(phase, elapsedTime);
  }

  updateExplosionCanvas(phase, elapsedTime) {
    // Start explosion at beginning of placeholder_content phase
    if (phase.name === 'placeholder_content' && !this.explosionStarted) {
      this.explosionCanvas.start();
      this.explosionStarted = true;
    }

    // Update explosion during placeholder_content phase
    if (phase.name === 'placeholder_content' && this.explosionCanvas.isActive) {
      this.explosionCanvas.update();
    }

    // Fade out canvas independently of isActive to ensure seamless transition to black hole
    if (phase.name === 'placeholder_content') {
      const fadeOutStart = 2.0;
      const fadeOutEnd = 3.0;
      if (elapsedTime >= fadeOutStart && elapsedTime <= fadeOutEnd) {
        const t = (elapsedTime - fadeOutStart) / (fadeOutEnd - fadeOutStart);
        this.explosionCanvas.canvas.style.opacity = (1 - t).toString();
      } else if (elapsedTime > fadeOutEnd) {
        this.explosionCanvas.canvas.style.opacity = '0';
      }
    }

    // Stop explosion when transitioning to ui_reveal
    if (phase.name === 'ui_reveal' && this.explosionStarted) {
      this.explosionCanvas.stop();
      this.explosionCanvas.canvas.style.opacity = '1'; // Reset for next time
    }
  }

  updateCamera(phase, elapsedTime) {
    // Keep camera at base position (custom camera logic can be added during placeholder_content phase)
    this.camera.position.copy(this.cameraBasePosition);
  }

  updateParticles(phase, elapsedTime, deltaTime) {
    this.particleSystem.update(phase, elapsedTime, deltaTime);
  }

  updateBlackHole(phase, elapsedTime) {
    // Fade in black hole during particle collapse for seamless transition
    const fadeStartTime = 1.5;
    const fadeDuration = 1.5;
    const fadeEndTime = fadeStartTime + fadeDuration;

    if (elapsedTime >= fadeStartTime) {
      this.blackHole.getGroup().visible = true;

      if (elapsedTime < fadeEndTime) {
        // Fading in
        const t = (elapsedTime - fadeStartTime) / fadeDuration;
        const easedT = t * t * (3 - 2 * t); // Smoothstep easing

        // Scale from 0 to 1
        const scale = easedT;
        this.blackHole.getGroup().scale.set(scale, scale, scale);

        // Fade materials
        if (this.blackHole.eventHorizonMaterial) {
          this.blackHole.eventHorizonMaterial.opacity = 0.95 * easedT;
        }
        if (this.blackHole.innerCoreMaterial) {
          this.blackHole.innerCoreMaterial.opacity = easedT;
        }
        if (this.blackHole.accretionDiskMaterial) {
          this.blackHole.accretionDiskMaterial.opacity = easedT;
        }
        if (this.blackHole.outerGlowMaterial) {
          this.blackHole.outerGlowMaterial.opacity = easedT;
        }
      } else {
        // Fully visible
        this.blackHole.getGroup().scale.set(1, 1, 1);
        if (this.blackHole.eventHorizonMaterial) {
          this.blackHole.eventHorizonMaterial.opacity = 0.95;
        }
        if (this.blackHole.innerCoreMaterial) {
          this.blackHole.innerCoreMaterial.opacity = 1.0;
        }
        if (this.blackHole.accretionDiskMaterial) {
          this.blackHole.accretionDiskMaterial.opacity = 1.0;
        }
        if (this.blackHole.outerGlowMaterial) {
          this.blackHole.outerGlowMaterial.opacity = 1.0;
        }
      }
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
    if (this.explosionCanvas) this.explosionCanvas.destroy();
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
