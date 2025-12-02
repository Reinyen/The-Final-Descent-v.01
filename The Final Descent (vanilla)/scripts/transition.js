import * as THREE from 'three';

/**
 * Handles the black hole descent transition animation
 * User falls into the black hole with acceleration, stars move at warp speed,
 * screen fades to black, then navigates to next page
 */
export class BlackHoleTransition {
  constructor(scene, camera, starfield, blackHole) {
    this.scene = scene;
    this.camera = camera;
    this.starfield = starfield;
    this.blackHole = blackHole;

    this.isTransitioning = false;
    this.transitionTime = 0;
    this.transitionDuration = 4.0; // 4 seconds total

    // Camera animation parameters
    this.startCameraPosition = new THREE.Vector3();
    this.targetCameraPosition = new THREE.Vector3(0, 0, -50); // Black hole center
    this.cameraVelocity = new THREE.Vector3(0, 0, 0);

    // Black hole animation parameters
    this.startBlackHoleScale = 1.0;
    this.targetBlackHoleScale = 50.0; // Grows to fill entire screen

    // Fade overlay
    this.createFadeOverlay();

    // Star warp effect
    this.starWarpMultiplier = 1.0;
  }

  createFadeOverlay() {
    this.fadeOverlay = document.createElement('div');
    this.fadeOverlay.id = 'transition-fade';
    this.fadeOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: black;
      opacity: 0;
      pointer-events: none;
      z-index: 100;
      transition: opacity 1s ease-out;
    `;
    document.body.appendChild(this.fadeOverlay);
  }

  start(onComplete) {
    if (this.isTransitioning) return;

    console.log('[Transition] Starting black hole descent');

    this.isTransitioning = true;
    this.transitionTime = 0;
    this.onComplete = onComplete;

    // Store starting camera position
    this.startCameraPosition.copy(this.camera.position);

    // Hide UI elements
    const titleContainer = document.getElementById('title-container');
    const buttonContainer = document.getElementById('button-container');
    if (titleContainer) titleContainer.style.opacity = '0';
    if (buttonContainer) buttonContainer.style.opacity = '0';
  }

  update(deltaTime) {
    if (!this.isTransitioning) return;

    this.transitionTime += deltaTime;
    const t = Math.min(this.transitionTime / this.transitionDuration, 1.0);

    // Black hole growth: spans full 4 seconds with ease-in (starts slow, accelerates)
    this.updateBlackHoleGrowth(t);

    // Phase 1: Fall into black hole (0-60% of transition)
    if (t < 0.6) {
      const phaseT = t / 0.6;
      const easedT = this.easeInExpo(phaseT);
      this.updateCameraFall(easedT);
      this.updateStarWarp(easedT);
    }

    // Phase 2: Warp speed stars (40-80% of transition)
    if (t >= 0.4 && t < 0.8) {
      const warpT = (t - 0.4) / 0.4;
      this.updateWarpSpeed(warpT);
    }

    // Phase 3: Fade to black (70-100% of transition)
    if (t >= 0.7) {
      const fadeT = (t - 0.7) / 0.3;
      this.fadeOverlay.style.opacity = fadeT.toString();
    }

    // Complete transition
    if (t >= 1.0) {
      this.complete();
    }
  }

  updateCameraFall(t) {
    // Exponential acceleration toward black hole
    const fallProgress = t * t * t; // Cubic easing for acceleration

    // Interpolate camera position
    this.camera.position.lerpVectors(
      this.startCameraPosition,
      this.targetCameraPosition,
      fallProgress
    );

    // Add slight rotation/wobble as falling
    const wobble = Math.sin(t * Math.PI * 8) * (1 - t) * 0.5;
    this.camera.rotation.z = wobble;
  }

  updateBlackHoleGrowth(t) {
    // Black hole grows larger over full 4 seconds
    // Ease-in quartic: starts very slow, accelerates dramatically
    const easedT = t * t * t * t;

    const scale = THREE.MathUtils.lerp(
      this.startBlackHoleScale,
      this.targetBlackHoleScale,
      easedT
    );

    const blackHoleGroup = this.blackHole.getGroup();
    blackHoleGroup.scale.setScalar(scale);
  }

  updateStarWarp(t) {
    // Gradually increase star movement speed
    this.starWarpMultiplier = 1.0 + t * 15.0; // Up to 16x speed
  }

  updateWarpSpeed(t) {
    // Stars stretch and move at warp speed
    const starGeometry = this.starfield.getGeometry();
    const positions = starGeometry.attributes.position.array;

    // Move stars backward (away from camera) creating warp effect
    const warpSpeed = 500 * t;

    for (let i = 0; i < positions.length; i += 3) {
      // Move stars along Z axis (backward)
      positions[i + 2] += warpSpeed * 0.016; // deltaTime approximation

      // Wrap stars when they go too far
      if (positions[i + 2] > 200) {
        positions[i + 2] = -200;
      }
    }

    starGeometry.attributes.position.needsUpdate = true;
  }

  easeInExpo(x) {
    return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
  }

  complete() {
    console.log('[Transition] Descent complete');
    this.isTransitioning = false;

    // Call completion callback after a brief delay
    setTimeout(() => {
      if (this.onComplete) {
        this.onComplete();
      }
    }, 500);
  }

  cleanup() {
    if (this.fadeOverlay && this.fadeOverlay.parentNode) {
      this.fadeOverlay.parentNode.removeChild(this.fadeOverlay);
    }
  }
}
