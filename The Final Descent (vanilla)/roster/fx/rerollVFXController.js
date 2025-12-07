/**
 * Reroll VFX Controller
 *
 * Manages visual effects for roster rerolls:
 * - Single Reroll: Selected Living shatters → stardust spiral → re-coalesces into swapped card
 * - Total Reroll: All three Living shatter → reform with stagger
 * - Fallen portraits update with crack settle / ember crossfade
 */

import { domRectToNDC } from './anchorMapping.js';

/**
 * VFX timing constants (in seconds)
 */
const TIMING = {
  SINGLE_SHATTER: 0.4,
  SINGLE_SPIRAL: 0.5,
  SINGLE_REFORM: 0.6,
  TOTAL_SHATTER: 0.5,
  TOTAL_STAGGER: 0.15,
  TOTAL_REFORM: 0.7,
  FALLEN_SETTLE: 0.3,
  FALLEN_CROSSFADE: 0.4
};

/**
 * Create reroll VFX controller
 */
export function createRerollVFXController(uniforms, renderer, store, fallenPortraits = []) {
  let isPlaying = false;
  let startTime = 0;
  let vfxType = null; // 'single' or 'total'
  let animationFrameId = null;
  let onCompleteCallback = null;

  // VFX state
  let selectedIndex = -1;
  let selectedRect = null;
  let cardRects = [];
  let fallenElements = fallenPortraits;

  /**
   * Ease functions
   */
  const ease = {
    inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inCubic: t => t * t * t,
    outQuint: t => 1 - Math.pow(1 - t, 5),
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  };

  /**
   * Start single reroll VFX
   */
  function startSingle(cardRect, cardIndex, onComplete) {
    if (isPlaying) return;

    console.log('[Reroll VFX] Starting single reroll');

    isPlaying = true;
    vfxType = 'single';
    startTime = performance.now();
    selectedIndex = cardIndex;
    selectedRect = cardRect;
    onCompleteCallback = onComplete;

    // Set reroll uniforms
    uniforms.uRerollActive.value = 1;

    // Convert rect to NDC
    const ndc = domRectToNDC(cardRect, window.innerWidth, window.innerHeight);
    uniforms.uRerollOriginRect.value.set(
      ndc.x,
      ndc.y,
      cardRect.width / window.innerWidth,
      cardRect.height / window.innerHeight
    );

    tick();
  }

  /**
   * Start total reroll VFX
   */
  function startTotal(cardElements, onComplete) {
    if (isPlaying) return;

    console.log('[Reroll VFX] Starting total reroll');

    isPlaying = true;
    vfxType = 'total';
    startTime = performance.now();
    onCompleteCallback = onComplete;

    // Capture all card rects
    cardRects = cardElements.map(el => el.getBoundingClientRect());

    // Set reroll uniforms
    uniforms.uRerollActive.value = 2; // 2 = total reroll

    tick();
  }

  /**
   * Animation loop
   */
  function tick() {
    if (!isPlaying) return;

    const elapsed = (performance.now() - startTime) / 1000; // Convert to seconds

    if (vfxType === 'single') {
      executeSingleReroll(elapsed);
    } else if (vfxType === 'total') {
      executeTotalReroll(elapsed);
    }

    animationFrameId = requestAnimationFrame(tick);
  }

  /**
   * Execute single reroll VFX
   */
  function executeSingleReroll(elapsed) {
    const totalDuration = TIMING.SINGLE_SHATTER + TIMING.SINGLE_SPIRAL + TIMING.SINGLE_REFORM;

    if (elapsed >= totalDuration) {
      complete();
      return;
    }

    // Phase 1: Shatter (0.0 - 0.4s)
    if (elapsed < TIMING.SINGLE_SHATTER) {
      const t = elapsed / TIMING.SINGLE_SHATTER;
      const eased = ease.inCubic(t);

      // Selected card dims and cracks
      const nodeIndex = selectedIndex + 3; // Living nodes are 3-5
      uniforms.uNodeAlive.value[nodeIndex] = 1.0 - eased;
      uniforms.uCrackStrength.value[nodeIndex] = eased;

      // Reroll progress
      uniforms.uRerollProgress.value = eased * 0.3;
    }

    // Phase 2: Spiral up as stardust (0.4 - 0.9s)
    else if (elapsed < TIMING.SINGLE_SHATTER + TIMING.SINGLE_SPIRAL) {
      const t = (elapsed - TIMING.SINGLE_SHATTER) / TIMING.SINGLE_SPIRAL;
      const eased = ease.outCubic(t);

      const nodeIndex = selectedIndex + 3;

      // Fully shattered
      uniforms.uNodeAlive.value[nodeIndex] = 0;
      uniforms.uCrackStrength.value[nodeIndex] = 1.0;

      // Particle spiral effect (move particles upward)
      uniforms.uEmberStrength.value[nodeIndex] = eased;

      // Reroll progress
      uniforms.uRerollProgress.value = 0.3 + eased * 0.4;
    }

    // Phase 3: Re-coalesce into swapped card (0.9 - 1.5s)
    else {
      const t = (elapsed - TIMING.SINGLE_SHATTER - TIMING.SINGLE_SPIRAL) / TIMING.SINGLE_REFORM;
      const eased = ease.outQuint(t);

      const nodeIndex = selectedIndex + 3;

      // Particles coalesce back
      uniforms.uEmberStrength.value[nodeIndex] = 1.0 - eased;
      uniforms.uCrackStrength.value[nodeIndex] = 1.0 - eased;
      uniforms.uNodeAlive.value[nodeIndex] = eased;

      // Reroll progress
      uniforms.uRerollProgress.value = 0.7 + eased * 0.3;
    }
  }

  /**
   * Execute total reroll VFX
   */
  function executeTotalReroll(elapsed) {
    const totalDuration = TIMING.TOTAL_SHATTER + TIMING.TOTAL_REFORM;

    if (elapsed >= totalDuration) {
      complete();
      return;
    }

    // Phase 1: All shatter with stagger (0.0 - 0.5s)
    if (elapsed < TIMING.TOTAL_SHATTER) {
      const baseT = elapsed / TIMING.TOTAL_SHATTER;

      for (let i = 0; i < 3; i++) {
        const stagger = i * TIMING.TOTAL_STAGGER;
        const t = Math.max(0, Math.min(1, (baseT - stagger / TIMING.TOTAL_SHATTER)));
        const eased = ease.inCubic(t);

        const nodeIndex = i + 3; // Living nodes are 3-5
        uniforms.uNodeAlive.value[nodeIndex] = 1.0 - eased;
        uniforms.uCrackStrength.value[nodeIndex] = eased;
        uniforms.uEmberStrength.value[nodeIndex] = eased * 0.5;
      }

      uniforms.uRerollProgress.value = baseT * 0.5;
    }

    // Phase 2: Reform into new trio with stagger (0.5 - 1.2s)
    else {
      const baseT = (elapsed - TIMING.TOTAL_SHATTER) / TIMING.TOTAL_REFORM;

      for (let i = 0; i < 3; i++) {
        const stagger = i * TIMING.TOTAL_STAGGER;
        const t = Math.max(0, Math.min(1, (baseT - stagger / TIMING.TOTAL_REFORM)));
        const eased = ease.outQuint(t);

        const nodeIndex = i + 3; // Living nodes are 3-5
        uniforms.uEmberStrength.value[nodeIndex] = (1.0 - eased) * 0.5;
        uniforms.uCrackStrength.value[nodeIndex] = 1.0 - eased;
        uniforms.uNodeAlive.value[nodeIndex] = eased;
      }

      uniforms.uRerollProgress.value = 0.5 + baseT * 0.5;
    }
  }

  /**
   * Update Fallen portraits with crack settle effect (single reroll)
   */
  function triggerFallenCrackSettle() {
    // Brief "crack settle" micro-effect for Fallen portraits
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        // Update shader uniforms for crack flash
        uniforms.uCrackStrength.value[i] = 0.3;

        // Add CSS effect to DOM elements
        if (fallenElements[i] && fallenElements[i].wrapper) {
          const crackedGlass = fallenElements[i].wrapper.querySelector('.crackedGlass');
          if (crackedGlass) {
            crackedGlass.style.opacity = '0.8';
            crackedGlass.style.filter = 'brightness(1.3)';
          }
        }

        // Settle animation
        setTimeout(() => {
          uniforms.uCrackStrength.value[i] = 0;

          if (fallenElements[i] && fallenElements[i].wrapper) {
            const crackedGlass = fallenElements[i].wrapper.querySelector('.crackedGlass');
            if (crackedGlass) {
              crackedGlass.style.opacity = '';
              crackedGlass.style.filter = '';
            }
          }
        }, TIMING.FALLEN_SETTLE * 1000);
      }, i * 100);
    }
  }

  /**
   * Update Fallen portraits with ember crossfade (total reroll)
   */
  function triggerFallenEmberCrossfade() {
    // Ember crossfade effect for total reroll
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        // Ember glow in shader
        uniforms.uEmberStrength.value[i] = 0.6;

        // Add CSS effect to DOM elements
        if (fallenElements[i] && fallenElements[i].wrapper) {
          const plaque = fallenElements[i].wrapper;
          plaque.style.transition = `opacity ${TIMING.FALLEN_CROSSFADE}s ease-out`;
          plaque.style.opacity = '0.3';

          // Add ember glow effect
          const surface = plaque.querySelector('.plaqueSurface');
          if (surface) {
            surface.style.boxShadow = '0 0 20px rgba(255, 120, 60, 0.6)';
          }
        }

        // Crossfade complete
        setTimeout(() => {
          uniforms.uEmberStrength.value[i] = 0;

          if (fallenElements[i] && fallenElements[i].wrapper) {
            const plaque = fallenElements[i].wrapper;
            plaque.style.opacity = '';

            const surface = plaque.querySelector('.plaqueSurface');
            if (surface) {
              surface.style.boxShadow = '';
            }
          }
        }, TIMING.FALLEN_CROSSFADE * 1000);
      }, i * 80);
    }
  }

  /**
   * Complete VFX and unlock UI
   */
  function complete() {
    console.log('[Reroll VFX] Complete');

    isPlaying = false;

    // Reset reroll uniforms
    uniforms.uRerollActive.value = 0;
    uniforms.uRerollProgress.value = 0;

    // Ensure all Living nodes are fully alive
    for (let i = 3; i < 6; i++) {
      uniforms.uNodeAlive.value[i] = 1.0;
      uniforms.uCrackStrength.value[i] = 0;
      uniforms.uEmberStrength.value[i] = 0;
    }

    // Update Fallen portraits based on reroll type
    if (vfxType === 'single') {
      triggerFallenCrackSettle();
    } else if (vfxType === 'total') {
      triggerFallenEmberCrossfade();
    }

    // Call completion callback (store unlock)
    if (onCompleteCallback) {
      onCompleteCallback();
      onCompleteCallback = null;
    }

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    vfxType = null;
    selectedIndex = -1;
    selectedRect = null;
    cardRects = [];
  }

  /**
   * Stop VFX (cleanup)
   */
  function stop() {
    isPlaying = false;
    uniforms.uRerollActive.value = 0;
    uniforms.uRerollProgress.value = 0;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  /**
   * Set fallen portrait elements for effects
   */
  function setFallenPortraits(portraits) {
    fallenElements = portraits;
  }

  return {
    startSingle,
    startTotal,
    stop,
    setFallenPortraits,
    isPlaying: () => isPlaying
  };
}
