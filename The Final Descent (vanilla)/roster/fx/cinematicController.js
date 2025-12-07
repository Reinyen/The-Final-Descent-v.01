/**
 * Entry Cinematic Controller - Phases A→E
 *
 * Orchestrates the complete entry cinematic sequence:
 * Phase A: Void expansion (1.0s) + blackout hold (0.18s) = 1.18s total
 * Phase B: Six stars emerge (1.1s)
 * Phase C: Fate chooses; 3 pre-death tell + fracture + ember + ash (1.2s)
 * Phase D: The fall (0.9s)
 * Phase E: Morph to UI anchors (0.9s)
 *
 * Total duration: ~5.28 seconds
 */

import { domRectToNDC, freezeLayoutMeasurements } from './anchorMapping.js';

/**
 * Phase timings (in seconds)
 */
const PHASE_TIMINGS = {
  A_VOID_EXPANSION: 1.0,
  A_BLACKOUT_HOLD: 0.18,
  B_STARS_EMERGE: 1.1,
  C_FATE_CHOOSES: 1.2,
  D_THE_FALL: 0.9,
  E_MORPH_TO_UI: 0.9
};

/**
 * Get cumulative timing for each phase
 */
function getCumulativeTiming() {
  let t = 0;
  return {
    A_START: (t = 0),
    A_BLACKOUT: (t += PHASE_TIMINGS.A_VOID_EXPANSION),
    B_START: (t += PHASE_TIMINGS.A_BLACKOUT_HOLD),
    C_START: (t += PHASE_TIMINGS.B_STARS_EMERGE),
    D_START: (t += PHASE_TIMINGS.C_FATE_CHOOSES),
    E_START: (t += PHASE_TIMINGS.D_THE_FALL),
    END: (t += PHASE_TIMINGS.E_MORPH_TO_UI)
  };
}

const TIMING = getCumulativeTiming();

/**
 * Create cinematic controller
 */
