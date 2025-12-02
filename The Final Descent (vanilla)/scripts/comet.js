import * as THREE from 'three';

// Simplex noise function for GLSL
const SIMPLEX_NOISE_3D = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

export class Comet {
  constructor() {
    this.comet = null;
    this.cometMaterial = null;
    this.glowMaterial = null;

    // Comet trajectory
    this.startPosition = new THREE.Vector3(0, 40, -30);
    this.endPosition = new THREE.Vector3(0, -8, -70);

    this.init();
  }

  init() {
    // Create comet core
    const cometGeometry = new THREE.IcosahedronGeometry(1.2, 3);

    this.cometMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        heatIntensity: { value: 0.0 }
      },
      vertexShader: `
        ${SIMPLEX_NOISE_3D}

        uniform float time;
        uniform float heatIntensity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;

          // Multi-scale noise displacement for rocky surface
          vec3 noisePos = position * 2.0 + time * 0.1;
          float noise1 = snoise(noisePos);
          float noise2 = snoise(noisePos * 2.0) * 0.5;
          float noise3 = snoise(noisePos * 4.0) * 0.25;

          float totalNoise = (noise1 + noise2 + noise3) * 0.15;

          // Heat turbulence (more displacement when hot)
          float heatDisplacement = snoise(position * 5.0 + time * 3.0) * heatIntensity * 0.1;

          vec3 displaced = position + normal * (totalNoise + heatDisplacement);

          vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
          vWorldPosition = worldPosition.xyz;

          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        ${SIMPLEX_NOISE_3D}

        uniform float time;
        uniform float heatIntensity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          // Multi-scale noise texture for rocky surface
          vec3 texPos = vWorldPosition * 1.5;
          float tex1 = snoise(texPos);
          float tex2 = snoise(texPos * 2.0) * 0.5;
          float tex3 = snoise(texPos * 4.0) * 0.25;

          float rockPattern = (tex1 + tex2 + tex3) * 0.5 + 0.5;

          // Base rocky color
          vec3 rockColor = vec3(0.3, 0.25, 0.2) * (0.7 + rockPattern * 0.3);

          // Heat color shift
          vec3 coldColor = rockColor;
          vec3 warmColor = vec3(0.6, 0.3, 0.1);
          vec3 hotColor = vec3(1.0, 0.4, 0.1);

          vec3 finalColor;
          if (heatIntensity < 0.5) {
            finalColor = mix(coldColor, warmColor, heatIntensity / 0.5);
          } else {
            finalColor = mix(warmColor, hotColor, (heatIntensity - 0.5) / 0.5);
          }

          // Simple lighting
          vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
          float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.6 + 0.4;

          gl_FragColor = vec4(finalColor * diffuse, 1.0);
        }
      `
    });

    this.comet = new THREE.Mesh(cometGeometry, this.cometMaterial);
    this.comet.visible = false;

    // Create outer glow
    const glowGeometry = new THREE.IcosahedronGeometry(1.8, 2);
    this.glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        heatIntensity: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float heatIntensity;
        varying vec3 vNormal;

        void main() {
          // Heat-reactive color shift
          vec3 coldColor = vec3(0.4, 0.2, 1.0);
          vec3 warmColor = vec3(1.0, 0.4, 0.1);
          vec3 hotColor = vec3(0.6, 0.3, 0.9);

          vec3 glowColor;
          if (heatIntensity < 0.5) {
            glowColor = mix(coldColor, warmColor, heatIntensity / 0.5);
          } else {
            glowColor = mix(warmColor, hotColor, (heatIntensity - 0.5) / 0.5);
          }

          // Pulsing opacity
          float pulse = sin(time * 3.0) * 0.05 + 0.95;
          float opacity = (0.15 + heatIntensity * 0.25) * pulse;

          gl_FragColor = vec4(glowColor, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });

    const cometGlow = new THREE.Mesh(glowGeometry, this.glowMaterial);
    this.comet.add(cometGlow);

    console.log('[Comet] Created');
  }

  update(phase, elapsedTime) {
    // Update time uniforms
    this.cometMaterial.uniforms.time.value = elapsedTime;
    this.glowMaterial.uniforms.time.value = elapsedTime;

    // Comet visible during approach and impact
    if (phase.name === 'comet_approach' || phase.name === 'impact') {
      this.comet.visible = true;

      // Position along trajectory
      const t = phase.name === 'comet_approach'
        ? phase.phaseT
        : 1.0;

      this.comet.position.lerpVectors(this.startPosition, this.endPosition, t);

      // Heat intensity increases as comet approaches
      const heatIntensity = t;
      this.cometMaterial.uniforms.heatIntensity.value = heatIntensity;
      this.glowMaterial.uniforms.heatIntensity.value = heatIntensity;

      // Scale down during impact
      if (phase.name === 'impact') {
        const impactScale = 1.0 - phase.phaseT * 0.8; // Shrink to 20%
        this.comet.scale.setScalar(impactScale);
      } else {
        this.comet.scale.setScalar(1.0);
      }
    } else {
      this.comet.visible = false;
    }
  }

  getMesh() {
    return this.comet;
  }

  destroy() {
    if (this.cometMaterial) {
      this.cometMaterial.dispose();
    }
    if (this.glowMaterial) {
      this.glowMaterial.dispose();
    }
  }
}
