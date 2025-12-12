export class Timeline {
  constructor(scene) {
    this.scene = scene;
    this.frozen = false;
    this.scrubbedTime = 0;
  }

  update(elapsedTime, deltaTime) {
    const effectiveTime = this.frozen ? this.scrubbedTime : elapsedTime;

    const phase = this.getPhaseInfo(effectiveTime);

    // Update scene systems based on phase
    this.updateSceneSystems(phase, effectiveTime, deltaTime);

    return phase;
  }

  getPhaseInfo(elapsed) {
    const clamped = Math.max(0, elapsed);
    const totalDuration = 4.72; // 1s fade_in + 2.52s placeholder + 1.2s UI reveals

    if (clamped < 1.0) {
      return {
        name: 'fade_in',
        phaseT: clamped / 1.0,
        globalT: clamped / totalDuration,
        elapsed: clamped,
        phaseStart: 0.0,
        phaseEnd: 1.0
      };
    } else if (clamped < 3.52) {
      return {
        name: 'placeholder_content',
        phaseT: (clamped - 1.0) / 2.52,
        globalT: clamped / totalDuration,
        elapsed: clamped,
        phaseStart: 1.0,
        phaseEnd: 3.52
      };
    } else if (clamped < 4.72) {
      return {
        name: 'ui_reveal',
        phaseT: (clamped - 3.52) / 1.2,
        globalT: clamped / totalDuration,
        elapsed: clamped,
        phaseStart: 3.52,
        phaseEnd: 4.72
      };
    } else {
      return {
        name: 'complete',
        phaseT: 1.0,
        globalT: 1.0,
        elapsed: clamped,
        phaseStart: 4.72,
        phaseEnd: Infinity
      };
    }
  }

  updateSceneSystems(phase, elapsedTime, deltaTime) {
    // Update starfield (fade in, twinkling)
    this.scene.updateStarfield(phase, elapsedTime);

    // Update explosion canvas (2D overlay during placeholder_content)
    this.scene.updateExplosionCanvas(phase, elapsedTime);

    // Update camera
    this.scene.updateCamera(phase, elapsedTime);

    // Update particles (debris, glass)
    this.scene.updateParticles(phase, elapsedTime, deltaTime);

    // Update black hole (reveal, rotation)
    this.scene.updateBlackHole(phase, elapsedTime);

    // Update star physics (gravitational pull)
    this.scene.updateStarPhysics(phase, elapsedTime, deltaTime);

    // Update post-processing (bloom spike)
    this.scene.updatePostProcessing(phase, elapsedTime);
  }

  toggleFreeze() {
    this.frozen = !this.frozen;
    if (this.frozen) {
      this.scrubbedTime = this.scene.clock.getElapsedTime();
    }
  }

  scrubTime(delta) {
    this.frozen = true;
    this.scrubbedTime = Math.max(0, Math.min(10, this.scrubbedTime + delta));
  }
}
