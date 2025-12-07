import { IntroScene } from './scene-setup.js';
import { Timeline } from './timeline.js';
import { UIController } from './ui-controller.js';
import { BlackHoleTransition } from './transition.js';

class IntroPageApp {
  constructor() {
    this.config = {
      quality: 'auto', // 'auto' | 'high' | 'low'
      debugMode: false
    };

    this.scene = null;
    this.timeline = null;
    this.uiController = null;
    this.transition = null;
    this.animationFrameId = null;
    this.isInitialized = false;
    this.isTransitioning = false;
  }

  async init() {
    if (this.isInitialized) {
      console.warn('[IntroPage] Already initialized');
      return;
    }

    console.log('[IntroPage] Initializing...');

    // Detect quality tier
    const quality = this.config.quality === 'auto'
      ? this.detectQuality()
      : this.config.quality;

    console.log('[IntroPage] Quality tier:', quality);

    // Initialize Three.js scene
    this.scene = new IntroScene(quality, this.config.debugMode);
    await this.scene.init();

    // Initialize timeline manager
    this.timeline = new Timeline(this.scene);

    // Initialize UI controller
    this.uiController = new UIController({
      onBegin: () => this.handleBegin()
    });

    // Initialize transition controller
    this.transition = new BlackHoleTransition(
      this.scene.scene,
      this.scene.getCamera(),
      this.scene.getStarfield(),
      this.scene.getBlackHole()
    );

    // Start animation loop
    this.startAnimationLoop();

    // Setup keyboard controls
    this.setupKeyboardControls();

    // Setup window resize handler
    this.setupResizeHandler();

    // Initialize ripple effect (after scene is ready)
    this.initializeRipples();

    this.isInitialized = true;
    console.log('[IntroPage] Initialization complete');
  }

  initializeRipples() {
    // Wait for jQuery to be loaded
    if (typeof jQuery === 'undefined') {
      console.warn('[IntroPage] jQuery not loaded, skipping ripples');
      return;
    }

    // Create ripple overlay element centered on black hole
    const rippleOverlay = document.createElement('div');
    rippleOverlay.id = 'ripple-overlay';
    rippleOverlay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 800px;
      height: 800px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 1;
      opacity: 0.6;
    `;
    document.getElementById('canvas-container').appendChild(rippleOverlay);

    // Initialize ripples with specified settings
    jQuery('#ripple-overlay').ripples({
      resolution: 512,
      dropRadius: 20,
      perturbance: 0.04,
      interactive: false
    });

    // Create automatic continuous ripples at reduced speed (0.2x)
    setInterval(() => {
      const centerX = 400; // Center of 800px overlay
      const centerY = 400;
      const radius = Math.random() * 150; // Within 150px from center
      const angle = Math.random() * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      jQuery('#ripple-overlay').ripples('drop', x, y, 20, 0.02);
    }, 1000); // New ripple every second (slower than default)
  }

  detectQuality() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio;
    const totalPixels = width * height * Math.min(pixelRatio, 2);

    return totalPixels < 1920 * 1080 || pixelRatio < 1.5 ? 'low' : 'high';
  }

  startAnimationLoop() {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const deltaTime = this.scene.clock.getDelta();
      const elapsedTime = this.scene.clock.getElapsedTime();

      // If transitioning, only update transition
      if (this.isTransitioning) {
        this.transition.update(deltaTime);
        this.scene.render(null, elapsedTime);
        return;
      }

      // Update timeline and get phase info
      const phase = this.timeline.update(elapsedTime, deltaTime);

      // Update UI based on phase
      this.uiController.update(phase, elapsedTime);

      // Render scene
      this.scene.render(phase, elapsedTime);
    };

    animate();
  }

  setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      // Button activation
      if (this.uiController.isButtonVisible() &&
          (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this.handleBegin();
      }

      // Debug mode shortcuts (if enabled)
      if (this.config.debugMode) {
        this.handleDebugKeys(e);
      }
    });
  }

  handleDebugKeys(e) {
    const key = e.key.toLowerCase();
    switch (key) {
      case 'd':
        this.toggleDebugPanel();
        break;
      case 'f':
        this.timeline.toggleFreeze();
        break;
      case ',':
        this.timeline.scrubTime(-0.1);
        break;
      case '.':
        this.timeline.scrubTime(0.1);
        break;
    }
  }

  toggleDebugPanel() {
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel.classList.contains('hidden')) {
      debugPanel.classList.remove('hidden');
    } else {
      debugPanel.classList.add('hidden');
    }
  }

  setupResizeHandler() {
    window.addEventListener('resize', () => {
      this.scene.handleResize();
    });
  }

  handleBegin() {
    console.log('[IntroPage] User clicked BEGIN');

    // Start black hole descent transition
    this.isTransitioning = true;
    this.transition.start(() => {
      // This callback is called when transition completes
      console.log('[IntroPage] Transition complete, navigating to Roster Selection');

      // Navigate to Roster Selection UI
      window.location.href = 'roster/index.html';
    });
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.scene) {
      this.scene.destroy();
    }

    if (this.uiController) {
      this.uiController.destroy();
    }

    this.isInitialized = false;
    console.log('[IntroPage] Destroyed');
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new IntroPageApp();
    app.init();

    // Expose globally for debugging
    window.introApp = app;
  });
} else {
  const app = new IntroPageApp();
  app.init();

  // Expose globally for debugging
  window.introApp = app;
}
