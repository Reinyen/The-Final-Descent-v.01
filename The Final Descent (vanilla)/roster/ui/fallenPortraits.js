/**
 * Fallen Portraits Cluster + Memory Flicker
 *
 * Implements Fallen portraits with:
 * - 3 portrait frames with slight overlap
 * - Permanently dimmed vs Living
 * - Cracked-glass overlay
 * - Name display in Cinzel at 30% opacity
 * - Non-interactive
 * - Memory flicker every 20-30 seconds with subtle chromatic glitch
 */

/**
 * Create Fallen portrait element
 */
export function createFallenPortrait() {
  const wrapper = document.createElement('div');
  wrapper.className = 'fallenPlaque';

  const surface = document.createElement('div');
  surface.className = 'plaqueSurface';

  const crackedGlass = document.createElement('div');
  crackedGlass.className = 'crackedGlass';

  const name = document.createElement('div');
  name.className = 'plaqueName';

  const state = document.createElement('div');
  state.className = 'plaqueState';
  state.textContent = 'FALLEN';

  wrapper.appendChild(surface);
  wrapper.appendChild(crackedGlass);
  wrapper.appendChild(name);
  wrapper.appendChild(state);

  return { wrapper, surface, name };
}

/**
 * Render Fallen portrait content
 */
export function renderFallenPortrait(portrait, character) {
  if (!portrait || !character) return;

  const { wrapper, name } = portrait;

  if (name) {
    name.textContent = character.name || '';
  }

  // Make visible with animation
  wrapper.style.opacity = '1';
  wrapper.style.transform = 'translateY(0)';
}

/**
 * Setup memory flicker loop for Fallen portraits
 */
export function setupMemoryFlicker(portraits, store) {
  if (!portraits || portraits.length === 0) return;

  let lastFlickerTime = performance.now();
  let animationFrameId = null;

  /**
   * Trigger flicker on a random portrait
   */
  function triggerFlicker() {
    const state = store.getState();
    if (state.uiLocked) return; // Don't flicker during animations

    // Pick a random portrait
    const index = Math.floor(Math.random() * portraits.length);
    const portrait = portraits[index];
    if (!portrait || !portrait.surface) return;

    // Add flicker class
    portrait.surface.classList.add('memory-flicker');

    // Add chromatic glitch for 150-250ms
    const glitchDuration = 150 + Math.random() * 100;
    portrait.surface.classList.add('chromatic-glitch');

    setTimeout(() => {
      portrait.surface.classList.remove('chromatic-glitch');
    }, glitchDuration);

    // Remove flicker class after animation
    setTimeout(() => {
      portrait.surface.classList.remove('memory-flicker');
    }, 1000);
  }

  /**
   * Flicker loop
   */
  function flickerLoop() {
    const now = performance.now();
    const timeSinceLastFlicker = now - lastFlickerTime;

    // Randomized interval: 20-30 seconds (20000-30000ms)
    const nextFlickerIn = 20000 + Math.random() * 10000;

    if (timeSinceLastFlicker >= nextFlickerIn) {
      triggerFlicker();
      lastFlickerTime = now;
    }

    animationFrameId = requestAnimationFrame(flickerLoop);
  }

  // Start the loop
  flickerLoop();

  // Return cleanup function
  return () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}

/**
 * Apply overlap positioning to Fallen portraits
 */
export function applyOverlapPositioning(portraitElements) {
  if (!portraitElements || portraitElements.length === 0) return;

  portraitElements.forEach((element, index) => {
    if (index > 0) {
      // Slight overlap: -8px margin-left for 2nd and 3rd portraits
      element.style.marginLeft = '-8px';
      element.style.zIndex = String(10 - index); // Stack properly
    }
  });
}
