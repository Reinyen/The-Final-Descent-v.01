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

    // Glitch teleport state
    this.nextTitleGlitchTime = null;
    this.titleGlitchInProgress = false;

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

    // Set initial random position
    this.teleportTitle();

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
    // Skip if glitch is already in progress
    if (this.titleGlitchInProgress) return;

    // Initialize next glitch time on first call
    if (this.nextTitleGlitchTime === null) {
      // Random interval: 0.8-4.8 seconds
      this.nextTitleGlitchTime = elapsedTime + 0.8 + Math.random() * 4.0;
      return;
    }

    // Check if it's time to glitch
    if (elapsedTime >= this.nextTitleGlitchTime) {
      this.titleGlitchInProgress = true;

      // Start glitch-out animation
      this.mainTitle.classList.remove('glitch-in');
      this.mainTitle.classList.add('glitch-out');

      // After 300ms (glitch-out duration), teleport and glitch back in
      const timeout1 = setTimeout(() => {
        // Teleport to new random position
        this.teleportTitle();

        // Remove glitch-out and add glitch-in
        this.mainTitle.classList.remove('glitch-out');
        this.mainTitle.classList.add('glitch-in');

        // Schedule next glitch (0.8-4.8 seconds)
        this.nextTitleGlitchTime = elapsedTime + 0.8 + Math.random() * 4.0;
        this.titleGlitchInProgress = false;

        this.glitchTimeouts.delete(timeout1);
      }, 300);

      this.glitchTimeouts.add(timeout1);
    }
  }

  teleportTitle() {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Get title dimensions (approximate based on font size)
    // Using 3rem = 48px, and rough estimate of text width
    const titleWidth = 500; // Approximate width for "THE FINAL DESCENT"
    const titleHeight = 60; // Approximate height for 3rem font

    // Calculate safe bounds (keep title fully visible with some padding)
    const padding = 20;
    const minX = padding + titleWidth / 2;
    const maxX = viewportWidth - padding - titleWidth / 2;
    const minY = padding + titleHeight / 2;
    const maxY = viewportHeight - padding - titleHeight / 2;

    // Generate random position within safe bounds
    const randomX = minX + Math.random() * (maxX - minX);
    const randomY = minY + Math.random() * (maxY - minY);

    // Update position
    this.titleContainer.style.left = `${randomX}px`;
    this.titleContainer.style.top = `${randomY}px`;
    this.titleContainer.style.transform = 'translate(-50%, -50%)';

    console.log(`[UI] Title teleported to (${randomX.toFixed(0)}, ${randomY.toFixed(0)})`);
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
