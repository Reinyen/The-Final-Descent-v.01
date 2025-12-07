/**
 * Roster Selection State Machine & Store
 *
 * Authoritative state machine with strict UI-lock semantics.
 * Manages all UI state and coordinates Three.js layer via events.
 */

/**
 * State machine states
 */
export const States = {
  ENTERING_CINEMATIC: 'EnteringCinematic',
  READY: 'Ready',
  SINGLE_REROLL_ANIMATING: 'SingleRerollAnimating',
  TOTAL_REROLL_ANIMATING: 'TotalRerollAnimating',
  CONFIRMING: 'Confirming',
  EXITING: 'Exiting'
};

/**
 * Event types emitted for Three.js layer
 */
export const EventTypes = {
  // Cinematic events
  CINEMATIC_START: 'cinematic:start',
  CINEMATIC_PHASE: 'cinematic:phase',
  CINEMATIC_MORPH_UPDATE: 'cinematic:morphUpdate',
  CINEMATIC_COMPLETE: 'cinematic:complete',

  // Reroll VFX events
  REROLL_SINGLE_START: 'reroll:singleStart',
  REROLL_TOTAL_START: 'reroll:totalStart',

  // Interaction cues
  HOVER_CARD: 'hover:card',
  HOVER_END: 'hover:end',
  SELECT_CARD: 'select:card',

  // Fallen assignment (for game integration)
  FALLEN_ASSIGNED: 'fallen:assigned',

  // State changes
  STATE_CHANGE: 'state:change',
  LOCK_CHANGE: 'lock:change'
};

/**
 * Quality tiers for performance tuning
 */
