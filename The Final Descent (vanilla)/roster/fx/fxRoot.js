import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.2/build/three.module.js';
import { initBackground } from './fxBackground.js';
import { initNodes } from './fxNodes.js';
import { initMorph } from './fxMorph.js';
import { initRerollFx } from './fxReroll.js';

export function initFx(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uPhase: { value: 0 },
    uVignetteStrength: { value: 0 },
    uDustStrength: { value: 0 },
    uDustDriftSpeed: { value: 0 },
    uNodeCount: { value: 6 },
    uNodePos: { value: Array.from({ length: 6 }, () => new THREE.Vector3()) },
    uNodeAlive: { value: new Float32Array(6) },
    uNodeFallen: { value: new Float32Array(6) },
    uSweepT: { value: 0 },
    uCrackStrength: { value: new Float32Array(6) },
    uEmberStrength: { value: new Float32Array(6) },
    uFallOffset: { value: new Float32Array(6) },
    uHoverCardPos: { value: new THREE.Vector2(-1, -1) },
    uRerollActive: { value: 0 },
    uRerollOriginRect: { value: new THREE.Vector4(0, 0, 0, 0) },
    uRerollProgress: { value: 0 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uPhase;
      uniform float uVignetteStrength;
      uniform float uDustStrength;
      uniform float uDustDriftSpeed;
      uniform float uSweepT;
      uniform int uNodeCount;
      uniform vec3 uNodePos[6];
      uniform float uNodeAlive[6];
      uniform float uNodeFallen[6];
      uniform float uCrackStrength[6];
      uniform float uEmberStrength[6];
      uniform float uFallOffset[6];
      uniform vec2 uHoverCardPos;
      uniform float uRerollActive;
      uniform vec4 uRerollOriginRect;
      uniform float uRerollProgress;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      vec3 dustLayer(vec2 uv) {
        vec2 grid = floor(uv * 20.0);
        vec2 local = fract(uv * 20.0);
        float rnd = hash(grid);
        vec2 pos = vec2(rnd, hash(grid + 3.3));
        vec2 drift = vec2(hash(grid + 1.2) - 0.5, hash(grid + 2.4) - 0.5) * uDustDriftSpeed * uTime * 0.2;
        vec2 p = local + drift - pos;
        float d = length(p);
        float m = smoothstep(0.14, 0.0, d);
        return vec3(1.0) * m;
      }

      float vignette(vec2 uv) {
        vec2 q = uv - 0.5;
        float len = length(q * vec2(1.2, 1.0));
        return smoothstep(0.9, 0.3, len);
      }

      float crackMask(vec2 uv, vec2 center, float strength) {
        vec2 p = uv - center;
        float ang = atan(p.y, p.x);
        float rad = length(p);
        float n = noise(vec2(ang * 2.0, rad * 8.0 + uTime * 0.4));
        float band = abs(fract(n * 6.0) - 0.5);
        float mask = smoothstep(0.06, 0.0, band);
        mask *= smoothstep(0.3, 0.0, rad);
        return mask * strength;
      }

      // Stardust particle system for reroll effects
      vec3 stardustParticles(vec2 uv, vec2 center, float progress, float strength, int nodeIndex) {
        vec3 color = vec3(0.0);

        // Generate particles in a grid around center
        for (float i = 0.0; i < 30.0; i += 1.0) {
          vec2 seed = vec2(i * 0.173, float(nodeIndex) * 0.271);
          float rnd1 = hash(seed);
          float rnd2 = hash(seed + vec2(1.337, 2.449));
          float rnd3 = hash(seed + vec2(3.141, 5.926));

          // Initial position around center
          float angle = rnd1 * 6.28318;
          float radius = rnd2 * 0.15;
          vec2 initialPos = center + vec2(cos(angle), sin(angle)) * radius;

          // Spiral motion parameters
          float spiralSpeed = 0.3 + rnd3 * 0.4;
          float spiralRadius = radius + progress * (0.2 + rnd2 * 0.3);
          float spiralAngle = angle + progress * 3.14159 * spiralSpeed;

          // Particle position during animation
          vec2 particlePos = center + vec2(
            cos(spiralAngle) * spiralRadius * (1.0 - progress * 0.7),
            sin(spiralAngle) * spiralRadius * (1.0 - progress * 0.7) - progress * (0.3 + rnd1 * 0.2)
          );

          // Distance to particle
          float dist = length(uv - particlePos);
          float particleSize = 0.003 + rnd2 * 0.002;
          float particle = smoothstep(particleSize * 2.0, 0.0, dist);

          // Particle color - blue-white stardust
          vec3 particleColor = mix(
            vec3(0.6, 0.8, 1.0),
            vec3(1.0, 1.0, 1.0),
            rnd3
          );

          // Fade particles in/out based on progress
          float alpha = smoothstep(0.0, 0.1, progress) * smoothstep(1.0, 0.7, progress);

          color += particleColor * particle * alpha * strength;
        }

        return color;
      }

      // Coalescence effect - particles reforming into card
      vec3 coalesceEffect(vec2 uv, vec2 center, float progress, float strength) {
        vec3 color = vec3(0.0);

        // Reverse the particle effect - particles converging
        for (float i = 0.0; i < 25.0; i += 1.0) {
          vec2 seed = vec2(i * 0.197, i * 0.313);
          float rnd1 = hash(seed);
          float rnd2 = hash(seed + vec2(7.89, 1.23));
          float rnd3 = hash(seed + vec2(4.56, 9.87));

          // Particles converge from spiral to center
          float angle = rnd1 * 6.28318;
          float startRadius = 0.25 + rnd2 * 0.15;
          float radius = startRadius * (1.0 - progress);

          vec2 particlePos = center + vec2(cos(angle), sin(angle)) * radius;

          float dist = length(uv - particlePos);
          float particleSize = 0.004 + rnd3 * 0.003;
          float particle = smoothstep(particleSize * 2.0, 0.0, dist);

          // Blue-white color
          vec3 particleColor = mix(vec3(0.5, 0.7, 1.0), vec3(1.0), rnd2);

          // Fade as they converge
          float alpha = smoothstep(0.0, 0.2, progress) * smoothstep(1.0, 0.8, progress);

          color += particleColor * particle * alpha * strength;
        }

        return color;
      }

      void main() {
        vec2 uv = vUv;
        vec3 color = vec3(0.0);

        vec3 dust = dustLayer(uv * (1.2 + uDustStrength * 0.4)) * uDustStrength;
        float vig = vignette(uv) * uVignetteStrength;
        color += dust * 0.35;

        for (int i = 0; i < 6; i++) {
          vec2 pos = uNodePos[i].xy;
          float alive = uNodeAlive[i];
          float fallen = uNodeFallen[i];
          float dist = length(uv - pos + vec2(0.0, uFallOffset[i]));
          float base = smoothstep(0.25, 0.0, dist);
          float glow = base * (0.5 + alive * 0.6);
          float ember = smoothstep(0.12, 0.0, dist) * uEmberStrength[i];
          color += vec3(0.2, 0.5, 0.8) * glow;
          color += vec3(0.9, 0.45, 0.2) * ember;
          float crack = crackMask(uv, pos, uCrackStrength[i] * (fallen + uCrackStrength[i] * 0.5));
          color += vec3(0.8, 0.6, 0.4) * crack * 0.4;

          // Reroll particle effects for Living nodes (indices 3-5)
          if (i >= 3 && uRerollActive > 0.5) {
            float emberStr = uEmberStrength[i];

            // During spiral phase (ember > 0), show stardust particles
            if (emberStr > 0.01 && uRerollProgress < 0.7) {
              float spiralProgress = uRerollProgress * 1.5;
              color += stardustParticles(uv, pos, spiralProgress, emberStr, i);
            }

            // During coalescence phase, show particles reforming
            if (uRerollProgress > 0.6 && uRerollProgress < 1.0) {
              float coalesceProgress = (uRerollProgress - 0.6) / 0.4;
              float coalesceStr = 1.0 - alive;
              color += coalesceEffect(uv, pos, coalesceProgress, coalesceStr);
            }
          }
        }

        if (uSweepT > 0.0) {
          float band = smoothstep(uSweepT - 0.04, uSweepT, uv.y) * smoothstep(uSweepT + 0.04, uSweepT, uv.y);
          color += vec3(0.35, 0.55, 0.8) * band;
        }

        if (uHoverCardPos.x >= 0.0) {
          float d = length(uv - uHoverCardPos);
          float ripple = smoothstep(0.22, 0.0, d) * 0.3;
          color += vec3(0.25, 0.45, 0.7) * ripple;
        }

        if (uRerollActive > 0.5) {
          vec2 r0 = uRerollOriginRect.xy;
          vec2 r1 = uRerollOriginRect.xy + uRerollOriginRect.zw;
          float inside = step(r0.x, uv.x) * step(r0.y, uv.y) * step(uv.x, r1.x) * step(uv.y, r1.y);
          float dissolve = smoothstep(0.0, 1.0, uRerollProgress);
          color = mix(color, vec3(0.05, 0.1, 0.2) + dissolve * 0.3, inside * dissolve);
        }

        color = color * (1.0 - vig) + vec3(0.02) * vig;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const background = initBackground(uniforms);
  const nodes = initNodes(uniforms);
  const morph = initMorph(uniforms);
  const rerollFx = initRerollFx(uniforms);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    uniforms.uResolution.value.set(w, h);
  }

  window.addEventListener('resize', resize);

  let animationFrameId = null;

  function render(time) {
    const t = time * 0.001;
    uniforms.uTime.value = t;
    renderer.render(scene, camera);
    animationFrameId = requestAnimationFrame(render);
  }

  function stop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    // Remove canvas from DOM
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }

  animationFrameId = requestAnimationFrame(render);

  return {
    uniforms,
    renderer,
    background,
    nodes,
    morph,
    rerollFx,
    resize,
    stop
  };
}