export function createCinematicController(uniforms, renderer, store) {
  let isPlaying = false;
  let startTime = 0;
  let currentPhase = null;
  let animationFrameId = null;
  let frozenAnchors = null;

  /**
   * Ease functions
   */
  const ease = {
    inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inCubic: t => t * t * t,
    outQuint: t => 1 - Math.pow(1 - t, 5)
  };

  /**
   * Start the cinematic
   */
  function start(livingIds, fallenIds, cardElements, fallenElements) {
    if (isPlaying) return;

    console.log('[Cinematic] Starting entry sequence');

    isPlaying = true;
    startTime = performance.now();

    // Freeze layout measurements for the entire cinematic
    frozenAnchors = freezeLayoutMeasurements(cardElements, fallenElements);

    // Set initial uniforms
    uniforms.uPhase.value = 0; // Phase A
    uniforms.uVignetteStrength.value = 0;
    uniforms.uDustStrength.value = 0;

    // Initialize node positions (6 stars for 6 characters)
    for (let i = 0; i < 6; i++) {
      uniforms.uNodeAlive.value[i] = 0; // All start as dormant
      uniforms.uNodeFallen.value[i] = 0;
      uniforms.uCrackStrength.value[i] = 0;
      uniforms.uEmberStrength.value[i] = 0;
      uniforms.uFallOffset.value[i] = 0;
    }

    // Start animation loop
    tick();
  }

  /**
   * Animation loop
   */
  function tick() {
    if (!isPlaying) return;

    const elapsed = (performance.now() - startTime) / 1000; // Convert to seconds

    // Determine current phase
    if (elapsed < TIMING.A_BLACKOUT) {
      executePhaseA(elapsed, TIMING.A_START, TIMING.A_BLACKOUT);
    } else if (elapsed < TIMING.B_START) {
      executePhaseABlackout(elapsed, TIMING.A_BLACKOUT, TIMING.B_START);
    } else if (elapsed < TIMING.C_START) {
      executePhaseB(elapsed, TIMING.B_START, TIMING.C_START);
    } else if (elapsed < TIMING.D_START) {
      executePhaseC(elapsed, TIMING.C_START, TIMING.D_START);
    } else if (elapsed < TIMING.E_START) {
      executePhaseD(elapsed, TIMING.D_START, TIMING.E_START);
    } else if (elapsed < TIMING.END) {
      executePhaseE(elapsed, TIMING.E_START, TIMING.END);
    } else {
      complete();
      return;
    }

    animationFrameId = requestAnimationFrame(tick);
  }

  /**
   * Phase A: Void expansion (1.0s)
   */
  function executePhaseA(elapsed, start, end) {
    if (currentPhase !== 'A') {
      currentPhase = 'A';
      store?.updateCinematicPhase('A');
      console.log('[Cinematic] Phase A: Void expansion');
    }

    const t = (elapsed - start) / (end - start);
    const eased = ease.inOutQuad(t);

    // Expand vignette from center
    uniforms.uVignetteStrength.value = eased * 0.8;
    uniforms.uPhase.value = 0 + eased * 0.2; // 0.0 to 0.2
  }

  /**
   * Phase A blackout hold (0.18s)
   */
  function executePhaseABlackout(elapsed, start, end) {
    if (currentPhase !== 'A_BLACKOUT') {
      currentPhase = 'A_BLACKOUT';
      console.log('[Cinematic] Phase A: Blackout hold');
    }

    // Hold at full darkness
    uniforms.uVignetteStrength.value = 1.0;
    uniforms.uPhase.value = 0.2;
  }

  /**
   * Phase B: Six stars emerge (1.1s)
   */
  function executePhaseB(elapsed, start, end) {
    if (currentPhase !== 'B') {
      currentPhase = 'B';
      store?.updateCinematicPhase('B');
      console.log('[Cinematic] Phase B: Six stars emerge');
    }

    const t = (elapsed - start) / (end - start);
    const eased = ease.outCubic(t);

    // Reduce vignette
    uniforms.uVignetteStrength.value = 1.0 - eased * 0.5;

    // Stars emerge in staggered sequence
    for (let i = 0; i < 6; i++) {
      const stagger = i * 0.1;
      const starT = Math.max(0, Math.min(1, (t - stagger) / 0.6));
      uniforms.uNodeAlive.value[i] = ease.outQuint(starT);

      // Position stars in circular formation
      const angle = (i / 6) * Math.PI * 2;
      const radius = 0.3;
      uniforms.uNodePos.value[i].set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0
      );
    }

    uniforms.uPhase.value = 0.2 + eased * 0.2; // 0.2 to 0.4
  }

  /**
   * Phase C: Fate chooses - 3 fall, 3 remain (1.2s)
   */
  function executePhaseC(elapsed, start, end) {
    if (currentPhase !== 'C') {
      currentPhase = 'C';
      store?.updateCinematicPhase('C');
      console.log('[Cinematic] Phase C: Fate chooses');
    }

    const t = (elapsed - start) / (end - start);

    // First 3 nodes (Fallen) show pre-death tell, fracture, ember
    for (let i = 0; i < 3; i++) {
      const stagger = i * 0.15;
      const nodeT = Math.max(0, Math.min(1, (t - stagger) / 0.7));

      // Pre-death tell: flicker
      if (nodeT < 0.3) {
        uniforms.uNodeAlive.value[i] = 1.0 - Math.sin(nodeT * 20) * 0.2;
      }

      // Fracture
      if (nodeT >= 0.3 && nodeT < 0.6) {
        const crackT = (nodeT - 0.3) / 0.3;
        uniforms.uCrackStrength.value[i] = ease.inCubic(crackT);
      }

      // Ember + ash
      if (nodeT >= 0.6) {
        const emberT = (nodeT - 0.6) / 0.4;
        uniforms.uEmberStrength.value[i] = ease.outCubic(emberT);
        uniforms.uNodeAlive.value[i] = 1.0 - emberT;
      }

      // Mark as Fallen
      uniforms.uNodeFallen.value[i] = nodeT > 0.8 ? 1 : 0;
    }

    uniforms.uPhase.value = 0.4 + t * 0.2; // 0.4 to 0.6
  }

  /**
   * Phase D: The fall (0.9s)
   */
  function executePhaseD(elapsed, start, end) {
    if (currentPhase !== 'D') {
      currentPhase = 'D';
      store?.updateCinematicPhase('D');
      console.log('[Cinematic] Phase D: The fall');
    }

    const t = (elapsed - start) / (end - start);
    const eased = ease.inCubic(t);

    // Fallen nodes drift downward
    for (let i = 0; i < 3; i++) {
      uniforms.uFallOffset.value[i] = eased * -0.5; // Fall down
      uniforms.uEmberStrength.value[i] = 1.0 - eased; // Embers fade
    }

    // Living nodes (3-5) remain stable
    for (let i = 3; i < 6; i++) {
      uniforms.uNodeAlive.value[i] = 1.0;
    }

    uniforms.uPhase.value = 0.6 + t * 0.2; // 0.6 to 0.8
  }

  /**
   * Phase E: Morph to UI anchors (0.9s)
   */
  function executePhaseE(elapsed, start, end) {
    if (currentPhase !== 'E') {
      currentPhase = 'E';
      store?.updateCinematicPhase('E');
      console.log('[Cinematic] Phase E: Morph to UI');
    }

    const t = (elapsed - start) / (end - start);
    const eased = ease.outCubic(t);

    if (!frozenAnchors) return;

    // Morph Living nodes (indices 0-2) to Living card anchors
    for (let i = 0; i < 3; i++) {
      const anchor = frozenAnchors.living[i];
      if (anchor) {
        const ndc = domRectToNDC(anchor, window.innerWidth, window.innerHeight);
        const startPos = uniforms.uNodePos.value[i + 3]; // Living are nodes 3-5
        uniforms.uNodePos.value[i + 3].lerp(ndc, eased);
      }
    }

    // Morph Fallen nodes (indices 0-2) to Fallen portrait anchors
    for (let i = 0; i < 3; i++) {
      const anchor = frozenAnchors.fallen[i];
      if (anchor) {
        const ndc = domRectToNDC(anchor, window.innerWidth, window.innerHeight);
        const startY = uniforms.uFallOffset.value[i];
        const startPos = uniforms.uNodePos.value[i];
        startPos.y += startY; // Apply fall offset
        uniforms.uNodePos.value[i].lerp(ndc, eased);
      }
    }

    // Update morph anchors for Three.js layer
    if (store) {
      store.updateMorphAnchors(frozenAnchors);
    }

    uniforms.uPhase.value = 0.8 + eased * 0.2; // 0.8 to 1.0
  }

  /**
   * Complete cinematic
   */
  function complete() {
    console.log('[Cinematic] Complete');

    isPlaying = false;

    // Finalize uniforms
    uniforms.uPhase.value = 1.0;
    uniforms.uVignetteStrength.value = 0.4; // Settle to ambient vignette
    uniforms.uDustStrength.value = 0.2; // Enable ambient dust
    uniforms.uDustDriftSpeed.value = 0.1;

    // All Living nodes fully alive
    for (let i = 3; i < 6; i++) {
      uniforms.uNodeAlive.value[i] = 1.0;
    }

    // All Fallen nodes dimmed
    for (let i = 0; i < 3; i++) {
      uniforms.uNodeAlive.value[i] = 0.3;
      uniforms.uNodeFallen.value[i] = 1.0;
    }

    // Unlock UI via store
    if (store) {
      store.completeCinematic();
    }

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  /**
   * Stop cinematic (cleanup)
   */
  function stop() {
    isPlaying = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  return {
    start,
    stop,
    isPlaying: () => isPlaying
  };
}
