/**
 * Star Explosion Canvas Animation
 * Complete implementation from vertical slice
 * Duration: 2.52 seconds
 */
export class ExplosionCanvas {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.startTime = null;
    this.isActive = false;
    this.replayNonce = 0;

    // Sprites
    this.spriteSmoke = null;
    this.spriteFireWarm = null;
    this.spriteFireHot = null;
    this.spriteEnergyPurple = null;
    this.spriteEnergyTeal = null;

    // Particles
    this.particles = [];

    // Constants
    this.TAU = Math.PI * 2;
    this.DURATION = 2.52;

    // Key timings (seconds)
    this.T_SHOCK = 0.18;
    this.T_EXPAND = 0.92;
    this.T_COLLAPSE = 1.50;
    this.T_SINGULAR = 2.05;
    this.T_RINGS_START = 2.07;
    this.T_RINGS_END = 2.52;
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'explosion-canvas';
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2;
    `;

    this.ctx = this.canvas.getContext('2d', { alpha: false });
    if (!this.ctx) {
      console.error('[ExplosionCanvas] Could not get 2D context');
      return;
    }

    const container = document.getElementById('canvas-container');
    if (container) {
      container.appendChild(this.canvas);
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.initSprites();
    this.canvas.style.display = 'none';

    console.log('[ExplosionCanvas] Initialized');
  }

  resize() {
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }

  // Helpers
  clamp01(x) { return Math.max(0, Math.min(1, x)); }
  lerp(a, b, t) { return a + (b - a) * t; }
  easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  easeInCubic(t) { return t * t * t; }
  easeInOutCubic(t) { return (t < 0.5) ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  easeInExpo(t) { return (t === 0) ? 0 : Math.pow(2, 10 * (t - 1)); }
  rand(a = 0, b = 1) { return a + Math.random() * (b - a); }

  safeR(r) { return Number.isFinite(r) ? Math.max(0.0001, r) : 0.0001; }

  arcSafe(x, y, r, a0, a1, ccw = false) {
    this.ctx.arc(x, y, this.safeR(r), a0, a1, ccw);
  }

  // Organic shockwave helpers
  fract(x) { return x - Math.floor(x); }
  seeded01(n) { return this.fract(Math.sin(n) * 43758.5453123); }
  seedPhase(seed, k) { return this.seeded01(seed * 19.19 + k * 73.73) * this.TAU; }

  shockNoise(theta, time, seed) {
    const p1 = this.seedPhase(seed, 1), p2 = this.seedPhase(seed, 2),
          p3 = this.seedPhase(seed, 3), p4 = this.seedPhase(seed, 4);
    return (
      Math.sin(theta * 3.0 + time * 0.90 + p1) * 0.55 +
      Math.sin(theta * 7.0 - time * 1.10 + p2) * 0.28 +
      Math.sin(theta * 13.0 + time * 0.65 + p3) * 0.17 +
      Math.sin(theta * 23.0 - time * 0.40 + p4) * 0.08
    );
  }

  buildPerturbedRadii(segs, baseR, ampPx, time, seed, thetaOffset = 0) {
    const out = new Array(segs + 1);
    for (let i = 0; i <= segs; i++) {
      const th = (i / segs) * this.TAU + thetaOffset;
      const n = this.shockNoise(th, time, seed);
      out[i] = Math.max(0.0001, baseR + ampPx * n);
    }
    return out;
  }

  enforceInnerInsideOuter(inner, outer, margin = 1.0) {
    for (let i = 0; i < inner.length; i++) {
      inner[i] = Math.max(0.0001, Math.min(inner[i], outer[i] - margin));
    }
    return inner;
  }

  buildBlobPath(cx, cy, segs, radii) {
    this.ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const th = (i / segs) * this.TAU;
      const r = radii[i];
      const x = cx + Math.cos(th) * r;
      const y = cy + Math.sin(th) * r;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
  }

  buildRingPath(cx, cy, segs, outerR, innerR) {
    this.ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const th = (i / segs) * this.TAU;
      const r = outerR[i];
      const x = cx + Math.cos(th) * r;
      const y = cy + Math.sin(th) * r;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    for (let i = segs; i >= 0; i--) {
      const th = (i / segs) * this.TAU;
      const r = innerR[i];
      const x = cx + Math.cos(th) * r;
      const y = cy + Math.sin(th) * r;
      this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
  }

  makeBlobSprite(size, stops) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const gctx = c.getContext('2d');
    const cx = size / 2, cy = size / 2, r = size / 2;
    const g = gctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (const s of stops) g.addColorStop(s[0], s[1]);
    gctx.fillStyle = g;
    gctx.beginPath();
    gctx.arc(cx, cy, r, 0, this.TAU);
    gctx.fill();
    return c;
  }

  initSprites() {
    if (this.spriteSmoke) return;

    this.spriteSmoke = this.makeBlobSprite(128, [
      [0.0, 'rgba(210,210,210,0.35)'],
      [0.45, 'rgba(120,120,120,0.22)'],
      [1.0, 'rgba(0,0,0,0)']
    ]);

    this.spriteFireWarm = this.makeBlobSprite(128, [
      [0.00, 'rgba(255,255,255,0.70)'],
      [0.18, 'rgba(250,252,255,0.30)'],
      [0.42, 'rgba(235,245,255,0.16)'],
      [0.75, 'rgba(255,255,255,0.05)'],
      [1.00, 'rgba(0,0,0,0)']
    ]);

    this.spriteFireHot = this.makeBlobSprite(128, [
      [0.00, 'rgba(255,255,255,0.92)'],
      [0.30, 'rgba(255,255,255,0.26)'],
      [1.00, 'rgba(0,0,0,0)']
    ]);

    this.spriteEnergyPurple = this.makeBlobSprite(128, [
      [0.00, 'rgba(255,255,255,0.06)'],
      [0.08, 'rgba(210,140,255,0.70)'],
      [0.30, 'rgba(170,60,255,0.38)'],
      [0.55, 'rgba(120,0,255,0.20)'],
      [1.00, 'rgba(0,0,0,0)']
    ]);

    this.spriteEnergyTeal = this.makeBlobSprite(128, [
      [0.00, 'rgba(255,255,255,0.05)'],
      [0.08, 'rgba(150,255,245,0.66)'],
      [0.30, 'rgba(40,255,235,0.36)'],
      [0.55, 'rgba(0,200,190,0.20)'],
      [1.00, 'rgba(0,0,0,0)']
    ]);
  }

  makeParticles(n, cx, cy) {
    const p = [];
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * this.TAU;
      const radial = Math.pow(Math.random(), 0.42);

      const speed = this.rand(90, 240) * (0.55 + 0.45 * (1 - radial));
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const size = this.rand(1.2, 4.2) * (0.65 + 0.7 * (1 - radial));
      const heat = this.rand(0.6, 1.0);
      const smoke = this.rand(0.25, 0.95);

      const e = Math.random();
      let energy = 0;
      if (e < 0.18) energy = 1;
      else if (e < 0.36) energy = 2;

      p.push({
        x: cx, y: cy, vx, vy, size, heat, smoke,
        seed: Math.random() * 9999,
        ang: angle, rad: radial, energy,
        energyStrength: this.rand(0.85, 1.45),
        energyPhase: this.rand(0, this.TAU)
      });
    }
    return p;
  }

  start() {
    this.isActive = true;
    this.startTime = performance.now();
    this.replayNonce++;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    this.particles = this.makeParticles(1520, cx, cy);

    this.canvas.style.display = 'block';
    console.log('[ExplosionCanvas] Started');
  }

  stop() {
    this.isActive = false;
    this.canvas.style.display = 'none';
    console.log('[ExplosionCanvas] Stopped');
  }

  update() {
    if (!this.isActive || !this.startTime) return;

    const now = performance.now();
    const t = (now - this.startTime) / 1000;

    if (t >= this.DURATION) {
      this.stop();
      return;
    }

    this.render(t, now);
  }

  clear() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  drawStarCore(cx, cy, coreR, haloR, glow) {
    const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, this.safeR(haloR));
    g.addColorStop(0.00, `rgba(255,255,255,${0.95 * glow})`);
    g.addColorStop(0.18, `rgba(255,255,255,${0.55 * glow})`);
    g.addColorStop(0.45, `rgba(240,250,255,${0.18 * glow})`);
    g.addColorStop(1.00, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = g;
    this.ctx.beginPath();
    this.arcSafe(cx, cy, haloR, 0, this.TAU);
    this.ctx.fill();

    const c = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, this.safeR(coreR));
    c.addColorStop(0.00, `rgba(255,255,255,${1.00 * glow})`);
    c.addColorStop(0.55, `rgba(255,255,255,${0.85 * glow})`);
    c.addColorStop(1.00, 'rgba(255,255,255,0)');
    this.ctx.fillStyle = c;
    this.ctx.beginPath();
    this.arcSafe(cx, cy, coreR, 0, this.TAU);
    this.ctx.fill();
  }

  drawShockwave(cx, cy, t, now) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const diag = Math.hypot(w, h);

    const tt = this.clamp01(t);
    const rush = this.easeInExpo(tt);
    const engulf = Math.pow(tt, 2.25);

    const outer = Math.max(0.0001, this.lerp(28, diag * 1.30, rush));
    const shell = Math.max(0, this.lerp(22, 320, Math.pow(tt, 1.6)));
    const inner = Math.max(0.0001, outer - shell * this.lerp(0.95, 2.35, engulf));

    const alpha = (1 - tt) * 0.95;

    const seed = this.replayNonce * 0.731 + 12.34;
    const time = now * 0.001;

    const ampPx = Math.min(52, 7 + shell * (0.12 + 0.10 * (1 - tt)));
    const ampPxInner = ampPx * 0.75;

    const drift = (1 - tt) * 10;
    const dx = (this.shockNoise(1.3, time, seed) + this.shockNoise(2.7, time, seed + 3.3)) * 0.5 * drift;
    const dy = (this.shockNoise(3.1, time, seed + 1.7) + this.shockNoise(0.4, time, seed + 8.1)) * 0.5 * drift;
    const cx2 = cx + dx;
    const cy2 = cy + dy;

    const segs = Math.max(120, Math.min(220, Math.floor(140 + engulf * 60)));

    const outerR = this.buildPerturbedRadii(segs, outer, ampPx, time, seed + 11.1);
    const innerR = this.enforceInnerInsideOuter(
      this.buildPerturbedRadii(segs, inner, ampPxInner, time, seed + 37.7, 0.65),
      outerR, 1.2
    );
    const domeR = this.buildPerturbedRadii(segs, outer - shell * 0.25, ampPx * 0.65, time, seed + 99.9, 0.2);

    this.ctx.save();

    // Dome
    this.ctx.globalCompositeOperation = 'lighter';
    if ('filter' in this.ctx) this.ctx.filter = `blur(${this.lerp(0.8, 2.6, engulf)}px)`;

    const hx = cx2 - outer * 0.30;
    const hy = cy2 - outer * 0.30;
    const domeGrad = this.ctx.createRadialGradient(hx, hy, 0, cx2, cy2, this.safeR(outer * 1.02));
    const domeA = alpha * this.lerp(0.16, 0.58, engulf);
    domeGrad.addColorStop(0.00, `rgba(255,255,255,${domeA})`);
    domeGrad.addColorStop(0.25, `rgba(235,245,255,${domeA * 0.36})`);
    domeGrad.addColorStop(0.60, `rgba(200,220,255,${domeA * 0.14})`);
    domeGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

    this.ctx.fillStyle = domeGrad;
    this.buildBlobPath(cx2, cy2, segs, domeR);
    this.ctx.fill();

    // Far-side shading
    if ('filter' in this.ctx) this.ctx.filter = 'none';
    this.ctx.globalCompositeOperation = 'source-over';
    const sx = cx2 + outer * 0.22;
    const sy = cy2 + outer * 0.22;
    const shadeGrad = this.ctx.createRadialGradient(sx, sy, outer * 0.10, cx2, cy2, this.safeR(outer * 1.03));
    shadeGrad.addColorStop(0.00, 'rgba(0,0,0,0)');
    shadeGrad.addColorStop(0.55, `rgba(0,0,0,${alpha * 0.10})`);
    shadeGrad.addColorStop(1.00, `rgba(0,0,0,${alpha * 0.34})`);
    this.ctx.fillStyle = shadeGrad;
    this.buildBlobPath(cx2, cy2, segs, domeR);
    this.ctx.fill();

    // Shell annulus
    this.ctx.globalCompositeOperation = 'lighter';
    const shellGrad = this.ctx.createRadialGradient(cx2, cy2, this.safeR(inner * 0.95), cx2, cy2, this.safeR(outer + shell * 0.30));
    const rimA = alpha * 0.95;
    const fillA = alpha * this.lerp(0.10, 0.60, engulf);
    shellGrad.addColorStop(0.00, `rgba(255,255,255,${fillA * 0.10})`);
    shellGrad.addColorStop(0.55, `rgba(220,235,255,${rimA * 0.45})`);
    shellGrad.addColorStop(0.68, `rgba(255,255,255,${rimA})`);
    shellGrad.addColorStop(0.82, `rgba(190,210,255,${rimA * 0.25})`);
    shellGrad.addColorStop(1.00, 'rgba(255,255,255,0)');

    this.ctx.fillStyle = shellGrad;
    this.buildRingPath(cx2, cy2, segs, outerR, innerR);
    this.ctx.fill();

    // Near-side rim highlight
    this.ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.55})`;
    this.ctx.lineWidth = this.lerp(10, 44, engulf);
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    {
      const aStart = -0.30 * Math.PI;
      const aEnd = 0.62 * Math.PI;
      const steps = Math.max(40, Math.floor(segs * 0.22));
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const th = this.lerp(aStart, aEnd, u);
        const idx = ((Math.floor((th / this.TAU) * segs) % segs) + segs) % segs;
        const r = Math.max(0.0001, outerR[idx] + shell * 0.06);
        const x = cx2 + Math.cos(th) * r;
        const y = cy2 + Math.sin(th) * r;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();

    // Break-up filaments
    const streaks = Math.floor(90 + engulf * 90);
    for (let i = 0; i < streaks; i++) {
      const u = (i + 1) / (streaks + 1);
      const th = (u * this.TAU) + this.shockNoise(u * 7.7, time, seed + 5.5) * 0.03;
      const span = (0.06 + 0.18 * (0.5 + 0.5 * Math.sin(i * 1.9))) * (1 - 0.55 * tt);

      const p = (Math.sin(i * 17.31 + seed) * 0.5 + 0.5);
      const idx = ((Math.floor((th / this.TAU) * segs) % segs) + segs) % segs;
      const rMid = this.lerp(innerR[idx], outerR[idx], 0.25 + 0.65 * p);

      const aLine = alpha * (0.05 + 0.07 * (1 - p));
      this.ctx.strokeStyle = `rgba(255,255,255,${aLine})`;
      this.ctx.lineWidth = 0.8 + 1.8 * (1 - p);
      this.ctx.beginPath();
      const steps = 4;
      for (let k = 0; k <= steps; k++) {
        const uu = k / steps;
        const a = th + (uu - 0.5) * span;
        const wob = this.shockNoise(a, time, seed + 33.3) * (shell * 0.05);
        const r = Math.max(0.0001, rMid + wob);
        const x = cx2 + Math.cos(a) * r;
        const y = cy2 + Math.sin(a) * r;
        if (k === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }

    // Engulf flash
    const flash = Math.pow(this.clamp01((tt - 0.72) / 0.28), 1.2);
    if (flash > 0) {
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.fillStyle = `rgba(255,255,255,${flash * 0.18})`;
      this.ctx.fillRect(0, 0, w, h);

      const bloom = this.ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, this.safeR(outer * 0.55));
      bloom.addColorStop(0.0, `rgba(255,255,255,${flash * 0.35})`);
      bloom.addColorStop(1.0, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = bloom;
      this.buildBlobPath(cx2, cy2, segs, this.buildPerturbedRadii(segs, outer * 0.55, ampPx * 0.25, time, seed + 141.4));
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawFireSmokeSphere(cx, cy, phaseExpand, phaseCollapse, now) {
    this.initSprites();

    const maxR = Math.min(window.innerWidth, window.innerHeight) * 0.30 * 1.33;
    const expandR = this.lerp(8, maxR, this.easeOutCubic(phaseExpand));
    const collapseR = this.lerp(expandR, 2, this.easeInCubic(phaseCollapse));
    const sphereR = Math.max(0.0001, collapseR);

    const smokeFade = 1 - this.easeInOutCubic(this.clamp01((phaseCollapse - 0.25) / 0.75));
    const implode = this.clamp01((phaseCollapse - 0.55) / 0.45);
    const fireFade = this.clamp01(Math.max(0.25, smokeFade) + 0.95 * this.easeInExpo(implode));
    const cool = this.clamp01(1 - 0.6 * phaseExpand - 0.55 * phaseCollapse);

    const hx = cx - sphereR * 0.18;
    const hy = cy - sphereR * 0.18;

    const ldx = -0.78, ldy = -0.55;

    this.ctx.save();

    // Smoke volume
    this.ctx.globalCompositeOperation = 'source-over';
    {
      const under = this.ctx.createRadialGradient(hx, hy, 0, cx, cy, this.safeR(sphereR * 1.18));
      const a0 = 0.20 * smokeFade;
      under.addColorStop(0.00, `rgba(120,120,120,${a0 * 0.55})`);
      under.addColorStop(0.40, `rgba(80,80,80,${a0})`);
      under.addColorStop(1.00, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = under;
      this.ctx.beginPath();
      this.arcSafe(cx, cy, sphereR * 1.18, 0, this.TAU);
      this.ctx.fill();
    }

    // Smoke sprites
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const n1 = Math.sin(now * 0.0018 + p.seed) * 0.55 + Math.sin(now * 0.0011 + p.seed * 1.7) * 0.45;
      const n2 = Math.cos(now * 0.0015 + p.seed * 0.9) * 0.55 + Math.cos(now * 0.0010 + p.seed * 1.4) * 0.45;

      const radial = p.rad;
      let a = p.ang;
      a += (n1 * 0.10) * (0.4 + 0.6 * phaseExpand) * (1 - 0.6 * phaseCollapse);

      const rrBase = radial * sphereR;
      const eject = Math.pow(this.clamp01(phaseExpand), 1.65) * (0.18 + 0.82 * p.heat);
      const rr = rrBase + eject * (sphereR * 0.40) * (0.25 + 0.75 * radial);

      const pull = this.easeInCubic(phaseCollapse) * (0.15 + 0.85 * radial);
      const rrp0 = rr * (1 - pull);
      const merge = Math.pow(1 - implode, 2.35);
      const rrp = rrp0 * merge;

      const ballistic = this.easeOutCubic(this.clamp01(phaseExpand)) * (1 - 0.55 * phaseCollapse);
      const bx = (p.vx / 240) * sphereR * 0.26 * ballistic;
      const by = (p.vy / 240) * sphereR * 0.26 * ballistic;

      const x = cx + Math.cos(a) * rrp + bx + n1 * 0.35;
      const y = cy + Math.sin(a) * rrp + by + n2 * 0.35;

      const nd = Math.cos(a) * ldx + Math.sin(a) * ldy;
      const lit = 0.65 + 0.35 * (nd * 0.5 + 0.5);

      const s = p.size * (0.85 + 1.35 * (1 - radial)) * (0.9 + 0.6 * (1 - phaseCollapse));
      const smokeA =
        (0.06 + 0.12 * (1 - radial)) *
        smokeFade *
        (0.35 + 0.65 * phaseExpand) *
        (0.35 + 0.65 * p.smoke) *
        (1 - 0.25 * p.heat) *
        (0.8 + 0.2 * lit);

      if (smokeA > 0.001) {
        this.ctx.globalAlpha = smokeA;
        const r = s * (2.1 + 0.9 * radial);
        this.ctx.drawImage(this.spriteSmoke, x - r, y - r, r * 2, r * 2);
      }
    }

    // Fire/plasma
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'lighter';
    {
      const plasma = this.ctx.createRadialGradient(hx, hy, 0, cx, cy, this.safeR(sphereR * 1.10));
      const a0 = (0.78 * cool) * (1 - 0.20 * phaseCollapse);
      plasma.addColorStop(0.00, `rgba(255,255,255,${a0})`);
      plasma.addColorStop(0.18, `rgba(248,252,255,${a0 * 0.40})`);
      plasma.addColorStop(0.42, `rgba(235,245,255,${a0 * 0.18})`);
      plasma.addColorStop(0.75, `rgba(255,255,255,${a0 * 0.06})`);
      plasma.addColorStop(1.00, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = plasma;
      this.ctx.beginPath();
      this.arcSafe(cx, cy, sphereR * 1.10, 0, this.TAU);
      this.ctx.fill();

      const auraA = 0.60 * fireFade * (0.35 + 0.65 * phaseExpand) * (1 - 0.30 * phaseCollapse) * (0.75 + 0.55 * implode);

      const gp = this.ctx.createRadialGradient(cx - sphereR * 0.10, cy - sphereR * 0.22, 0, cx - sphereR * 0.10, cy - sphereR * 0.22, this.safeR(sphereR * 1.08));
      gp.addColorStop(0.00, `rgba(255,255,255,${auraA * 0.08})`);
      gp.addColorStop(0.22, `rgba(220,150,255,${auraA * 0.55})`);
      gp.addColorStop(0.55, `rgba(160,60,255,${auraA * 0.30})`);
      gp.addColorStop(0.82, `rgba(110,0,255,${auraA * 0.12})`);
      gp.addColorStop(1.00, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = gp;
      this.ctx.beginPath();
      this.arcSafe(cx - sphereR * 0.05, cy - sphereR * 0.10, sphereR * 1.08, 0, this.TAU);
      this.ctx.fill();

      const gt = this.ctx.createRadialGradient(cx + sphereR * 0.18, cy + sphereR * 0.10, 0, cx + sphereR * 0.18, cy + sphereR * 0.10, this.safeR(sphereR * 1.05));
      gt.addColorStop(0.00, `rgba(255,255,255,${auraA * 0.06})`);
      gt.addColorStop(0.22, `rgba(170,255,245,${auraA * 0.52})`);
      gt.addColorStop(0.55, `rgba(40,255,235,${auraA * 0.28})`);
      gt.addColorStop(0.82, `rgba(0,200,190,${auraA * 0.12})`);
      gt.addColorStop(1.00, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = gt;
      this.ctx.beginPath();
      this.arcSafe(cx + sphereR * 0.06, cy + sphereR * 0.04, sphereR * 1.05, 0, this.TAU);
      this.ctx.fill();
    }

    // Fire + glints
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      const n1 = Math.sin(now * 0.0018 + p.seed) * 0.55 + Math.sin(now * 0.0011 + p.seed * 1.7) * 0.45;
      const n2 = Math.cos(now * 0.0015 + p.seed * 0.9) * 0.55 + Math.cos(now * 0.0010 + p.seed * 1.4) * 0.45;

      const radial = p.rad;
      let a = p.ang;
      a += (n1 * 0.10) * (0.4 + 0.6 * phaseExpand) * (1 - 0.6 * phaseCollapse);

      const rrBase = radial * sphereR;
      const eject = Math.pow(this.clamp01(phaseExpand), 1.65) * (0.18 + 0.82 * p.heat);
      const rr = rrBase + eject * (sphereR * 0.40) * (0.25 + 0.75 * radial);

      const pull = this.easeInCubic(phaseCollapse) * (0.15 + 0.85 * radial);
      const rrp0 = rr * (1 - pull);
      const merge = Math.pow(1 - implode, 2.35);
      const rrp = rrp0 * merge;

      const ballistic = this.easeOutCubic(this.clamp01(phaseExpand)) * (1 - 0.55 * phaseCollapse);
      const bx = (p.vx / 240) * sphereR * 0.26 * ballistic;
      const by = (p.vy / 240) * sphereR * 0.26 * ballistic;

      const x = cx + Math.cos(a) * rrp + bx + n1 * 0.35;
      const y = cy + Math.sin(a) * rrp + by + n2 * 0.35;

      const nd = Math.cos(a) * ldx + Math.sin(a) * ldy;
      const lit = 0.65 + 0.35 * (nd * 0.5 + 0.5);

      const s = p.size * (0.85 + 1.35 * (1 - radial)) * (0.9 + 0.6 * (1 - phaseCollapse));
      const fireA =
        (0.05 + 0.14 * (1 - radial)) *
        fireFade *
        (0.65 + 0.35 * p.heat) *
        (0.35 + 0.65 * cool) *
        (0.75 + 0.25 * lit);

      if (fireA > 0.001) {
        this.ctx.globalAlpha = fireA;
        const r1 = s * 1.9;
        this.ctx.drawImage(this.spriteFireWarm, x - r1, y - r1, r1 * 2, r1 * 2);

        const hotA = fireA * p.heat * p.heat * 0.68;
        if (hotA > 0.001) {
          this.ctx.globalAlpha = hotA;
          const r2 = s * 1.2;
          this.ctx.drawImage(this.spriteFireHot, x - r2, y - r2, r2 * 2, r2 * 2);
        }

        if (p.energy) {
          const flicker = 0.65 + 0.35 * Math.sin(now * 0.012 + p.energyPhase);
          const eGate = (0.55 + 0.45 * phaseExpand) * (1 - 0.18 * phaseCollapse) * (0.35 + 0.65 * this.easeInExpo(implode));
          const eA = Math.min(1, fireA * (2.2 + 4.2 * implode) * p.energyStrength * flicker * eGate);

          if (eA > 0.001) {
            const spr = (p.energy === 1) ? this.spriteEnergyPurple : this.spriteEnergyTeal;

            const outward = sphereR * (0.10 + 0.22 * p.rad) * (1 - 0.85 * implode);
            const ex = x + Math.cos(a) * outward + n1 * 1.9;
            const ey = y + Math.sin(a) * outward + n2 * 1.9;

            this.ctx.save();
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.globalAlpha = eA;
            const rg = s * (2.0 + 1.5 * p.energyStrength);
            this.ctx.drawImage(spr, ex - rg, ey - rg, rg * 2, rg * 2);

            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.globalAlpha = eA * 0.55;
            const rc = s * (0.95 + 0.85 * p.energyStrength);
            this.ctx.drawImage(spr, ex - rc, ey - rc, rc * 2, rc * 2);
            this.ctx.restore();
          }
        }
      }
    }

    this.ctx.globalAlpha = 1;
    this.ctx.restore();
  }

  drawInfallStreaks(cx, cy, phase) {
    const n = 120;
    const maxR = Math.min(window.innerWidth, window.innerHeight) * 0.42;
    const t = this.clamp01(phase);
    const pull = this.easeInExpo(t);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.lineCap = 'round';

    for (let i = 0; i < n; i++) {
      const a = (i / n) * this.TAU + Math.sin(i * 1.7) * 0.03;
      const r1 = maxR * (0.25 + 0.75 * Math.random());
      const r2 = r1 * (1 - 0.85 * pull);
      const x1 = cx + Math.cos(a) * r1;
      const y1 = cy + Math.sin(a) * r1;
      const x2 = cx + Math.cos(a) * r2;
      const y2 = cy + Math.sin(a) * r2;

      const aLine = 0.08 * (1 - t) + 0.12 * t;
      this.ctx.strokeStyle = `rgba(255,255,255,${aLine * (0.25 + 0.75 * Math.random())})`;
      this.ctx.lineWidth = 1.2 + 1.8 * (1 - t) * Math.random();
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawEnergyBall(cx, cy, phase, now) {
    const t = this.clamp01(phase);
    if (t <= 0) return;

    const time = now * 0.001;
    const build = this.easeInExpo(t);
    const snap = Math.pow(this.clamp01((t - 0.82) / 0.18), 1.2);

    const ballR = Math.max(0.0001, this.lerp(44, 12, this.easeInCubic(t)));

    const jitter = (0.9 + 6.0 * build) * (0.65 + 0.35 * Math.sin(now * 0.08));
    const jx = this.shockNoise(1.9, time * 1.3, this.replayNonce + 77.7) * jitter;
    const jy = this.shockNoise(2.6, time * 1.3, this.replayNonce + 13.3) * jitter;
    const cx2 = cx + jx;
    const cy2 = cy + jy;

    const hash = (n) => {
      const x = Math.sin(n * 999.123 + this.replayNonce * 77.77) * 43758.5453;
      return x - Math.floor(x);
    };

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';

    // White-hot core
    const aCore = 0.95 * build;
    const coreG = this.ctx.createRadialGradient(cx2 - ballR * 0.18, cy2 - ballR * 0.22, 0, cx2, cy2, this.safeR(ballR * 2.6));
    coreG.addColorStop(0.00, `rgba(255,255,255,${aCore * 0.95})`);
    coreG.addColorStop(0.10, `rgba(255,255,255,${aCore * 0.70})`);
    coreG.addColorStop(0.28, `rgba(248,252,255,${aCore * 0.32})`);
    coreG.addColorStop(0.65, `rgba(255,255,255,${aCore * 0.10})`);
    coreG.addColorStop(1.00, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = coreG;
    this.ctx.beginPath();
    this.arcSafe(cx2, cy2, ballR * 2.6, 0, this.TAU);
    this.ctx.fill();

    // Purple + teal corona
    const auraA = 0.95 * build;
    const gp = this.ctx.createRadialGradient(cx2 - ballR * 0.12, cy2 - ballR * 0.26, 0, cx2, cy2, this.safeR(ballR * 2.1));
    gp.addColorStop(0.00, `rgba(255,255,255,${auraA * 0.10})`);
    gp.addColorStop(0.18, `rgba(220,150,255,${auraA * 0.60})`);
    gp.addColorStop(0.45, `rgba(160,60,255,${auraA * 0.34})`);
    gp.addColorStop(0.78, `rgba(110,0,255,${auraA * 0.14})`);
    gp.addColorStop(1.00, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = gp;
    this.ctx.beginPath();
    this.arcSafe(cx2, cy2, ballR * 2.1, 0, this.TAU);
    this.ctx.fill();

    const gt = this.ctx.createRadialGradient(cx2 + ballR * 0.18, cy2 + ballR * 0.10, 0, cx2, cy2, this.safeR(ballR * 2.0));
    gt.addColorStop(0.00, `rgba(255,255,255,${auraA * 0.08})`);
    gt.addColorStop(0.18, `rgba(170,255,245,${auraA * 0.55})`);
    gt.addColorStop(0.45, `rgba(40,255,235,${auraA * 0.30})`);
    gt.addColorStop(0.78, `rgba(0,200,190,${auraA * 0.12})`);
    gt.addColorStop(1.00, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = gt;
    this.ctx.beginPath();
    this.arcSafe(cx2, cy2, ballR * 2.0, 0, this.TAU);
    this.ctx.fill();

    // Irregular knot surface
    const segs = 180;
    const ampPx = Math.min(18, 2.5 + ballR * 0.18 + 6.0 * build);
    const blob = this.buildPerturbedRadii(segs, ballR * 1.05, ampPx, time * 1.8, this.replayNonce + 222.2, 0.4);
    const knotG = this.ctx.createRadialGradient(cx2 - ballR * 0.12, cy2 - ballR * 0.12, 0, cx2, cy2, this.safeR(ballR * 1.55));
    knotG.addColorStop(0.00, `rgba(255,255,255,${0.75 * build})`);
    knotG.addColorStop(0.40, `rgba(255,255,255,${0.18 * build})`);
    knotG.addColorStop(1.00, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = knotG;
    this.buildBlobPath(cx2, cy2, segs, blob);
    this.ctx.fill();

    // Crackling filaments
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    const filN = Math.floor(22 + 60 * build);
    for (let i = 0; i < filN; i++) {
      const u = (i + 1) / (filN + 1);
      const baseA = u * this.TAU + this.shockNoise(u * 6.3, time * 2.5, this.replayNonce + 17.17) * 0.08;
      const span = (0.22 + 0.55 * hash(i * 3.7 + 9.1)) * (0.45 + 0.55 * (1 - t));
      const rad = ballR * (0.85 + 0.95 * hash(i * 5.1 + 3.3));
      const isPurple = (hash(i * 11.1 + 1.7) < 0.5);

      const aL = (0.06 + 0.16 * hash(i * 7.7 + 5.5)) * (0.45 + 0.55 * build);
      this.ctx.strokeStyle = isPurple ? `rgba(190,90,255,${aL})` : `rgba(40,255,235,${aL})`;
      this.ctx.lineWidth = 1.1 + 2.2 * (1 - u) + 1.4 * build;

      this.ctx.beginPath();
      const steps = 8;
      for (let k = 0; k <= steps; k++) {
        const uu = k / steps;
        const a = baseA + (uu - 0.5) * span;
        const wob = this.shockNoise(a, time * 3.2, this.replayNonce + 99.9 + i * 0.13) * (ballR * (0.10 + 0.10 * build));
        const rr = Math.max(0.0001, rad + wob);
        const x = cx2 + Math.cos(a) * rr;
        const y = cy2 + Math.sin(a) * rr;
        if (k === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.stroke();
    }

    // Infall sparks
    const sparkN = Math.floor(40 + 120 * build);
    for (let i = 0; i < sparkN; i++) {
      const a = hash(i * 13.7 + 7.2) * this.TAU;
      const r0 = ballR * (1.8 + 2.6 * hash(i * 19.1 + 3.3));
      const r1 = ballR * (0.25 + 0.75 * hash(i * 23.9 + 1.1));

      const x0 = cx2 + Math.cos(a) * r0;
      const y0 = cy2 + Math.sin(a) * r0;
      const x1 = cx2 + Math.cos(a) * r1;
      const y1 = cy2 + Math.sin(a) * r1;

      const col = (hash(i * 29.7 + 4.4) < 0.5)
        ? `rgba(190,90,255,${0.03 + 0.06 * build})`
        : `rgba(40,255,235,${0.03 + 0.06 * build})`;
      this.ctx.strokeStyle = col;
      this.ctx.lineWidth = 1.0 + 1.6 * build;
      this.ctx.beginPath();
      this.ctx.moveTo(x0, y0);
      this.ctx.lineTo(x1, y1);
      this.ctx.stroke();
    }

    this.ctx.restore();

    // Snap flash
    if (snap > 0) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.fillStyle = `rgba(255,255,255,${snap * 0.22})`;
      this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      const g = this.ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, this.safeR(ballR * 7.0));
      g.addColorStop(0.0, `rgba(255,255,255,${snap * 0.55})`);
      g.addColorStop(0.35, `rgba(255,255,255,${snap * 0.18})`);
      g.addColorStop(1.0, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = g;
      this.ctx.beginPath();
      this.arcSafe(cx2, cy2, ballR * 7.0, 0, this.TAU);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawSingularity(cx, cy, phase, now) {
    const t = this.clamp01(phase);
    const r = Math.max(0.0001, this.lerp(7, 1.2, this.easeInCubic(t)));
    const halo = Math.max(0.0001, this.lerp(52, 14, this.easeInExpo(t)));
    const glow = 0.95 + 0.15 * Math.sin(now * 0.03);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';

    this.ctx.fillStyle = `rgba(0,0,0,${0.45 + 0.35 * t})`;
    this.ctx.beginPath();
    this.arcSafe(cx, cy, this.lerp(2.8, 6.8, t), 0, this.TAU);
    this.ctx.fill();

    this.drawStarCore(cx, cy, r, halo, glow);
    this.ctx.restore();
  }

  drawPulseRings(cx, cy, tNorm, now) {
    const count = 5;
    const spacing = 1 / count;
    for (let i = 0; i < count; i++) {
      const start = i * spacing;
      const end = start + spacing * 1.05;
      const tt = (tNorm - start) / (end - start);
      if (tt <= 0 || tt >= 1) continue;
      this.drawShockwave(cx, cy, this.clamp01(tt), now);
    }
  }

  vignette() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const g = this.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.1, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.65)');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, w, h);
  }

  render(t, now) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;

    this.clear();

    const pre = this.clamp01(t / 0.08);
    const post = this.clamp01((this.T_RINGS_END + 0.5 - t) / 0.35);
    const baseGlow = this.clamp01(pre) * this.clamp01(post);

    // Initial shockwave
    if (t >= 0 && t < this.T_SHOCK) {
      const tt = t / this.T_SHOCK;
      const shake = (1 - tt) * 6.0;
      const ox = Math.sin(now * 0.090) * shake * 0.35;
      const oy = Math.cos(now * 0.075) * shake * 0.35;
      this.drawStarCore(cx + ox, cy + oy, 4.4, 68, 1.0 * baseGlow);
      this.drawShockwave(cx + ox, cy + oy, tt, now);
    }

    // Expansion
    const expandPhase = (t < this.T_EXPAND) ? this.clamp01((t - 0.02) / (this.T_EXPAND - 0.02)) : 1;
    const collapsePhase = (t > this.T_EXPAND) ? this.clamp01((t - this.T_EXPAND) / (this.T_COLLAPSE - this.T_EXPAND)) : 0;
    const singularPhase = (t > this.T_COLLAPSE) ? this.clamp01((t - this.T_COLLAPSE) / (this.T_SINGULAR - this.T_COLLAPSE)) : 0;

    // Fire/smoke sphere
    if (t < this.T_SINGULAR) {
      const coreGlow = this.lerp(1.0, 0.55, this.clamp01(expandPhase)) * (1 - 0.35 * this.clamp01(collapsePhase));
      this.drawStarCore(cx, cy, 3.6, 52, coreGlow * baseGlow);
      this.drawFireSmokeSphere(cx, cy, expandPhase, collapsePhase, now);
    }

    // Infall streaks
    if (t >= this.T_EXPAND && t < this.T_SINGULAR) {
      this.drawInfallStreaks(cx, cy, this.clamp01((t - this.T_EXPAND) / (this.T_SINGULAR - this.T_EXPAND)));
    }

    // Singularity
    if (t >= this.T_COLLAPSE) {
      this.drawSingularity(cx, cy, singularPhase, now);
    }

    // Energy knot
    const energyStart = this.T_SINGULAR - 0.25;
    if (t >= energyStart && t < this.T_RINGS_START) {
      const ep = this.clamp01((t - energyStart) / (this.T_RINGS_START - energyStart));
      this.drawEnergyBall(cx, cy, ep, now);
    }

    // Final 5 shockwaves
    if (t >= this.T_RINGS_START && t <= this.T_RINGS_END) {
      const tn = this.clamp01((t - this.T_RINGS_START) / (this.T_RINGS_END - this.T_RINGS_START));
      this.drawPulseRings(cx, cy, tn, now);
    }

    // Afterglow
    if (t > this.T_RINGS_END) {
      const quiet = this.clamp01((t - this.T_RINGS_END) / 0.6);
      this.drawStarCore(cx, cy, 1.6, this.lerp(22, 10, quiet), this.lerp(0.9, 0.35, quiet));
    }

    this.vignette();
  }

  destroy() {
    this.stop();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    console.log('[ExplosionCanvas] Destroyed');
  }
}
