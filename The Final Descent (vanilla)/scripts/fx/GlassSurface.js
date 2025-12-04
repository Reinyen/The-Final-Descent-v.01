import * as THREE from 'three';

const surfaces = new Set();
let rafId = null;
let lastTime = 0;

function startLoop() {
  if (rafId !== null) return;
  const tick = (time) => {
    rafId = requestAnimationFrame(tick);
    const deltaSeconds = (time - lastTime) / 1000 || 0;
    lastTime = time;
    surfaces.forEach((surface) => surface.update(time * 0.001, deltaSeconds));
    if (surfaces.size === 0) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
  rafId = requestAnimationFrame(tick);
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uHover;
  uniform float uHoverStrength;
  uniform float uPulse;
  uniform vec3 uBaseTint;
  uniform float uSpeckDensity;
  uniform float uVignette;
  uniform float uRippleAmp;
  uniform float uRippleFreq;
  uniform float uRippleSpeed;

  // Hash helpers
  float hash12(vec2 p) {
    vec3 p3  = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // Ridged noise for haze
  float ridgedNoise(vec2 p) {
    float n = noise(p * 1.2);
    n = 1.0 - abs(n * 2.0 - 1.0);
    float n2 = noise(p * 3.5 + 10.0);
    return mix(n, n2, 0.35);
  }

  // Speckle layer
  float specks(vec2 uv, float density, float time) {
    vec2 grid = uv * density;
    vec2 id = floor(grid);
    vec2 f = fract(grid);
    float rnd = hash12(id + floor(time));
    vec2 offset = vec2(hash12(id + 1.23), hash12(id + 4.56)) * 0.6;
    float tShift = time * 0.35 + rnd * 3.1415;
    vec2 pos = f + offset * sin(tShift);
    float d = length(pos - vec2(0.5));
    return smoothstep(0.12, 0.0, d) * 0.6;
  }

  void main() {
    vec2 uv = vUv;

    float dist = distance(uv, uHover);
    float hoverFalloff = smoothstep(0.35, 0.0, dist);
    float ripple = sin(dist * uRippleFreq - uTime * uRippleSpeed);
    vec2 dir = dist < 0.0001 ? vec2(0.0) : normalize(uv - uHover);
    vec2 rippleOffset = ripple * uRippleAmp * uHoverStrength * hoverFalloff * dir;
    uv += rippleOffset * 0.4;

    // Base gradient tint
    vec3 top = uBaseTint * vec3(0.24, 0.28, 0.32);
    vec3 bottom = uBaseTint * vec3(0.1, 0.12, 0.16);
    float vertical = smoothstep(0.0, 1.0, uv.y);
    vec3 color = mix(top, bottom, vertical);

    // Internal haze
    float haze = ridgedNoise(uv * uResolution * 0.35 + uTime * 0.6);
    color += (haze - 0.5) * 0.08;

    // Specks drifting upward
    float speckLayer = specks(uv + vec2(0.0, uTime * 0.05), uSpeckDensity, uTime);
    speckLayer += specks(uv * 1.5 + vec2(uTime * 0.02, -uTime * 0.03), uSpeckDensity * 0.5, uTime * 0.6);
    color += speckLayer * 0.12;

    // Vignette with pulse
    float vignette = smoothstep(0.8, 0.3, length(uv - 0.5));
    float pulsing = 0.5 + 0.5 * sin(uTime * 0.6);
    float vignetteStrength = mix(uVignette * 0.6, uVignette, pulsing * uPulse);
    color *= mix(1.0, vignette, vignetteStrength);

    // Hover highlight
    float hoverGlow = hoverFalloff * uHoverStrength;
    color += hoverGlow * 0.18;

    float alpha = 0.82 + hoverGlow * 0.05;
    gl_FragColor = vec4(color, alpha);
  }
`;

export class GlassSurface {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.pixelRatio = window.devicePixelRatio || 1;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uHover: { value: new THREE.Vector2(0.5, 0.5) },
      uHoverStrength: { value: 0 },
      uPulse: { value: options.pulse ?? 1 },
      uBaseTint: { value: new THREE.Color(options.tint || 0x6fb5ff) },
      uSpeckDensity: { value: options.speckDensity ?? 22.0 },
      uVignette: { value: options.vignette ?? 0.8 },
      uRippleAmp: { value: options.rippleAmp ?? 0.015 },
      uRippleFreq: { value: options.rippleFreq ?? 18.0 },
      uRippleSpeed: { value: options.rippleSpeed ?? 3.0 }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    this.scene.add(quad);

    this.hoverTarget = new THREE.Vector2(0.5, 0.5);
    this.targetHoverStrength = 0;
    this.visible = true;
    this.lastRender = 0;

    surfaces.add(this);
    startLoop();

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  setHover(uv) {
    this.hoverTarget.copy(uv);
  }

  setHoverActive(active) {
    this.targetHoverStrength = active ? 1 : 0;
  }

  setVisibility(isVisible) {
    this.visible = isVisible;
  }

  handleResize() {
    const { clientWidth, clientHeight } = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (clientWidth === 0 || clientHeight === 0) return;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.uniforms.uResolution.value.set(clientWidth * dpr, clientHeight * dpr);
  }

  update(timeSeconds, deltaSeconds) {
    if (!this.canvas.isConnected) {
      surfaces.delete(this);
      return;
    }

    // Minimal updates if hidden and idle
    const now = timeSeconds;
    const hoverStrength = this.uniforms.uHoverStrength.value;
    const shouldRender = this.visible || hoverStrength > 0.02 || (now - this.lastRender) > 0.35;
    if (!shouldRender) return;

    this.uniforms.uTime.value = timeSeconds;
    this.uniforms.uHover.value.lerp(this.hoverTarget, 0.18);

    const strength = THREE.MathUtils.lerp(hoverStrength, this.targetHoverStrength, 1.0 - Math.exp(-deltaSeconds * 9));
    this.uniforms.uHoverStrength.value = strength;

    const pulse = 0.55 + 0.45 * Math.sin(timeSeconds * 0.35);
    this.uniforms.uPulse.value = THREE.MathUtils.lerp(this.uniforms.uPulse.value, pulse, 0.04);

    this.renderer.render(this.scene, this.camera);
    this.lastRender = now;
  }
}
