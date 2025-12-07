/**
 * Confirm Action + Payload + Integration Hooks
 *
 * Implements:
 * - Confirm button behavior (disabled when UI locked)
 * - Confirmation payload emission per GDD spec
 * - Integration hooks for game to receive roster selection
 * - FALLEN_ASSIGNED event emission (one per Fallen ID)
 */

/**
 * Setup confirm button
 */
export function setupConfirmButton(confirmBtn, store) {
  if (!confirmBtn || !store) return;

  confirmBtn.addEventListener('click', () => {
    const state = store.getState();

    // Don't allow confirm if UI is locked
    if (state.uiLocked) return;

    // Get confirmation payload from store
    const payload = store.confirm();

    if (!payload) return;

    // Emit confirmation via multiple integration methods

    // Method 1: Window callback (if defined by game)
    if (typeof window.onRosterConfirmed === 'function') {
      window.onRosterConfirmed(payload);
    }

    // Method 2: CustomEvent (for event-driven integration)
    const event = new CustomEvent('roster:confirmed', {
      detail: payload,
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);

    // Method 3: Console log for debugging
    console.log('[Roster Selection] Confirmed:', payload);

    // Optionally, transition to a "confirmed" screen or close the UI
    // For now, we just lock the UI in the Confirming state
  });

  // Update button state on lock changes
  store.on('lock:change', ({ locked }) => {
    confirmBtn.disabled = locked;
  });

  // Initial state
  confirmBtn.disabled = store.getState().uiLocked;
}

/**
 * Setup Fallen assignment hooks
 * Called after cinematic completes and state becomes Ready
 */
export function setupFallenAssignmentHooks(store) {
  if (!store) return;

  // Listen for cinematic completion
  store.on('cinematic:complete', () => {
    const state = store.getState();

    // Emit FALLEN_ASSIGNED for each Fallen character
    state.fallenIds.forEach((characterId, index) => {
      emitFallenAssigned(characterId, index);
    });
  });
}

/**
 * Emit FALLEN_ASSIGNED event for a Fallen character
 */
function emitFallenAssigned(characterId, index) {
  // Method 1: Window callback (if defined by game)
  if (typeof window.onFallenAssigned === 'function') {
    window.onFallenAssigned({ characterId, index });
  }

  // Method 2: CustomEvent
  const event = new CustomEvent('roster:fallenAssigned', {
    detail: { characterId, index },
    bubbles: true,
    composed: true
  });
  window.dispatchEvent(event);

  // Method 3: Console log for debugging
  console.log(`[Roster Selection] Fallen Assigned: ${characterId} (index ${index})`);
}

/**
 * Initialize integration hooks
 * Sets up window API for external game integration
 */
export function initializeIntegrationAPI() {
  // Create a global API object for easy access
  window.RosterSelectionAPI = {
    // Callbacks that can be set by the game
    onRosterConfirmed: null,
    onFallenAssigned: null,

    // Method to listen for confirmation
    onConfirm: function(callback) {
      this.onRosterConfirmed = callback;
      return this;
    },

    // Method to listen for Fallen assignments
    onFallen: function(callback) {
      this.onFallenAssigned = callback;
      return this;
    },

    // Alternative: Use addEventListener
    addEventListener: function(eventType, callback) {
      if (eventType === 'confirmed') {
        window.addEventListener('roster:confirmed', e => callback(e.detail));
      } else if (eventType === 'fallenAssigned') {
        window.addEventListener('roster:fallenAssigned', e => callback(e.detail));
      }
      return this;
    }
  };

  // Expose callbacks to window for backward compatibility
  Object.defineProperty(window, 'onRosterConfirmed', {
    get: () => window.RosterSelectionAPI.onRosterConfirmed,
    set: (fn) => { window.RosterSelectionAPI.onRosterConfirmed = fn; },
    configurable: true
  });

  Object.defineProperty(window, 'onFallenAssigned', {
    get: () => window.RosterSelectionAPI.onFallenAssigned,
    set: (fn) => { window.RosterSelectionAPI.onFallenAssigned = fn; },
    configurable: true
  });

  console.log('[Roster Selection] Integration API initialized');
  console.log('Usage examples:');
  console.log('  window.RosterSelectionAPI.onConfirm(payload => console.log(payload))');
  console.log('  window.addEventListener("roster:confirmed", e => console.log(e.detail))');
}
