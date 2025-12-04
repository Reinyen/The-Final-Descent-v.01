/**
 * Roster Transition (Entry Cinematic)
 * Handles the required sequencing:
 * 1. Fade from black over 2 seconds while showing only the background.
 * 2. Hold on the background alone for 7 seconds so the orb prelude can complete.
 * 3. Fade UI in over 1 second.
 */

export class RosterTransition {
  constructor(blackoutElement) {
    this.blackoutElement = blackoutElement;
    this.isPlaying = false;
    this.elapsedTime = 0;
    this.onUIReveal = null;
    this.uiRevealTriggered = false;

    // Timings (seconds)
    this.fadeDuration = 2.0;
    this.backgroundHold = 7.0;
    this.uiFadeDuration = 1.0;
    this.totalDuration = this.fadeDuration + this.backgroundHold + this.uiFadeDuration;
  }

  setTimings({ fadeDuration, backgroundHold, uiFadeDuration } = {}) {
    if (typeof fadeDuration === 'number') {
      this.fadeDuration = fadeDuration;
    }
    if (typeof backgroundHold === 'number') {
      this.backgroundHold = backgroundHold;
    }
    if (typeof uiFadeDuration === 'number') {
      this.uiFadeDuration = uiFadeDuration;
    }
    this.totalDuration = this.fadeDuration + this.backgroundHold + this.uiFadeDuration;
  }

  start(onUIReveal) {
    this.isPlaying = true;
    this.elapsedTime = 0;
    this.uiRevealTriggered = false;
    this.onUIReveal = onUIReveal;

    if (this.blackoutElement) {
      this.blackoutElement.classList.remove('hidden');
      // Kick off the fade on the next frame for a clean transition.
      requestAnimationFrame(() => this.blackoutElement.classList.add('fade-out'));
    }
  }

  update(deltaTime) {
    if (!this.isPlaying) return;

    this.elapsedTime += deltaTime;

    if (!this.uiRevealTriggered && this.elapsedTime >= this.fadeDuration + this.backgroundHold) {
      this.uiRevealTriggered = true;
      if (this.onUIReveal) {
        this.onUIReveal();
      }
    }

    if (this.elapsedTime >= this.totalDuration) {
      this.isPlaying = false;
      if (this.blackoutElement) {
        this.blackoutElement.classList.add('hidden');
        this.blackoutElement.classList.remove('fade-out');
      }
    }
  }

  isComplete() {
    return !this.isPlaying;
  }
}
