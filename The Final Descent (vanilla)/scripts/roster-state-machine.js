/**
 * Roster State Machine
 * Manages screen states and transitions per GDD §3.3
 *
 * States:
 * - EnteringCinematic: Entry animation playing
 * - Ready: User can interact
 * - SingleRerollAnimating: Single reroll animation playing
 * - TotalRerollAnimating: Total reroll animation playing
 * - Confirming: Transitioning to next screen
 * - Exiting: Exit animation (if needed)
 *
 * Input allowed only in Ready state.
 * uiLocked = true when not in Ready state.
 */

export const RosterState = {
  ENTERING_CINEMATIC: 'EnteringCinematic',
  READY: 'Ready',
  SINGLE_REROLL_ANIMATING: 'SingleRerollAnimating',
  TOTAL_REROLL_ANIMATING: 'TotalRerollAnimating',
  CONFIRMING: 'Confirming',
  EXITING: 'Exiting'
};

export class RosterStateMachine {
  constructor() {
    this.currentState = RosterState.ENTERING_CINEMATIC;
    this.previousState = null;
    this.listeners = new Set();

    console.log('[StateMachine] Initialized in state:', this.currentState);
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  getState() {
    return this.currentState;
  }

  /**
   * Check if UI is locked (input not allowed)
   * Per GDD §3.3: Input allowed only in Ready
   * @returns {boolean} True if UI is locked
   */
  isLocked() {
    return this.currentState !== RosterState.READY;
  }

  /**
   * Transition to a new state
   * @param {string} newState - Target state from RosterState
   * @param {object} metadata - Optional metadata about the transition
   */
  transition(newState, metadata = {}) {
    // Validate state
    if (!Object.values(RosterState).includes(newState)) {
      console.error('[StateMachine] Invalid state:', newState);
      return false;
    }

    // Check if valid transition
    if (!this._isValidTransition(this.currentState, newState)) {
      console.warn('[StateMachine] Invalid transition:', this.currentState, '→', newState);
      return false;
    }

    this.previousState = this.currentState;
    this.currentState = newState;

    console.log('[StateMachine] Transition:', this.previousState, '→', this.currentState, metadata);

    // Notify listeners
    this._notifyListeners(this.currentState, this.previousState, metadata);

    return true;
  }

  /**
   * Validate state transitions
   * @param {string} from - Current state
   * @param {string} to - Target state
   * @returns {boolean} True if transition is valid
   */
  _isValidTransition(from, to) {
    // Define valid transitions per GDD §3.3
    const validTransitions = {
      [RosterState.ENTERING_CINEMATIC]: [RosterState.READY],
      [RosterState.READY]: [
        RosterState.SINGLE_REROLL_ANIMATING,
        RosterState.TOTAL_REROLL_ANIMATING,
        RosterState.CONFIRMING,
        RosterState.EXITING
      ],
      [RosterState.SINGLE_REROLL_ANIMATING]: [RosterState.READY],
      [RosterState.TOTAL_REROLL_ANIMATING]: [RosterState.READY],
      [RosterState.CONFIRMING]: [RosterState.EXITING],
      [RosterState.EXITING]: []
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Register a state change listener
   * @param {Function} callback - Called with (newState, oldState, metadata)
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Unregister a state change listener
   * @param {Function} callback - The callback to remove
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state change
   * @param {string} newState
   * @param {string} oldState
   * @param {object} metadata
   */
  _notifyListeners(newState, oldState, metadata) {
    for (const callback of this.listeners) {
      try {
        callback(newState, oldState, metadata);
      } catch (error) {
        console.error('[StateMachine] Listener error:', error);
      }
    }
  }

  /**
   * Reset to initial state (for testing/demo)
   */
  reset() {
    this.previousState = this.currentState;
    this.currentState = RosterState.ENTERING_CINEMATIC;
    console.log('[StateMachine] Reset to:', this.currentState);
    this._notifyListeners(this.currentState, this.previousState, { reset: true });
  }

  /**
   * Get debug info
   * @returns {object} Debug information
   */
  getDebugInfo() {
    return {
      currentState: this.currentState,
      previousState: this.previousState,
      isLocked: this.isLocked(),
      listenerCount: this.listeners.size
    };
  }
}
