/**
 * Roster Scene (Three.js Layer A)
 * Recreates the cavern descent background per provided reference.
 * Visual-only layer (no input capture).
 */

import * as THREE from 'three';

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

class ImprovedNoise {
  constructor(rng) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y, z) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  noise(x, y, z) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const p = this.perm;
    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;

    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(u, this.grad(p[AA], x, y, z), this.grad(p[BA], x - 1, y, z)),
        this.lerp(u, this.grad(p[AB], x, y - 1, z), this.grad(p[BB], x - 1, y - 1, z))
      ),
      this.lerp(
        v,
        this.lerp(u, this.grad(p[AA + 1], x, y, z - 1), this.grad(p[BA + 1], x - 1, y, z - 1)),
        this.lerp(u, this.grad(p[AB + 1], x, y - 1, z - 1), this.grad(p[BB + 1], x - 1, y - 1, z - 1))
      )
    );
  }
}

function fbm(noise, x, y, z, octaves = 4) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise.noise(x * freq, y * freq, z * freq);
    freq *= 2;
    amp *= 0.5;
  }
  return value;
}

export class RosterScene {
  constructor() {
    this.container = document.getElementById('roster-canvas-container');

    // Three.js core
    this.scene = null;
    this.overlayScene = null;
    this.camera = null;
    this.overlayCamera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.elapsedTime = 0;

    // Scene objects
    this.cavernMesh = null;
    this.dust = null;
    this.dustGeom = null;
    this.dustSpeed = null;
    this.starLayers = [];
    this.pageGlowMat = null;

    // Constants
    this.radius = 18;
    this.height = 420;

    // RNG/Noise
    const seed = xmur3('intro-cavern-v2');
    this.rng = sfc32(seed(), seed(), seed(), seed());
    this.noise = new ImprovedNoise(this.rng);
  }

