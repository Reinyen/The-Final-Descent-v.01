import { getCharacterById } from './character-data.js';
import { SelectionParticleEffect } from './roster-selection-effect.js';

/**
 * Golden orb prelude that plays between the black fade-out and UI fade-in.
 */
export class RosterIntroOrbs {
  constructor(container) {
    this.container = container;
    this.flashOverlay = null;
    this.effectShells = [];
    this.effectInstances = [];
    this.activeTimeouts = [];
    this.isPlaying = false;
    this.resolvePromise = null;
    this.currentTimings = null;
  }

  computeTimings(timingOverrides = {}) {
    const timings = {
      effectStart: 250,
      effectDuration: 1500,
      nameRevealDuration: 1000,
      nameReadHold: 2500,
      fallenReadHold: 2500,
      scatterLead: 600,
      flashDuration: 650,
      ...timingOverrides
    };

    const nameRevealStart = timings.effectStart + timings.effectDuration; // 1.75s
    const fallenCorruptStart = nameRevealStart + timings.nameRevealDuration + timings.nameReadHold; // ~5.25s
    const fallenScatterStart = fallenCorruptStart + timings.fallenReadHold; // ~7.75s

    let finalFlashStart = fallenScatterStart + timings.scatterLead;
    const totalDuration = finalFlashStart + timings.flashDuration;
    if (totalDuration > 10000) {
      const overshoot = totalDuration - 10000;
      finalFlashStart = Math.max(finalFlashStart - overshoot, nameRevealStart + timings.nameRevealDuration);
    }

    return {
      timings,
      nameRevealStart,
      fallenCorruptStart,
      fallenScatterStart,
      finalFlashStart,
      totalDuration: finalFlashStart + timings.flashDuration
    };
  }

  clearTimers() {
    this.activeTimeouts.forEach(id => clearTimeout(id));
    this.activeTimeouts = [];
  }

  teardown() {
    this.stopOrbEffects();
    this.clearTimers();
    if (this.container) {
      this.container.innerHTML = '';
      this.container.classList.add('hidden');
      this.container.classList.remove(
        'orbs-visible',
        'names-visible',
        'golden-flash',
        'fallen-corrupt',
        'fallen-scatter',
        'fallen-explode',
        'living-burst',
        'charge',
        'explode',
        'effects-active'
      );
    }
    if (this.flashOverlay) {
      this.flashOverlay.remove();
      this.flashOverlay = null;
    }
    this.currentTimings = null;
    this.isPlaying = false;
  }

  buildOrbs(livingIds, fallenIds) {
    const { livingRow, fallenRow } = this.createOrbRows(livingIds.length, fallenIds.length);

    this.effectShells = [];

    const buildOrb = (charId, isLiving, index) => {
      const char = getCharacterById(charId);
      const orb = document.createElement('div');
      orb.className = 'orb-node';
      orb.style.setProperty('--orbit-delay', `${index * 60}ms`);
      if (!isLiving) {
        orb.classList.add('orb-node--fallen');
      }

      const effectShell = document.createElement('div');
      effectShell.className = 'orb-effect-shell hidden';
      const effectCanvas = document.createElement('div');
      effectCanvas.className = 'orb-effect-canvas';
      effectShell.appendChild(effectCanvas);

      const core = document.createElement('div');
      core.className = 'orb-core';
      const smoke = document.createElement('div');
      smoke.className = 'orb-smoke';
      const halo = document.createElement('div');
      halo.className = 'orb-halo';
      const name = document.createElement('div');
      name.className = 'orb-name';
      name.textContent = char ? char.name : charId;

      orb.appendChild(effectShell);
      orb.appendChild(halo);
      orb.appendChild(core);
      orb.appendChild(smoke);
      orb.appendChild(name);

      this.effectShells.push({ shell: effectShell, canvas: effectCanvas, isLiving });
      return orb;
    };

    livingIds.forEach((id, idx) => livingRow.appendChild(buildOrb(id, true, idx)));
    fallenIds.forEach((id, idx) => fallenRow.appendChild(buildOrb(id, false, idx + livingIds.length)));

    this.container.innerHTML = '';
    this.container.appendChild(livingRow);
    this.container.appendChild(fallenRow);

    this.flashOverlay = document.createElement('div');
    this.flashOverlay.className = 'orb-flash-overlay hidden';
    this.container.appendChild(this.flashOverlay);
  }

  schedule(fn, delay) {
    const id = setTimeout(fn, delay);
    this.activeTimeouts.push(id);
    return id;
  }

