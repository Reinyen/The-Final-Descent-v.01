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
    this.trail = null;
    this.trailParticles = [];

    // Comet trajectory: starts far away, comes toward viewer at angle
    // Start: upper right, far back
    // End: impact point (0, -8, -70)
    this.startPosition = new THREE.Vector3(80, 60, -200); // Far away, angled
    this.endPosition = new THREE.Vector3(0, -8, -70); // Impact point

    this.init();
  }

  init() {
    // Create comet core
    const cometGeometry = new THREE.IcosahedronGeometry(1.2, 3);

    this.cometMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        intensity: { value: 0.0 }
      },
      vertexShader: `
        ${SIMPLEX_NOISE_3D}

        uniform float time;
        uniform float intensity;
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

          // Turbulence increases with intensity
          float turbulence = snoise(position * 5.0 + time * 3.0) * intensity * 0.1;

          vec3 displaced = position + normal * (totalNoise + turbulence);

          vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
          vWorldPosition = worldPosition.xyz;

          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        ${SIMPLEX_NOISE_3D}

        uniform float time;
        uniform float intensity;
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

          // Dark rocky base color
          vec3 rockColor = vec3(0.2, 0.18, 0.22) * (0.7 + rockPattern * 0.3);

          // Purple/green glow intensifies as it approaches
          vec3 coldColor = rockColor;
          vec3 warmColor = vec3(0.4, 0.15, 0.5); // Purple
          vec3 hotColor = vec3(0.2, 0.8, 0.3); // Green

          vec3 finalColor;
          if (intensity < 0.5) {
            finalColor = mix(coldColor, warmColor, intensity / 0.5);
          } else {
            finalColor = mix(warmColor, hotColor, (intensity - 0.5) / 0.5);
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

    // Create outer glow with purple/green colors
    const glowGeometry = new THREE.IcosahedronGeometry(2.5, 2);
    this.glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        intensity: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vViewPosition = cameraPosition - worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          // Purple to green gradient based on intensity
          vec3 purple = vec3(0.6, 0.2, 0.8);
          vec3 green = vec3(0.3, 0.9, 0.4);

          vec3 glowColor = mix(purple, green, intensity);

          // Fresnel effect for atmospheric glow
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

          // Pulsing opacity
          float pulse = sin(time * 4.0) * 0.1 + 0.9;
          float opacity = (0.2 + intensity * 0.5) * pulse * fresnel;

          gl_FragColor = vec4(glowColor, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });

    const cometGlow = new THREE.Mesh(glowGeometry, this.glowMaterial);
    this.comet.add(cometGlow);

    // Create trail particle system
    this.createTrailSystem();

    console.log('[Comet] Created with purple/green fire trail');
  }

  createTrailSystem() {
    // Trail consists of fading particles left behind
    const trailGeometry = new THREE.BufferGeometry();
    const maxTrailParticles = 100;

    const positions = new Float32Array(maxTrailParticles * 3);
    const colors = new Float32Array(maxTrailParticles * 3);
    const sizes = new Float32Array(maxTrailParticles);
    const alphas = new Float32Array(maxTrailParticles);

    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    trailGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;
          vAlpha = alpha;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.trail = new THREE.Points(trailGeometry, trailMaterial);
    this.trail.visible = false;
  }

  update(phase, elapsedTime) {
    // Update time uniforms
    this.cometMaterial.uniforms.time.value = elapsedTime;
    this.glowMaterial.uniforms.time.value = elapsedTime;

    // Comet visible during approach and impact
    if (phase.name === 'comet_approach' || phase.name === 'impact') {
      this.comet.visible = true;
      this.trail.visible = true;

      // Acceleration: starts slow, speeds up (ease-in cubic)
      let t = phase.name === 'comet_approach' ? phase.phaseT : 1.0;
      t = t * t * t; // Cubic easing for acceleration

      // Position along trajectory
      this.comet.position.lerpVectors(this.startPosition, this.endPosition, t);

      // Rotation for spinning effect
      this.comet.rotation.x = elapsedTime * 2.0;
      this.comet.rotation.y = elapsedTime * 1.5;

      // Intensity increases as comet approaches
      const intensity = t;
      this.cometMaterial.uniforms.intensity.value = intensity;
      this.glowMaterial.uniforms.intensity.value = intensity;

      // Scale grows as it approaches (starts small, gets larger)
      const scale = 0.3 + t * 0.7; // 0.3 to 1.0
      this.comet.scale.setScalar(scale);

      // Scale down during impact
      if (phase.name === 'impact') {
        const impactScale = scale * (1.0 - phase.phaseT * 0.8); // Shrink to 20%
        this.comet.scale.setScalar(impactScale);
      }

      // Update trail
      this.updateTrail(t, intensity);
    } else {
      this.comet.visible = false;
      this.trail.visible = false;
    }
  }

  updateTrail(t, intensity) {
    // Emit new trail particle
    if (t > 0.1 && Math.random() < 0.5) { // Don't emit at very start
      const positions = this.trail.geometry.attributes.position.array;
      const colors = this.trail.geometry.attributes.color.array;
      const sizes = this.trail.geometry.attributes.size.array;
      const alphas = this.trail.geometry.attributes.alpha.array;

      // Find empty slot or replace oldest
      let index = this.trailParticles.findIndex(p => p.life <= 0);
      if (index === -1 && this.trailParticles.length < 100) {
        index = this.trailParticles.length;
      } else if (index === -1) {
        index = 0; // Replace oldest
      }

      // Purple or green
      const isGreen = Math.random() > 0.5;
      const color = isGreen
        ? new THREE.Color(0.3, 0.9, 0.4)
        : new THREE.Color(0.6, 0.2, 0.8);

      // Add slight offset for spread
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      );

      this.trailParticles[index] = {
        position: this.comet.position.clone().add(offset),
        color: color,
        life: 1.0,
        size: 2 + Math.random() * 3
      };

      // Update buffers
      const i3 = index * 3;
      positions[i3] = this.trailParticles[index].position.x;
      positions[i3 + 1] = this.trailParticles[index].position.y;
      positions[i3 + 2] = this.trailParticles[index].position.z;
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      sizes[index] = this.trailParticles[index].size;
      alphas[index] = 1.0;
    }

    // Update existing particles
    const alphas = this.trail.geometry.attributes.alpha.array;
    for (let i = 0; i < this.trailParticles.length; i++) {
      if (this.trailParticles[i].life > 0) {
        this.trailParticles[i].life -= 0.03; // Fade out
        alphas[i] = Math.max(0, this.trailParticles[i].life);
      }
    }

    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trail.geometry.attributes.color.needsUpdate = true;
    this.trail.geometry.attributes.size.needsUpdate = true;
    this.trail.geometry.attributes.alpha.needsUpdate = true;
  }

  getMesh() {
    return this.comet;
  }

  getTrail() {
    return this.trail;
  }

  destroy() {
    if (this.cometMaterial) {
      this.cometMaterial.dispose();
    }
    if (this.glowMaterial) {
      this.glowMaterial.dispose();
    }
    if (this.trail) {
      this.trail.geometry.dispose();
      this.trail.material.dispose();
    }
  }
}