export const QualityTiers = {
  AUTO: 'auto',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Create the roster store
 */
export function createRosterStore() {
  // Internal state
  let state = {
    // State machine
    currentState: States.ENTERING_CINEMATIC,
    uiLocked: true,

    // Roster data
    livingIds: [],
    fallenIds: [],
    rosterSeed: 0,
    allCharacters: [],

    // Selection & interaction
    selectedLivingId: null,
    hoveredLivingId: null,

    // Rerolls
    rerollsRemaining: 3,

    // Popover
    popoverOpen: false,
    popoverCharacterId: null,
    popoverAnchorRect: null,
    popoverFrozen: false,

    // Quality
    qualityTier: QualityTiers.AUTO,

    // Dev panel
    devPanelEnabled: false
  };

  // Event listeners
  const listeners = new Map();

  /**
   * Subscribe to events
   */
  function on(eventType, callback) {
    if (!listeners.has(eventType)) {
      listeners.set(eventType, []);
    }
    listeners.get(eventType).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = listeners.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit event to all subscribers
   */
  function emit(eventType, payload = {}) {
    const callbacks = listeners.get(eventType) || [];
    callbacks.forEach(cb => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`Error in event listener for ${eventType}:`, err);
      }
    });
  }

  /**
   * Change state machine state
   */
  function changeState(newState) {
    const oldState = state.currentState;
    state.currentState = newState;

    // Update UI lock based on state
    const wasLocked = state.uiLocked;
    state.uiLocked = newState !== States.READY;

    emit(EventTypes.STATE_CHANGE, { oldState, newState, uiLocked: state.uiLocked });

    if (wasLocked !== state.uiLocked) {
      emit(EventTypes.LOCK_CHANGE, { locked: state.uiLocked });
    }

    // Handle popover freeze/unfreeze
    if (state.uiLocked && state.popoverOpen) {
      state.popoverFrozen = true;
    } else if (!state.uiLocked && state.popoverFrozen) {
      state.popoverFrozen = false;
    }
  }

  /**
   * Initialize roster with selection result
   */
  function initRoster(payload) {
    state.livingIds = payload.livingIds;
    state.fallenIds = payload.fallenIds;
    state.rosterSeed = payload.rosterSeed;
    state.rerollsRemaining = payload.rerollsRemaining || 3;
    state.selectedLivingId = null;
    state.hoveredLivingId = null;
    state.allCharacters = payload.characters || [];
  }

  /**
   * Start entry cinematic
   */
  function startCinematic() {
    changeState(States.ENTERING_CINEMATIC);
    emit(EventTypes.CINEMATIC_START, {
      livingIds: state.livingIds,
      fallenIds: state.fallenIds
    });
  }

  /**
   * Update cinematic phase (called by Three.js layer)
   */
  function updateCinematicPhase(phase) {
    emit(EventTypes.CINEMATIC_PHASE, { phase });
  }

  /**
   * Update cinematic morph anchors (called by UI layer during cinematic)
   */
  function updateMorphAnchors(anchors) {
    if (state.currentState !== States.ENTERING_CINEMATIC) return;
    emit(EventTypes.CINEMATIC_MORPH_UPDATE, { anchors });
  }

  /**
   * Complete cinematic and unlock UI
   */
  function completeCinematic() {
    changeState(States.READY);
    emit(EventTypes.CINEMATIC_COMPLETE);

    // Emit FALLEN_ASSIGNED for each Fallen character
    state.fallenIds.forEach(id => {
      emit(EventTypes.FALLEN_ASSIGNED, { characterId: id });
    });
  }

  /**
   * Select a Living card
   */
  function selectLiving(characterId) {
    if (state.uiLocked) return;

    const isLiving = state.livingIds.includes(characterId);
    if (!isLiving) return;

    // Toggle selection (clicking same card doesn't deselect, just switches)
    state.selectedLivingId = characterId;

    emit(EventTypes.SELECT_CARD, { characterId });
  }

  /**
   * Hover over a Living card
   */
  function hoverLiving(characterId) {
    if (state.uiLocked) return;

    state.hoveredLivingId = characterId;
    emit(EventTypes.HOVER_CARD, { characterId });
  }

  /**
   * End hover
   */
  function endHover() {
    state.hoveredLivingId = null;
    emit(EventTypes.HOVER_END);
  }

  /**
   * Open popover
   */
  function openPopover(characterId, anchorRect) {
    if (state.uiLocked) return;

    state.popoverOpen = true;
    state.popoverCharacterId = characterId;
    state.popoverAnchorRect = anchorRect;
    state.popoverFrozen = false;
  }

  /**
   * Close popover
   */
  function closePopover() {
    state.popoverOpen = false;
    state.popoverCharacterId = null;
    state.popoverAnchorRect = null;
    state.popoverFrozen = false;
  }

  /**
   * Start single reroll animation
   */
  function startSingleReroll(cardRect) {
    if (state.uiLocked) return;
    if (!state.selectedLivingId) return;
    if (state.rerollsRemaining < 2) return;

    changeState(States.SINGLE_REROLL_ANIMATING);
    closePopover();

    emit(EventTypes.REROLL_SINGLE_START, {
      characterId: state.selectedLivingId,
      cardRect
    });
  }

  /**
   * Complete single reroll (called by Three.js layer when animation finishes)
   */
  function completeSingleReroll(newState) {
    state.livingIds = newState.livingIds;
    state.fallenIds = newState.fallenIds;
    state.rerollsRemaining = newState.rerollsRemaining;
    state.selectedLivingId = null;

    changeState(States.READY);
  }

  /**
   * Start total reroll animation
   */
  function startTotalReroll() {
    if (state.uiLocked) return;
    if (state.rerollsRemaining < 1) return;

    changeState(States.TOTAL_REROLL_ANIMATING);
    closePopover();

    emit(EventTypes.REROLL_TOTAL_START);
  }

  /**
   * Complete total reroll (called by Three.js layer when animation finishes)
   */
  function completeTotalReroll(newState) {
    state.livingIds = newState.livingIds;
    state.fallenIds = newState.fallenIds;
    state.rerollsRemaining = newState.rerollsRemaining;
    state.selectedLivingId = null;

    changeState(States.READY);
  }

  /**
   * Confirm selection
   */
  function confirm() {
    if (state.uiLocked) return;

    changeState(States.CONFIRMING);

    // Return confirmation payload
    return {
      rosterSeed: state.rosterSeed,
      livingIds: state.livingIds,
      fallenIds: state.fallenIds,
      rerollsRemaining: state.rerollsRemaining
    };
  }

  /**
   * Set quality tier
   */
  function setQualityTier(tier) {
    if (!Object.values(QualityTiers).includes(tier)) {
      console.warn(`Invalid quality tier: ${tier}`);
      return;
    }
    state.qualityTier = tier;
  }

  /**
   * Enable/disable dev panel
   */
  function setDevPanel(enabled) {
    state.devPanelEnabled = enabled;
  }

  /**
   * Get current state (read-only)
   */
  function getState() {
    return {
      currentState: state.currentState,
      uiLocked: state.uiLocked,
      livingIds: [...state.livingIds],
      fallenIds: [...state.fallenIds],
      selectedLivingId: state.selectedLivingId,
      hoveredLivingId: state.hoveredLivingId,
      rerollsRemaining: state.rerollsRemaining,
      popoverOpen: state.popoverOpen,
      popoverCharacterId: state.popoverCharacterId,
      popoverFrozen: state.popoverFrozen,
      qualityTier: state.qualityTier,
      devPanelEnabled: state.devPanelEnabled
    };
  }

  /**
   * Get state summary for dev panel
   */
  function getStateSummary() {
    return {
      state: state.currentState,
      locked: state.uiLocked,
      living: state.livingIds.join(', '),
      fallen: state.fallenIds.join(', '),
      selected: state.selectedLivingId || 'none',
      hovered: state.hoveredLivingId || 'none',
      rerolls: state.rerollsRemaining,
      popover: state.popoverOpen ? state.popoverCharacterId : 'closed',
      quality: state.qualityTier
    };
  }

  // Public API
  return {
    // Event subscription
    on,
    emit,

    // State machine
    changeState,
    getState,
    getStateSummary,

    // Initialization
    initRoster,
    startCinematic,
    updateCinematicPhase,
    updateMorphAnchors,
    completeCinematic,

    // Interactions
    selectLiving,
    hoverLiving,
    endHover,
    openPopover,
    closePopover,

    // Rerolls
    startSingleReroll,
    completeSingleReroll,
    startTotalReroll,
    completeTotalReroll,

    // Confirmation
    confirm,

    // Settings
    setQualityTier,
    setDevPanel
  };
}