  createOrbRows(livingCount, fallenCount) {
    const viewportW = window.innerWidth || 1920;
    const viewportH = window.innerHeight || 1080;

    const cardWidth = 280;
    const cardGap = 32;
    const orbWidth = 120;
    const orbPadding = Math.max(0, (cardWidth - orbWidth) / 2);
    const orbRowTopLiving = viewportH * 0.45; // Middle of living container (20% title + half of 50% middle band)
    const orbRowTopFallen = viewportH * 0.85; // Center of bottom zone (30% band)

    const livingRowWidth = livingCount * cardWidth + Math.max(0, livingCount - 1) * cardGap;
    const fallenRowWidth = fallenCount * cardWidth + Math.max(0, fallenCount - 1) * cardGap;
    const livingRow = document.createElement('div');
    const fallenRow = document.createElement('div');

    livingRow.className = 'orb-row living-row';
    fallenRow.className = 'orb-row fallen-row';

    livingRow.style.width = `${livingRowWidth}px`;
    livingRow.style.top = `${orbRowTopLiving}px`;
    livingRow.style.gap = `${cardGap}px`;
    livingRow.style.padding = `0 ${orbPadding}px`;

    // Center the fallen row relative to the living row span
    fallenRow.style.width = `${fallenRowWidth}px`;
    fallenRow.style.left = '50%';
    fallenRow.style.top = `${orbRowTopFallen}px`;
    fallenRow.style.gap = `${cardGap}px`;
    fallenRow.style.padding = `0 ${orbPadding}px`;

    return { livingRow, fallenRow };
  }

  activateOrbEffects(durationMs = 1000, predicate = () => true) {
    if (!this.effectShells.length) return;

    this.stopOrbEffects();
    const targets = this.effectShells.filter(predicate);
    if (!targets.length) return;

    this.container.classList.add('effects-active');

    targets.forEach(({ shell, canvas }) => {
      shell.classList.remove('hidden');
      const effect = new SelectionParticleEffect(canvas);
      // Slightly lighter than the full reroll effect but visually identical
      effect.sphereParticleCount = 520;
      effect.ringParticleCount = 260;
      effect.init();
      effect.start();
      this.effectInstances.push(effect);
    });

    this.schedule(() => this.stopOrbEffects(), durationMs);
  }

  stopOrbEffects() {
    this.effectInstances.forEach(instance => instance.stop());
    this.effectInstances = [];
    this.effectShells.forEach(({ shell }) => shell.classList.add('hidden'));
    this.container?.classList.remove('effects-active');
  }

  triggerExplosion() {
    if (!this.container || this.isPlaying === false) return;
    this.stopOrbEffects();
    this.container.classList.add('explode');
    if (this.flashOverlay) {
      this.flashOverlay.classList.remove('hidden');
      this.flashOverlay.classList.add('flash-active');
    }
    const flashDuration = this.currentTimings?.flashDuration ?? 650;
    this.schedule(() => {
      this.teardown();
      if (this.resolvePromise) {
        this.resolvePromise();
        this.resolvePromise = null;
      }
    }, flashDuration);
  }

  getPlannedDuration(timingOverrides = {}) {
    const { totalDuration } = this.computeTimings(timingOverrides);
    return totalDuration;
  }

  playSequence(livingIds, fallenIds, options = {}) {
    const { delayMs = 0, timings: timingOverrides = {} } = options;
    this.teardown();
    this.isPlaying = true;

    const { timings, nameRevealStart, fallenCorruptStart, fallenScatterStart, finalFlashStart } = this.computeTimings(timingOverrides);
    this.currentTimings = { ...timings, finalFlashStart };

    return new Promise((resolve) => {
      if (!this.container) {
        this.isPlaying = false;
        this.currentTimings = null;
        resolve();
        return;
      }

      this.resolvePromise = resolve;
      this.schedule(() => {
        this.buildOrbs(livingIds, fallenIds);
        this.container.classList.remove('hidden');
        requestAnimationFrame(() => {
          this.container.classList.add('orbs-visible');
        });

        this.schedule(() => {
          this.container.classList.add('charge', 'golden-flash');
          this.activateOrbEffects(timings.effectDuration);
        }, timings.effectStart);

        this.schedule(() => {
          this.container.classList.remove('golden-flash');
        }, timings.effectStart + timings.effectDuration + 50);

        this.schedule(() => {
          this.container.classList.add('names-visible');
        }, nameRevealStart);

        this.schedule(() => {
          this.container.classList.add('fallen-corrupt', 'fallen-explode');
          this.activateOrbEffects(1500, shell => !shell.isLiving);
        }, fallenCorruptStart);

        this.schedule(() => {
          this.container.classList.remove('fallen-explode');
          this.container.classList.add('fallen-scatter', 'living-burst');
          this.activateOrbEffects(1000, shell => shell.isLiving);
        }, fallenScatterStart);

        this.schedule(() => this.triggerExplosion(), finalFlashStart);
      }, delayMs);
    });
  }
}
