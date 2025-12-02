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

    if (clamped < 1.0) {
      return {
        name: 'fade_in',
        phaseT: clamped / 1.0,
        globalT: clamped / 6.5,
        elapsed: clamped,
        phaseStart: 0.0,
        phaseEnd: 1.0
      };
    } else if (clamped < 4.0) {
      return {
        name: 'comet_approach',
        phaseT: (clamped - 1.0) / 3.0,
        globalT: clamped / 6.5,
        elapsed: clamped,
        phaseStart: 1.0,
        phaseEnd: 4.0
      };
    } else if (clamped < 4.5) {
      return {
        name: 'impact',
        phaseT: (clamped - 4.0) / 0.5,
        globalT: clamped / 6.5,
        elapsed: clamped,
        phaseStart: 4.0,
        phaseEnd: 4.5
      };
    } else if (clamped < 5.5) {
      return {
        name: 'crater_settle',
        phaseT: (clamped - 4.5) / 1.0,
        globalT: clamped / 6.5,
        elapsed: clamped,
        phaseStart: 4.5,
        phaseEnd: 5.5
      };
    } else if (clamped < 6.5) {
      return {
        name: 'button_reveal',
        phaseT: (clamped - 5.5) / 1.0,
        globalT: clamped / 6.5,
        elapsed: clamped,
        phaseStart: 5.5,
        phaseEnd: 6.5
      };
    } else {
      return {
        name: 'complete',
        phaseT: 1.0,
        globalT: 1.0,
        elapsed: clamped,
        phaseStart: 6.5,
        phaseEnd: Infinity
      };
    }
  }

  updateSceneSystems(phase, elapsedTime, deltaTime) {
    // Update starfield (fade in, twinkling)
    this.scene.updateStarfield(phase, elapsedTime);

    // Update comet (position, heat)
    this.scene.updateComet(phase, elapsedTime, deltaTime);

    // Update explosion (explosion, implosion, shockwave)
    this.scene.updateExplosion(phase, elapsedTime, deltaTime);

    // Update camera (shake during impact)
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
