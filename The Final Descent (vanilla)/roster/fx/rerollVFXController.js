/**
 * Reroll VFX Controller
 *
 * Manages visual effects for roster rerolls using CSS animations on DOM elements:
 * - Single Reroll: Selected Living card shatters → particles → reforms as new card
 * - Total Reroll: All three Living cards shatter → reform with stagger
 * - Fallen portraits update with crack settle / ember crossfade
 */

/**
 * VFX timing constants (in milliseconds)
 */
const TIMING = {
  SINGLE_SHATTER: 400,
  SINGLE_PARTICLES: 500,
  SINGLE_REFORM: 600,
  TOTAL_SHATTER: 500,
  TOTAL_STAGGER: 150,
  TOTAL_REFORM: 700,
  FALLEN_SETTLE: 300,
  FALLEN_CROSSFADE: 400
};

/**
 * Create reroll VFX controller
 */
export function createRerollVFXController() {
  let isPlaying = false;
  let fallenPortraits = [];

  /**
   * Create particle effects for stardust spiral
   */
  function createParticles(cardElement) {
    const container = document.createElement('div');
    container.className = 'reroll-particles';
    cardElement.appendChild(container);

    const particleCount = 30;
    const rect = cardElement.getBoundingClientRect();

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'reroll-particle';

      // Random spiral trajectory
      const angle = (Math.random() * Math.PI * 2);
      const distance = 100 + Math.random() * 150;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - (100 + Math.random() * 100); // Bias upward

      particle.style.setProperty('--dx', `${dx}px`);
      particle.style.setProperty('--dy', `${dy}px`);
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 0.1}s`;

      container.appendChild(particle);
    }

    // Remove particles after animation
    setTimeout(() => {
      container.remove();
    }, TIMING.SINGLE_PARTICLES + 100);
  }

  /**
   * Start single reroll animation
   */
  async function startSingle(cardElement, cardIndex, renderCallback, onComplete) {
    if (isPlaying) return;

    console.log('[Reroll VFX] Starting single reroll animation on card', cardIndex);

    isPlaying = true;

    // Phase 1: Shatter (400ms)
    cardElement.classList.add('reroll-shattering');

    await new Promise(resolve => setTimeout(resolve, TIMING.SINGLE_SHATTER));

    // Phase 2: Create particles and make them spiral (500ms)
    createParticles(cardElement);

    await new Promise(resolve => setTimeout(resolve, TIMING.SINGLE_PARTICLES));

    // At this point, update the card content to show the new character
    cardElement.classList.remove('reroll-shattering');
    if (renderCallback) {
      renderCallback();
    }

    // Phase 3: Reform (600ms)
    cardElement.classList.add('reroll-reforming');

    await new Promise(resolve => setTimeout(resolve, TIMING.SINGLE_REFORM));

    // Cleanup
    cardElement.classList.remove('reroll-reforming');

    // Trigger Fallen crack settle
    triggerFallenCrackSettle();

    console.log('[Reroll VFX] Single reroll complete');
    isPlaying = false;

    if (onComplete) {
      onComplete();
    }
  }

  /**
   * Start total reroll animation
   */
  async function startTotal(cardElements, renderCallback, onComplete) {
    if (isPlaying) return;

    console.log('[Reroll VFX] Starting total reroll animation');

    isPlaying = true;

    // Phase 1: Shatter all cards with stagger (500ms total)
    for (let i = 0; i < cardElements.length; i++) {
      setTimeout(() => {
        cardElements[i].classList.add('reroll-shattering');
        createParticles(cardElements[i]);
      }, i * TIMING.TOTAL_STAGGER);
    }

    await new Promise(resolve => setTimeout(resolve, TIMING.TOTAL_SHATTER + (cardElements.length * TIMING.TOTAL_STAGGER)));

    // Update all card contents to show new characters
    cardElements.forEach(card => card.classList.remove('reroll-shattering'));
    if (renderCallback) {
      renderCallback();
    }

    // Phase 2: Reform all cards with stagger (700ms total)
    for (let i = 0; i < cardElements.length; i++) {
      setTimeout(() => {
        cardElements[i].classList.add('reroll-reforming');
      }, i * TIMING.TOTAL_STAGGER);
    }

    await new Promise(resolve => setTimeout(resolve, TIMING.TOTAL_REFORM + (cardElements.length * TIMING.TOTAL_STAGGER)));

    // Cleanup
    cardElements.forEach(card => card.classList.remove('reroll-reforming'));

    // Trigger Fallen ember crossfade
    triggerFallenEmberCrossfade();

    console.log('[Reroll VFX] Total reroll complete');
    isPlaying = false;

    if (onComplete) {
      onComplete();
    }
  }

  /**
   * Trigger Fallen portraits crack settle effect (single reroll)
   */
  function triggerFallenCrackSettle() {
    if (!fallenPortraits || fallenPortraits.length === 0) return;

    fallenPortraits.forEach((portrait, i) => {
      setTimeout(() => {
        const crackedGlass = portrait.wrapper.querySelector('.crackedGlass');
        if (crackedGlass) {
          crackedGlass.classList.add('crack-settle');

          setTimeout(() => {
            crackedGlass.classList.remove('crack-settle');
          }, TIMING.FALLEN_SETTLE);
        }
      }, i * 100);
    });
  }

  /**
   * Trigger Fallen portraits ember crossfade effect (total reroll)
   */
  function triggerFallenEmberCrossfade() {
    if (!fallenPortraits || fallenPortraits.length === 0) return;

    fallenPortraits.forEach((portrait, i) => {
      setTimeout(() => {
        portrait.wrapper.classList.add('ember-crossfade');

        setTimeout(() => {
          portrait.wrapper.classList.remove('ember-crossfade');
        }, TIMING.FALLEN_CROSSFADE);
      }, i * 80);
    });
  }

  /**
   * Set Fallen portrait elements for effects
   */
  function setFallenPortraits(portraits) {
    fallenPortraits = portraits;
  }

  /**
   * Stop all animations
   */
  function stop() {
    isPlaying = false;
  }

  return {
    startSingle,
    startTotal,
    setFallenPortraits,
    stop,
    isPlaying: () => isPlaying
  };
}
