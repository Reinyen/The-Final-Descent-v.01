import { IntroScene } from './scene-setup.js';
import { Timeline } from './timeline.js';
import { UIController } from './ui-controller.js';

class IntroPageApp {
  constructor() {
    this.config = {
      quality: 'auto', // 'auto' | 'high' | 'low'
      debugMode: false
    };

    this.scene = null;
    this.timeline = null;
    this.uiController = null;
    this.animationFrameId = null;
    this.isInitialized = false;
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

    // Start animation loop
    this.startAnimationLoop();

    // Setup keyboard controls
    this.setupKeyboardControls();

    // Setup window resize handler
    this.setupResizeHandler();

    this.isInitialized = true;
    console.log('[IntroPage] Initialization complete');
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
    // Transition to main game
    // Example: window.location.href = '/game';
    alert('🌌 Welcome to The Final Descent!\n\nThe game would start here.\n\nThis is a demo of the intro sequence.');
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
