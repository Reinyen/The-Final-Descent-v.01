export class UIController {
  constructor(options = {}) {
    this.onBegin = options.onBegin || (() => {});

    // Get DOM elements
    this.titleContainer = document.getElementById('title-container');
    this.mainTitle = document.getElementById('main-title');
    this.buttonContainer = document.getElementById('button-container');
    this.beginButton = document.getElementById('begin-button');

    // State tracking
    this.titleVisible = false;
    this.buttonVisible = false;
    this.lastTitleGlitch = -10;
    this.lastButtonGlitch = -10;

    // Glitch timeouts for cleanup
    this.glitchTimeouts = new Set();

    // Check reduced motion preference
    this.prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Setup button click handler
    this.setupButtonHandler();
  }

  setupButtonHandler() {
    this.beginButton.addEventListener('click', () => {
      if (this.buttonVisible) {
        this.onBegin();
      }
    });
  }

  update(phase, elapsedTime) {
    // Show title at 40% through crater_settle (5.3s global)
    if ((phase.name === 'crater_settle' && phase.phaseT >= 0.4) ||
        phase.name === 'button_reveal' ||
        phase.name === 'complete') {
      this.showTitle();
    }

    // Show button at 20% through button_reveal (5.7s global)
    if ((phase.name === 'button_reveal' && phase.phaseT >= 0.2) ||
        phase.name === 'complete') {
      this.showButton();
    }

    // Trigger periodic glitches (cinematic cadence: 3-7s intervals)
    if (this.titleVisible && !this.prefersReducedMotion) {
      this.checkTitleGlitch(elapsedTime);
    }

    if (this.buttonVisible && !this.prefersReducedMotion) {
      this.checkButtonGlitch(elapsedTime);
    }
  }

  showTitle() {
    if (this.titleVisible) return;

    this.titleVisible = true;
    this.titleContainer.classList.remove('hidden');
    this.titleContainer.classList.add('visible');
    this.mainTitle.classList.add('glitch-in');

    console.log('[UI] Title revealed');
  }

  showButton() {
    if (this.buttonVisible) return;

    this.buttonVisible = true;
    this.buttonContainer.classList.remove('hidden');
    this.buttonContainer.classList.add('visible');
    this.beginButton.disabled = false;
    this.beginButton.classList.add('glitch-in');

    // Auto-focus for accessibility
    this.beginButton.focus();

    console.log('[UI] Button revealed');
  }

  checkTitleGlitch(elapsedTime) {
    if (elapsedTime - this.lastTitleGlitch < 3.0) return;

    // Random interval: 3-7 seconds
    const interval = 3.0 + Math.random() * 4.0;

    if (elapsedTime - this.lastTitleGlitch >= interval) {
      this.triggerGlitch(this.mainTitle, 120 + Math.random() * 60);
      this.lastTitleGlitch = elapsedTime;
    }
  }

  checkButtonGlitch(elapsedTime) {
    if (elapsedTime - this.lastButtonGlitch < 3.0) return;

    const interval = 3.0 + Math.random() * 4.0;

    if (elapsedTime - this.lastButtonGlitch >= interval) {
      this.triggerGlitch(this.beginButton, 120 + Math.random() * 60);
      this.lastButtonGlitch = elapsedTime;
    }
  }

  triggerGlitch(element, duration) {
    element.classList.add('glitching');

    const timeout = setTimeout(() => {
      element.classList.remove('glitching');
      this.glitchTimeouts.delete(timeout);
    }, duration);

    this.glitchTimeouts.add(timeout);
  }

  isButtonVisible() {
    return this.buttonVisible;
  }

  destroy() {
    // Clear all glitch timeouts
    this.glitchTimeouts.forEach(timeout => clearTimeout(timeout));
    this.glitchTimeouts.clear();

    // Remove event listeners
    this.beginButton.removeEventListener('click', this.onBegin);
  }
}
