/**
 * Reroll UI - Stars Display, Button Gating, Crumble Animation
 *
 * Implements:
 * - Celestial Rerolls display with 3 discrete star icons
 * - Unspent: filled/glowing; Spent: crumble-to-ash then empty
 * - Button gating logic
 * - Spend timing (immediate deduction after gating, before animation)
 */

import { singleReroll, totalReroll } from '../core/rosterSelection.js';

/**
 * Create reroll star elements
 */
export function createRerollStars(container) {
  if (!container) return [];

  const stars = [];

  for (let i = 0; i < 3; i++) {
    const star = document.createElement('div');
    star.className = 'reroll-pip';
    star.dataset.index = String(i);

    // Inner glow element
    const glow = document.createElement('div');
    glow.className = 'pip-glow';
    star.appendChild(glow);

    container.appendChild(star);
    stars.push(star);
  }

  return stars;
}

/**
 * Update star visuals based on rerolls remaining
 */
export function updateStarVisuals(stars, rerollsRemaining) {
  if (!stars || stars.length === 0) return;

  stars.forEach((star, index) => {
    if (index < rerollsRemaining) {
      star.classList.remove('is-empty');
      star.classList.add('is-filled');
    } else {
      star.classList.add('is-empty');
      star.classList.remove('is-filled');
    }
  });
}

/**
 * Crumble star animation
 */
export function crumbleStar(star) {
  if (!star) return Promise.resolve();

  return new Promise(resolve => {
    // Create ash fragments
    const fragmentCount = 20;
    const rect = star.getBoundingClientRect();

    for (let i = 0; i < fragmentCount; i++) {
      const fragment = document.createElement('div');
      fragment.className = 'star-ash-fragment';

      // Random spread
      const angle = (Math.random() * Math.PI * 2);
      const distance = 20 + Math.random() * 30;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance + Math.random() * 40; // Bias downward

      fragment.style.setProperty('--dx', `${dx}px`);
      fragment.style.setProperty('--dy', `${dy}px`);
      fragment.style.setProperty('--delay', `${Math.random() * 0.1}s`);

      // Position at center of star
      fragment.style.left = '50%';
      fragment.style.top = '50%';

      star.appendChild(fragment);

      // Remove after animation
      setTimeout(() => {
        fragment.remove();
      }, 800);
    }

    // Mark star as empty after crumble
    setTimeout(() => {
      star.classList.add('is-empty');
      star.classList.remove('is-filled');
      resolve();
    }, 400);
  });
}

/**
 * Spend reroll stars with crumble animation
 */
export async function spendStars(stars, count, rerollsRemaining) {
  if (!stars || count <= 0) return;

  const promises = [];

  // Crumble stars from right to left
  for (let i = 0; i < count; i++) {
    const starIndex = rerollsRemaining - 1 - i;
    if (starIndex >= 0 && starIndex < stars.length) {
      promises.push(crumbleStar(stars[starIndex]));
      // Stagger slightly
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return Promise.all(promises);
}

/**
 * Update button states based on gating logic
 */
export function updateButtonGating(buttons, state) {
  if (!buttons) return;

  const { singleRerollBtn, totalRerollBtn, confirmBtn } = buttons;

  // Single Reroll gating: requires selectedLivingId != null AND rerollsRemaining >= 2 AND uiLocked==false
  if (singleRerollBtn) {
    const canSingleReroll =
      state.selectedLivingId !== null &&
      state.rerollsRemaining >= 2 &&
      !state.uiLocked;

    singleRerollBtn.disabled = !canSingleReroll;
  }

  // Total Reroll gating: requires rerollsRemaining >= 1 AND uiLocked==false
  if (totalRerollBtn) {
    const canTotalReroll =
      state.rerollsRemaining >= 1 &&
      !state.uiLocked;

    totalRerollBtn.disabled = !canTotalReroll;
  }

  // Confirm gating: disabled when uiLocked==true
  if (confirmBtn) {
    confirmBtn.disabled = state.uiLocked;
  }
}

/**
 * Setup reroll button handlers
 */
export function setupRerollButtons(buttons, stars, store, selectionLogic) {
  if (!buttons || !stars || !store) return;

  const { singleRerollBtn, totalRerollBtn } = buttons;

  /**
   * Handle single reroll
   */
  if (singleRerollBtn) {
    singleRerollBtn.addEventListener('click', async () => {
      const state = store.getState();

      // Check gating
      if (!state.selectedLivingId || state.rerollsRemaining < 2 || state.uiLocked) {
        return;
      }

      // Get card rect for animation
      const selectedIndex = state.livingIds.indexOf(state.selectedLivingId);
      const cardElements = document.querySelectorAll('.livingCard');
      const cardRect = cardElements[selectedIndex]?.getBoundingClientRect();

      // Spend stars immediately (before animation)
      await spendStars(stars, 2, state.rerollsRemaining);

      // Execute logic (deterministic swap)
      const newState = singleReroll(
        {
          livingIds: state.livingIds,
          fallenIds: state.fallenIds,
          rngState: selectionLogic.rngState || state.rosterSeed,
          rerollsRemaining: state.rerollsRemaining
        },
        state.selectedLivingId
      );

      // Start animation via store
      store.startSingleReroll(cardRect);

      // Update logic state
      selectionLogic.rngState = newState.rngState;

      // VFX will call completeSingleReroll when animation finishes (1.5s total)
      setTimeout(() => {
        store.completeSingleReroll(newState);
      }, 1500);
    });
  }

  /**
   * Handle total reroll
   */
  if (totalRerollBtn) {
    totalRerollBtn.addEventListener('click', async () => {
      const state = store.getState();

      // Check gating
      if (state.rerollsRemaining < 1 || state.uiLocked) {
        return;
      }

      // Spend star immediately (before animation)
      await spendStars(stars, 1, state.rerollsRemaining);

      // Execute logic (deterministic resample)
      const newState = totalReroll({
        livingIds: state.livingIds,
        fallenIds: state.fallenIds,
        rngState: selectionLogic.rngState || state.rosterSeed,
        rerollsRemaining: state.rerollsRemaining
      });

      // Start animation via store
      store.startTotalReroll();

      // Update logic state
      selectionLogic.rngState = newState.rngState;

      // VFX will call completeTotalReroll when animation finishes (1.6s total)
      setTimeout(() => {
        store.completeTotalReroll(newState);
      }, 1650);
    });
  }

  // Update button states on state change
  store.on('state:change', () => {
    updateButtonGating(buttons, store.getState());
  });

  store.on('lock:change', () => {
    updateButtonGating(buttons, store.getState());
  });

  // Initial update
  updateButtonGating(buttons, store.getState());
}
