/**
 * Star Explosion Canvas Animation
 * 2D canvas-based explosion effect: star explosion → expansion → collapse → energy knot → shockwave pulses
 * Duration: 2.52 seconds
 */
export class ExplosionCanvas {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animationFrameId = null;
    this.startTime = null;
    this.isActive = false;

    // Sprites
    this.spriteSmoke = null;
    this.spriteFireWarm = null;
    this.spriteFireHot = null;
    this.spriteEnergyPurple = null;
    this.spriteEnergyTeal = null;

    // Particles
    this.particles = [];
    this.replayNonce = 0;

    // Constants
    this.TAU = Math.PI * 2;
    this.DURATION = 2.52; // Total animation duration in seconds
  }

  init() {
    // Create canvas element
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

    // Add to container
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
    const rand = (a = 0, b = 1) => a + Math.random() * (b - a);

    for (let i = 0; i < n; i++) {
      const angle = Math.random() * this.TAU;
      const radial = Math.pow(Math.random(), 0.42);

      const speed = rand(90, 240) * (0.55 + 0.45 * (1 - radial));
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const size = rand(1.2, 4.2) * (0.65 + 0.7 * (1 - radial));
      const heat = rand(0.6, 1.0);
      const smoke = rand(0.25, 0.95);

      const e = Math.random();
      let energy = 0;
      if (e < 0.18) energy = 1;
      else if (e < 0.36) energy = 2;

      p.push({
        x: cx, y: cy,
        vx, vy,
        size, heat, smoke,
        seed: Math.random() * 9999,
        ang: angle,
        rad: radial,
        energy,
        energyStrength: rand(0.85, 1.45),
        energyPhase: rand(0, this.TAU)
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

    // Auto-stop after duration
    if (t >= this.DURATION) {
      this.stop();
      return;
    }

    this.render(t, now);
  }

  render(t, now) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;

    // Clear
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, w, h);

    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const easeInCubic = (t) => t * t * t;
    const easeInOutCubic = (t) => (t < 0.5) ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeInExpo = (t) => (t === 0) ? 0 : Math.pow(2, 10 * (t - 1));

    // Key timings
    const T_SHOCK = 0.18;
    const T_EXPAND = 0.92;
    const T_COLLAPSE = 1.50;
    const T_SINGULAR = 2.05;
    const T_RINGS_START = 2.07;
    const T_RINGS_END = 2.52;

    const pre = clamp01(t / 0.08);
    const post = clamp01((T_RINGS_END + 0.5 - t) / 0.35);
    const baseGlow = clamp01(pre) * clamp01(post);

    // Initial shockwave
    if (t >= 0 && t < T_SHOCK) {
      const tt = t / T_SHOCK;
      const shake = (1 - tt) * 6.0;
      const ox = Math.sin(now * 0.090) * shake * 0.35;
      const oy = Math.cos(now * 0.075) * shake * 0.35;
      this.drawStarCore(cx + ox, cy + oy, 4.4, 68, 1.0 * baseGlow);
      this.drawShockwave(cx + ox, cy + oy, tt, now);
    }

    // Phases
    const expandPhase = (t < T_EXPAND) ? clamp01((t - 0.02) / (T_EXPAND - 0.02)) : 1;
    const collapsePhase = (t > T_EXPAND) ? clamp01((t - T_EXPAND) / (T_COLLAPSE - T_EXPAND)) : 0;
    const singularPhase = (t > T_COLLAPSE) ? clamp01((t - T_COLLAPSE) / (T_SINGULAR - T_COLLAPSE)) : 0;

    // Fire/smoke sphere
    if (t < T_SINGULAR) {
      const coreGlow = lerp(1.0, 0.55, clamp01(expandPhase)) * (1 - 0.35 * clamp01(collapsePhase));
      this.drawStarCore(cx, cy, 3.6, 52, coreGlow * baseGlow);
      this.drawFireSmokeSphere(cx, cy, expandPhase, collapsePhase, now);
    }

    // Infall streaks
    if (t >= T_EXPAND && t < T_SINGULAR) {
      this.drawInfallStreaks(cx, cy, clamp01((t - T_EXPAND) / (T_SINGULAR - T_EXPAND)));
    }

    // Singularity
    if (t >= T_COLLAPSE) {
      this.drawSingularity(cx, cy, singularPhase, now);
    }

    // Energy knot
    const energyStart = T_SINGULAR - 0.25;
    if (t >= energyStart && t < T_RINGS_START) {
      const ep = clamp01((t - energyStart) / (T_RINGS_START - energyStart));
      this.drawEnergyBall(cx, cy, ep, now);
    }

    // Final shockwaves
    if (t >= T_RINGS_START && t <= T_RINGS_END) {
      const tn = clamp01((t - T_RINGS_START) / (T_RINGS_END - T_RINGS_START));
      this.drawPulseRings(cx, cy, tn, now);
    }

    // Afterglow
    if (t > T_RINGS_END) {
      const quiet = clamp01((t - T_RINGS_END) / 0.6);
      const lerp = (a, b, t) => a + (b - a) * t;
      this.drawStarCore(cx, cy, 1.6, lerp(22, 10, quiet), lerp(0.9, 0.35, quiet));
    }

    this.vignette();
  }

  // Drawing methods (condensed from original for brevity)
  drawStarCore(cx, cy, coreR, haloR, glow) {
    const safeR = (r) => Math.max(0.0001, r);
    const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, safeR(haloR));
    g.addColorStop(0.00, `rgba(255,255,255,${0.95 * glow})`);
    g.addColorStop(0.18, `rgba(255,255,255,${0.55 * glow})`);
    g.addColorStop(0.45, `rgba(240,250,255,${0.18 * glow})`);
    g.addColorStop(1.00, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = g;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, safeR(haloR), 0, this.TAU);
    this.ctx.fill();

    const c = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, safeR(coreR));
    c.addColorStop(0.00, `rgba(255,255,255,${1.00 * glow})`);
    c.addColorStop(0.55, `rgba(255,255,255,${0.85 * glow})`);
    c.addColorStop(1.00, 'rgba(255,255,255,0)');
    this.ctx.fillStyle = c;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, safeR(coreR), 0, this.TAU);
    this.ctx.fill();
  }

  // Placeholder methods - implement full versions from original HTML
  drawShockwave(cx, cy, t, now) {
    // Simplified for file length - full implementation from original
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInExpo = (t) => (t === 0) ? 0 : Math.pow(2, 10 * (t - 1));

    const w = window.innerWidth;
    const h = window.innerHeight;
    const diag = Math.hypot(w, h);
    const tt = clamp01(t);
    const rush = easeInExpo(tt);
    const outer = Math.max(0.0001, lerp(28, diag * 1.30, rush));
    const alpha = (1 - tt) * 0.95;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, outer);
    g.addColorStop(0.00, `rgba(255,255,255,${alpha * 0.6})`);
    g.addColorStop(0.68, `rgba(255,255,255,${alpha})`);
    g.addColorStop(1.00, 'rgba(255,255,255,0)');
    this.ctx.fillStyle = g;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, outer, 0, this.TAU);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawFireSmokeSphere(cx, cy, phaseExpand, phaseCollapse, now) {
    // Simplified placeholder
    const maxR = Math.min(window.innerWidth, window.innerHeight) * 0.30 * 1.33;
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const easeInCubic = (t) => t * t * t;

    const expandR = lerp(8, maxR, easeOutCubic(phaseExpand));
    const collapseR = lerp(expandR, 2, easeInCubic(phaseCollapse));
    const sphereR = Math.max(0.0001, collapseR);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, sphereR * 1.2);
    const alpha = 0.8 * (1 - phaseCollapse * 0.7);
    g.addColorStop(0.0, `rgba(255,255,255,${alpha * 0.9})`);
    g.addColorStop(0.5, `rgba(235,245,255,${alpha * 0.4})`);
    g.addColorStop(1.0, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = g;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, sphereR * 1.2, 0, this.TAU);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawInfallStreaks(cx, cy, phase) {
    // Simplified
    const n = 120;
    const maxR = Math.min(window.innerWidth, window.innerHeight) * 0.42;
    const t = Math.max(0, Math.min(1, phase));
    const easeInExpo = (t) => (t === 0) ? 0 : Math.pow(2, 10 * (t - 1));
    const pull = easeInExpo(t);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.lineCap = 'round';

    for (let i = 0; i < n; i++) {
      const a = (i / n) * this.TAU;
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

  drawSingularity(cx, cy, phase, now) {
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInCubic = (t) => t * t * t;
    const easeInExpo = (t) => (t === 0) ? 0 : Math.pow(2, 10 * (t - 1));

    const t = clamp01(phase);
    const r = Math.max(0.0001, lerp(7, 1.2, easeInCubic(t)));
    const halo = Math.max(0.0001, lerp(52, 14, easeInExpo(t)));
    const glow = 0.95 + 0.15 * Math.sin(now * 0.03);

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.fillStyle = `rgba(0,0,0,${0.45 + 0.35 * t})`;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, lerp(2.8, 6.8, t), 0, this.TAU);
    this.ctx.fill();
    this.drawStarCore(cx, cy, r, halo, glow);
    this.ctx.restore();
  }

  drawEnergyBall(cx, cy, phase, now) {
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInCubic = (t) => t * t * t;
    const easeInExpo = (t) => (t === 0) ? 0 : Math.pow(2, 10 * (t - 1));

    const t = clamp01(phase);
    if (t <= 0) return;

    const build = easeInExpo(t);
    const ballR = Math.max(0.0001, lerp(44, 12, easeInCubic(t)));

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';

    const aCore = 0.95 * build;
    const g = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, ballR * 2.6);
    g.addColorStop(0.00, `rgba(255,255,255,${aCore * 0.95})`);
    g.addColorStop(0.28, `rgba(248,252,255,${aCore * 0.32})`);
    g.addColorStop(1.00, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = g;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, ballR * 2.6, 0, this.TAU);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawPulseRings(cx, cy, tNorm, now) {
    const count = 5;
    const spacing = 1 / count;
    const clamp01 = (x) => Math.max(0, Math.min(1, x));

    for (let i = 0; i < count; i++) {
      const start = i * spacing;
      const end = start + spacing * 1.05;
      const tt = (tNorm - start) / (end - start);
      if (tt <= 0 || tt >= 1) continue;
      this.drawShockwave(cx, cy, clamp01(tt), now);
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

  destroy() {
    this.stop();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    console.log('[ExplosionCanvas] Destroyed');
  }
}