  async init() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050006, 0.022);

    this.overlayScene = new THREE.Scene();
    this.overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    this.camera.position.set(1.6, 0, 1.1);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = false;

    // Clear any previous canvases (defensive for hot reloads)
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container.appendChild(this.renderer.domElement);

    this.createCavern();
    this.setupLighting();
    this.createOverlay();
    this.createDust();
    this.createStarfield();

    window.addEventListener('resize', () => this.handleResize());
  }

  createCavern() {
    const radialSeg = 72;
    const heightSeg = 420;

    const geom = new THREE.CylinderGeometry(this.radius, this.radius, this.height, radialSeg, heightSeg, true);
    const pos = geom.attributes.position;
    const v = new THREE.Vector3();
    const dir = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      const nx = v.x * 0.08;
      const ny = v.y * 0.045;
      const nz = v.z * 0.08;

      const n1 = fbm(this.noise, nx, ny, nz, 5);
      const n2 = fbm(this.noise, nx * 0.5 + 11.7, ny * 0.5 - 3.2, nz * 0.5 + 9.1, 3);
      const strata = Math.sin(v.y * 0.35 + n2 * 3.0) * 0.35;

      const bend = fbm(this.noise, 0.0, v.y * 0.0105, 0.0, 4);
      const bend2 = fbm(this.noise, 0.0, v.y * 0.0068 + 19.2, 0.0, 3);
      const bendX = (bend * 1.0 + bend2 * 0.6) * 1.45;
      const bendZ = (bend * 0.7 - bend2 * 0.9) * 1.25;
      v.x += bendX;
      v.z += bendZ;

      dir.set(v.x, 0, v.z).normalize();
      const disp = (n1 * 2.2 + n2 * 1.4 + strata) * 0.65;
      v.x += dir.x * disp;
      v.z += dir.z * disp;
      v.y += (n2 * 0.6) * 0.1;

      pos.setXYZ(i, v.x, v.y, v.z);
    }

    geom.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x07070a),
      roughness: 0.98,
      metalness: 0.02,
      side: THREE.BackSide,
      emissive: new THREE.Color(0x020003),
      emissiveIntensity: 0.9
    });

    this.cavernMesh = new THREE.Mesh(geom, rockMat);
    this.scene.add(this.cavernMesh);
  }

  setupLighting() {
    const colPurple = new THREE.Color().setRGB(150 / 255, 50 / 255, 200 / 255);
    const colCrimson = new THREE.Color().setRGB(255 / 255, 55 / 255, 85 / 255);
    const colAmber = new THREE.Color().setRGB(255 / 255, 200 / 255, 90 / 255);

    this.scene.add(new THREE.AmbientLight(0x09090f, 0.75));

    const coldRim = new THREE.DirectionalLight(0x1a2030, 0.6);
    coldRim.position.set(1.5, 2.5, 1.2);
    this.scene.add(coldRim);

    const underHemi = new THREE.HemisphereLight(0x000000, colPurple, 0.72);
    this.scene.add(underHemi);

    const underDir = new THREE.DirectionalLight(colCrimson, 0.48);
    underDir.position.set(0.0, -1.0, 0.2);
    underDir.target.position.set(0, 0, -1);
    this.scene.add(underDir);
    this.scene.add(underDir.target);

    const underWarm = new THREE.DirectionalLight(colAmber, 0.22);
    underWarm.position.set(0.2, -1.0, 0.4);
    underWarm.target.position.set(0, 0, -1);
    this.scene.add(underWarm);
    this.scene.add(underWarm.target);

    this.colPurple = colPurple;
    this.colCrimson = colCrimson;
    this.colAmber = colAmber;
  }

  createOverlay() {
    this.pageGlowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uPurple: { value: this.colPurple },
        uRed: { value: this.colCrimson },
        uYellow: { value: this.colAmber }
      },
      vertexShader: `
        void main(){
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec2 uResolution;
        uniform vec3 uPurple;
        uniform vec3 uRed;
        uniform vec3 uYellow;

        float hash(vec2 p){
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 34.345);
          return fract(p.x * p.y);
        }

        void main(){
          vec2 res = max(uResolution, vec2(1.0));
          vec2 uv = gl_FragCoord.xy / res;

          float bottom = smoothstep(0.0, 0.90, 1.0 - uv.y);
          float bottom2 = bottom * bottom;
          float bottom3 = bottom2 * bottom;

          float micro = 0.94 + 0.06 * sin(uv.x * 10.0);
          float grain = 0.93 + 0.07 * (hash(uv * 38.0) - 0.5);

          vec3 col = mix(uPurple, uRed, clamp(pow(bottom, 0.85), 0.0, 1.0));
          col = mix(col, uYellow, clamp(bottom3 * 0.9, 0.0, 1.0));

          float a = bottom2 * micro * grain;
          a *= 1.20;

          gl_FragColor = vec4(col, a);
        }
      `
    });

    const pageGlow = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.pageGlowMat);
    pageGlow.frustumCulled = false;
    pageGlow.renderOrder = 0;
    this.overlayScene.add(pageGlow);
  }

  makeStarTexture({ streak = false } = {}) {
    const s = 128;
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const ctx = c.getContext('2d');
    const cx = s / 2;
    const cy = s / 2;

    ctx.clearRect(0, 0, s, s);

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.5);
    g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    g.addColorStop(0.10, 'rgba(255,255,255,0.98)');
    g.addColorStop(0.30, 'rgba(255,255,255,0.35)');
    g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineCap = 'round';

    const spike = (len, w) => {
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
    };

    spike(s * 0.23, 2.3);
    ctx.rotate(Math.PI / 2);
    spike(s * 0.23, 2.3);
    ctx.rotate(Math.PI / 4);
    spike(s * 0.18, 1.8);
    ctx.rotate(Math.PI / 2);
    spike(s * 0.18, 1.8);

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (streak) {
      ctx.globalCompositeOperation = 'lighter';

      const h = s * 0.72;
      const w = s * 0.10;
      const y0 = cy - h * 0.5;
      const y1 = cy + h * 0.5;

      const lg = ctx.createLinearGradient(0, y0, 0, y1);
      lg.addColorStop(0.0, 'rgba(255,255,255,0.0)');
      lg.addColorStop(0.35, 'rgba(255,255,255,0.40)');
      lg.addColorStop(0.50, 'rgba(255,255,255,0.70)');
      lg.addColorStop(0.65, 'rgba(255,255,255,0.40)');
      lg.addColorStop(1.0, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.roundRect(cx - w * 0.5, y0, w, h, w * 0.5);
      ctx.fill();

      const g3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.42);
      g3.addColorStop(0.0, 'rgba(255,255,255,0.22)');
      g3.addColorStop(1.0, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = g3;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  makeStarMaterial({ map, baseSize, maxSize, twinkleStrength }) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: map },
        uBaseSize: { value: baseSize },
        uMaxSize: { value: maxSize },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uTwinkleStrength: { value: twinkleStrength }
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aTwinkle;
        attribute float aBrightnessScale;
        attribute float aSizeScale;

        uniform float uTime;
        uniform float uBaseSize;
        uniform float uMaxSize;
        uniform float uPixelRatio;
        uniform float uTwinkleStrength;

        varying vec3 vColor;
        varying float vLuma;

        void main(){
          vColor = aColor;
          vLuma = aBrightnessScale;

          float osc = 0.78 + 0.22 * sin(uTime * (2.0 + aTwinkle * 6.0) + aTwinkle * 10.0);
          float tw = mix(1.0, osc, clamp(uTwinkleStrength, 0.0, 1.0));

          float ps = uBaseSize * aSize * aSizeScale * uPixelRatio * tw;
          gl_PointSize = clamp(ps, 0.0, uMaxSize);

          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vLuma;

        void main(){
          vec4 tex = texture2D(uMap, gl_PointCoord);
          float a = tex.a;
          if (a < 0.02) discard;
          vec3 col = vColor * tex.rgb * vLuma;
          gl_FragColor = vec4(col, a);
        }
      `
    });
  }

  pickStarColor() {
    const r = this.rng();
    if (r < 0.70) return [1.00, 1.00, 1.00];
    if (r < 0.83) return [0.82, 0.90, 1.00];
    if (r < 0.94) return [1.00, 0.94, 0.78];
    return [0.95, 0.78, 1.00];
  }

  createStarLayer({ count, baseSize, maxSize, speed, speedVar, drift, brightness, map, twinkleStrength }) {
    const STAR_OVERSCAN_X = 1.10;
    const STAR_OVERSCAN_Y = 1.25;
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const twinkle = new Float32Array(count);
    const brightnessScale = new Float32Array(count);
    const sizeScale = new Float32Array(count);
    const velY = new Float32Array(count);
    const velX = new Float32Array(count);

    const spawn = (i, y = STAR_OVERSCAN_Y + this.rng() * 0.35) => {
      const ix = i * 3;

      const x = (this.rng() * 2 - 1) * STAR_OVERSCAN_X;
      pos[ix + 0] = x;
      pos[ix + 1] = y;
      pos[ix + 2] = 0.0;

      const [cr, cg, cb] = this.pickStarColor();
      const luma = 0.85 + this.rng() * 0.5; // Vary brightness per-star (0.85 - 1.35)
      col[ix + 0] = cr * brightness;
      col[ix + 1] = cg * brightness;
      col[ix + 2] = cb * brightness;

      const r = this.rng();
      size[i] = 0.35 + Math.pow(r, 2.0) * 1.65;
      twinkle[i] = this.rng();
      brightnessScale[i] = luma;
      sizeScale[i] = 1.0 + this.rng() * 2.0; // 1x to 3x of the current spread

      velY[i] = Math.max(0.01, speed + (this.rng() * 2 - 1) * speedVar);
      velX[i] = (this.rng() * 2 - 1) * drift;
    };

    for (let i = 0; i < count; i++) {
      spawn(i, STAR_OVERSCAN_Y - this.rng() * (STAR_OVERSCAN_Y * 2));
    }

    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geom.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkle, 1));
    geom.setAttribute('aBrightnessScale', new THREE.BufferAttribute(brightnessScale, 1));
    geom.setAttribute('aSizeScale', new THREE.BufferAttribute(sizeScale, 1));

    const mat = this.makeStarMaterial({ map, baseSize, maxSize: maxSize * 3.0, twinkleStrength });
    const points = new THREE.Points(geom, mat);
    points.frustumCulled = false;
    points.renderOrder = 1;

    return { count, geom, mat, points, velY, velX, spawn, STAR_OVERSCAN_X, STAR_OVERSCAN_Y };
  }

  createStarfield() {
    const starTexSharp = this.makeStarTexture({ streak: false });
    const starTexStreak = this.makeStarTexture({ streak: true });

    this.starLayers = [
      this.createStarLayer({
        count: 260,
        baseSize: 1.7,
        maxSize: 4.0,
        speed: 0.15,
        speedVar: 0.075,
        drift: 0.002,
        brightness: 0.55,
        map: starTexSharp,
        twinkleStrength: 0.18
      }),
      this.createStarLayer({
        count: 320,
        baseSize: 2.2,
        maxSize: 6.0,
        speed: 0.27,
        speedVar: 0.12,
        drift: 0.004,
        brightness: 0.70,
        map: starTexSharp,
        twinkleStrength: 0.22
      }),
      this.createStarLayer({
        count: 220,
        baseSize: 3.0,
        maxSize: 9.0,
        speed: 0.51,
        speedVar: 0.21,
        drift: 0.006,
        brightness: 0.88,
        map: starTexSharp,
        twinkleStrength: 0.28
      }),
      this.createStarLayer({
        count: 120,
        baseSize: 4.4,
        maxSize: 14.0,
        speed: 0.93,
        speedVar: 0.33,
        drift: 0.010,
        brightness: 1.00,
        map: starTexStreak,
        twinkleStrength: 0.32
      })
    ];

    for (const layer of this.starLayers) {
      this.overlayScene.add(layer.points);
    }
  }

  createDust() {
    const dustCount = 700;
    this.dustGeom = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    this.dustSpeed = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      const a = this.rng() * Math.PI * 2;
      const rr = Math.sqrt(this.rng()) * (this.radius - 2.0);
      const y = (this.rng() - 0.5) * this.height;
      dustPos[i * 3 + 0] = Math.cos(a) * rr;
      dustPos[i * 3 + 1] = y;
      dustPos[i * 3 + 2] = Math.sin(a) * rr;
      this.dustSpeed[i] = 0.35 + this.rng() * 0.8;
    }

    this.dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0x1f1b2a,
      size: 0.06,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.dust = new THREE.Points(this.dustGeom, dustMat);
    this.scene.add(this.dust);
  }

  update(deltaTime) {
    this.elapsedTime += deltaTime;

    const descentSpeed = 2.4;
    const halfH = this.height / 2;

    this.camera.position.y -= descentSpeed * deltaTime;
    this.camera.position.x = 1.6 + Math.sin(this.elapsedTime * 0.27) * 1.15;
    this.camera.position.z = 1.1 + Math.cos(this.elapsedTime * 0.23) * 1.05;

    this.camera.lookAt(
      this.camera.position.x * 0.28 + 0.35,
      this.camera.position.y - 8.5,
      this.camera.position.z * 0.28 + 0.25
    );

    if (this.camera.position.y < -halfH + 30) this.camera.position.y += (this.height - 60);

    for (const layer of this.starLayers) {
      layer.mat.uniforms.uTime.value = this.elapsedTime;
      const sp = layer.geom.attributes.position.array;
      for (let i = 0; i < layer.count; i++) {
        const ix = i * 3;
        sp[ix + 1] -= layer.velY[i] * deltaTime;
        sp[ix + 0] += layer.velX[i] * deltaTime;

        if (sp[ix + 0] < -layer.STAR_OVERSCAN_X) sp[ix + 0] = layer.STAR_OVERSCAN_X;
        if (sp[ix + 0] > layer.STAR_OVERSCAN_X) sp[ix + 0] = -layer.STAR_OVERSCAN_X;

        if (sp[ix + 1] < -layer.STAR_OVERSCAN_Y) layer.spawn(i, layer.STAR_OVERSCAN_Y + this.rng() * 0.35);
      }
      layer.geom.attributes.position.needsUpdate = true;
    }

    const arr = this.dustGeom.attributes.position.array;
    for (let i = 0; i < this.dustSpeed.length; i++) {
      const idx = i * 3 + 1;
      arr[idx] += this.dustSpeed[i] * deltaTime;
      if (arr[idx] > this.camera.position.y + halfH) arr[idx] = this.camera.position.y - halfH;
    }

    this.dustGeom.attributes.position.needsUpdate = true;
  }

  render() {
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.render(this.overlayScene, this.overlayCamera);
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);

    if (this.pageGlowMat) {
      this.pageGlowMat.uniforms.uResolution.value.set(width, height);
    }

    for (const layer of this.starLayers) {
      layer.mat.uniforms.uPixelRatio.value = this.renderer.getPixelRatio();
    }
  }

  getCamera() {
    return this.camera;
  }

  getScene() {
    return this.scene;
  }

  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }
  }
}
