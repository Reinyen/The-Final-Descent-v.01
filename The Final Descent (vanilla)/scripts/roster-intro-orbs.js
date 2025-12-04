import { getCharacterById } from './character-data.js';
import { SelectionParticleEffect } from './roster-selection-effect.js';

/**
 * Golden orb prelude that plays between the black fade-out and UI fade-in.
 */
export class RosterIntroOrbs {
  constructor(container) {
    this.container = container;
    this.flashOverlay = null;
    this.goldenFlashOverlay = null;
    this.effectShells = [];
    this.effectInstances = [];
    this.livingNodes = [];
    this.fallenNodes = [];
    this.activeTimeouts = [];
    this.isPlaying = false;
    this.resolvePromise = null;
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
        'charge',
        'explode',
        'effects-active',
        'fallen-corrupt-phase',
        'fallen-flight'
      );
    }
    if (this.flashOverlay) {
      this.flashOverlay.remove();
      this.flashOverlay = null;
    }
    if (this.goldenFlashOverlay) {
      this.goldenFlashOverlay.remove();
      this.goldenFlashOverlay = null;
    }
    this.livingNodes = [];
    this.fallenNodes = [];
    this.isPlaying = false;
  }

  buildOrbs(livingIds, fallenIds) {
    const { livingRow, fallenRow } = this.createOrbRows(livingIds.length, fallenIds.length);

    this.effectShells = [];
    this.livingNodes = [];
    this.fallenNodes = [];

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

      const smoke = document.createElement('div');
      smoke.className = 'orb-smoke';

      const core = document.createElement('div');
      core.className = 'orb-core';
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

      const bundle = { shell: effectShell, canvas: effectCanvas, isFallen: !isLiving };
      this.effectShells.push(bundle);
      (isLiving ? this.livingNodes : this.fallenNodes).push(orb);
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

    this.goldenFlashOverlay = document.createElement('div');
    this.goldenFlashOverlay.className = 'golden-flash-overlay hidden';
    this.container.appendChild(this.goldenFlashOverlay);
  }

  schedule(fn, delay) {
    const id = setTimeout(fn, delay);
    this.activeTimeouts.push(id);
    return id;
  }

  createOrbRows(livingCount, fallenCount) {
    const viewportH = window.innerHeight || 1080;

    const livingContainer = document.getElementById('living-container');
    const fallenContainer = document.getElementById('fallen-container');
    const bottomZone = document.getElementById('bottom-zone');

    const cardWidth = 280;
    const cardGap = 32;
    const orbWidth = 120;
    const orbPadding = Math.max(0, (cardWidth - orbWidth) / 2);

    const livingRect = livingContainer?.getBoundingClientRect();
    const fallenRect = fallenContainer?.getBoundingClientRect();
    const bottomRect = bottomZone?.getBoundingClientRect();

    const orbRowTopLiving = livingRect
      ? livingRect.top + livingRect.height * 0.5
      : viewportH * 0.45; // Middle of living container (20% title + half of 50% middle band)

    const orbRowTopFallen = fallenRect
      ? fallenRect.top + fallenRect.height * 0.5
      : bottomRect
        ? bottomRect.top + bottomRect.height * 0.55
        : viewportH * 0.85; // Center of bottom zone (30% band)

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

  activateOrbEffects(durationMs = 1000, target = 'all', tintClass = '') {
    if (!this.effectShells.length) return;

    this.stopOrbEffects();
    this.container.classList.add('effects-active');

    this.effectShells.forEach(({ shell, canvas, isFallen }) => {
      if (target === 'fallen' && !isFallen) return;
      if (target === 'living' && isFallen) return;
      shell.classList.remove('hidden');
      if (tintClass) shell.classList.add(tintClass);
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
    this.effectShells.forEach(({ shell }) => {
      shell.classList.add('hidden');
      shell.classList.remove('fallen-effect');
    });
    this.container?.classList.remove('effects-active');
  }

  triggerExplosion(finalDelay = 650) {
    if (!this.container || this.isPlaying === false) return;
    this.stopOrbEffects();
    this.container.classList.add('explode');
    if (this.flashOverlay) {
      this.flashOverlay.classList.remove('hidden');
      this.flashOverlay.classList.add('flash-active');
    }
    this.schedule(() => {
      this.teardown();
      if (this.resolvePromise) {
        this.resolvePromise();
        this.resolvePromise = null;
      }
    }, finalDelay);
  }

  applyFallenCorruption() {
    this.container.classList.add('fallen-corrupt-phase');
    this.fallenNodes.forEach(node => {
      node.classList.add('fallen-corrupt');
    });
    // Purple-tinted particle burst for fallen souls
    this.activateOrbEffects(950, 'fallen', 'fallen-effect');
  }

  launchFallenFlight() {
    this.container.classList.add('fallen-flight');
    this.fallenNodes.forEach((node, idx) => {
      node.style.setProperty('--fallen-flight-delay', `${idx * 80}ms`);
      node.classList.add('fallen-flight-active');
    });
  }

  playGoldenFlash(durationMs = 1500) {
    if (!this.goldenFlashOverlay) return;
    this.goldenFlashOverlay.classList.remove('hidden');
    this.goldenFlashOverlay.style.animationDuration = `${durationMs}ms`;
    this.goldenFlashOverlay.classList.add('active');
    this.schedule(() => {
      this.goldenFlashOverlay?.classList.remove('active');
      this.goldenFlashOverlay?.classList.add('hidden');
    }, durationMs + 50);
  }

  playSequence(livingIds, fallenIds, options = {}) {
    const { delayMs = 0 } = options;
    this.teardown();
    this.isPlaying = true;

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.schedule(() => {
        this.buildOrbs(livingIds, fallenIds);
        this.container.classList.remove('hidden');
        requestAnimationFrame(() => {
          this.container.classList.add('orbs-visible');
        });

        const rerollFlash = 1500;
        const nameRevealDuration = 1000;
        const nameReadDuration = 2500;
        const fallenHoldDuration = 2500;
        const fallenFlightLead = 180;
        const livingBurstDuration = 900;

        // Stage 1: Golden reroll flash to mirror the reroll VFX
        this.playGoldenFlash(rerollFlash);
        this.activateOrbEffects(rerollFlash, 'all');

        // Stage 2: Fiery names reveal atop each orb
        this.schedule(() => {
          this.container.classList.add('names-visible');
        }, rerollFlash);

        // Stage 3: Fallen corruption and smoke
        const fallenCorruptStart = rerollFlash + nameRevealDuration + nameReadDuration;
        this.schedule(() => {
          this.applyFallenCorruption();
        }, fallenCorruptStart);

        // Stage 4: Fallen souls drift to the lower-left while living orbs charge and burst
        const fallenFlightStart = fallenCorruptStart + fallenHoldDuration;
        this.schedule(() => {
          this.launchFallenFlight();
        }, fallenFlightStart);

        this.schedule(() => {
          this.container.classList.add('charge');
          this.activateOrbEffects(livingBurstDuration, 'living');
          this.container.classList.add('explode');
        }, fallenFlightStart + fallenFlightLead);

        // Stage 5: White flash to transition into the UI
        const finalFlashStart = fallenFlightStart + livingBurstDuration;
        this.schedule(() => this.triggerExplosion(900), finalFlashStart);
      }, delayMs);
    });
  }
}
