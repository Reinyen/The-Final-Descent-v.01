/**
 * Map Renderer
 * Three.js-based renderer for neural network map
 * Handles nodes, connections, particle effects, and state transitions
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { MapConfig, NodeStates } from '../../data/map-config.js';

/**
 * Shader for neural network nodes with crackling energy effects
 */
const nodeShaderCode = {
  vertexShader: `
    attribute float nodeSize;
    attribute float nodeState;
    attribute float nodeType;
    attribute vec3 nodeColor;

    uniform float uTime;
    uniform vec3 uHoverNodeId;

    varying vec3 vColor;
    varying float vNodeState;
    varying float vNodeType;
    varying float vDistanceToCamera;
    varying vec3 vPosition;

    // Simplex noise for crackling effect
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
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vColor = nodeColor;
      vNodeState = nodeState;
      vNodeType = nodeType;
      vPosition = position;

      // Use original position without displacement to keep network stable
      vec3 pos = position;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      vDistanceToCamera = -mvPosition.z;

      // Size based on state
      float size = nodeSize;

      // Current node: largest, pulsing
      if (nodeState < 0.5) {
        size *= 1.4 * (1.0 + sin(uTime * 3.0) * 0.15);
      }
      // Available node: large, crackling
      else if (nodeState < 1.5) {
        size *= 1.2 * (1.0 + snoise(vec3(uTime * 5.0)) * 0.1);
      }
      // Locked node: faded
      else if (nodeState < 2.5) {
        size *= 1.0;
      }
      // Hidden node: tiny
      else if (nodeState < 3.5) {
        size *= 0.4;
      }
      // Completed node: glass orb
      else {
        size *= 1.1 * (1.0 + sin(uTime * 2.0) * 0.05);
      }

      gl_PointSize = size * (300.0 / vDistanceToCamera);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    uniform float uTime;

    varying vec3 vColor;
    varying float vNodeState;
    varying float vNodeType;
    varying float vDistanceToCamera;
    varying vec3 vPosition;

    // Simplex noise
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
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vec2 center = 2.0 * gl_PointCoord - 1.0;
      float dist = length(center);

      if (dist > 1.0) discard;

      vec3 color = vColor;
      float alpha = 1.0;

      // State 0: CURRENT - Teal crackling energy
      if (vNodeState < 0.5) {
        float crackle = snoise(vec3(center * 10.0, uTime * 5.0));
        float pulse = sin(uTime * 3.0) * 0.5 + 0.5;

        // Core
        float coreGlow = 1.0 - smoothstep(0.0, 0.3, dist);
        vec3 core = color * (1.5 + pulse * 0.5);

        // Energy tendrils
        float tendrils = max(0.0, crackle) * (1.0 - dist) * 2.0;
        vec3 energy = color * tendrils * 2.0;

        color = core + energy;
        alpha = smoothstep(1.0, 0.0, dist) * (0.9 + pulse * 0.1);
      }
      // State 1: AVAILABLE - Golden crackling
      else if (vNodeState < 1.5) {
        float crackle = snoise(vec3(center * 12.0, uTime * 6.0));
        float sparkle = snoise(vec3(center * 20.0, uTime * 10.0));

        // Core
        float coreGlow = 1.0 - smoothstep(0.0, 0.4, dist);
        vec3 core = color * (1.3 + sparkle * 0.3);

        // Crackling edges
        float edge = smoothstep(0.6, 0.9, dist) * (1.0 - smoothstep(0.9, 1.0, dist));
        vec3 crackles = color * max(0.0, crackle) * edge * 3.0;

        color = core + crackles;
        alpha = smoothstep(1.0, 0.0, dist) * 0.95;
      }
      // State 2: LOCKED - Faded golden aura
      else if (vNodeState < 2.5) {
        float glow = 1.0 - smoothstep(0.0, 0.8, dist);
        color = color * (0.6 + glow * 0.4);
        alpha = smoothstep(1.0, 0.0, dist) * 0.4;
      }
      // State 3: HIDDEN - Grey and lifeless
      else if (vNodeState < 3.5) {
        float core = 1.0 - smoothstep(0.0, 0.5, dist);
        color = vec3(0.3, 0.3, 0.3) * (0.3 + core * 0.3);
        alpha = smoothstep(1.0, 0.0, dist) * 0.3;
      }
      // State 4: COMPLETED - Glass orb
      else {
        float fresnel = pow(1.0 - dist, 2.0);
        float refraction = snoise(vec3(center * 5.0, uTime * 0.5)) * 0.3;

        // Glass core
        float glassCore = 1.0 - smoothstep(0.0, 0.7, dist);
        vec3 glass = color * (0.8 + glassCore * 0.4 + refraction);

        // Fresnel rim
        vec3 rim = vec3(1.0) * fresnel * 0.6;

        color = glass + rim;
        alpha = smoothstep(1.0, 0.0, dist) * (0.85 + fresnel * 0.15);
      }

      // Distance fade
      float distanceFade = smoothstep(80.0, 20.0, vDistanceToCamera);

      gl_FragColor = vec4(color, alpha * distanceFade);
    }
  `
};

/**
 * Connection path shader
 */
const connectionShaderCode = {
  vertexShader: `
    attribute vec3 startPoint;
    attribute vec3 endPoint;
    attribute float pathProgress;
    attribute float revealed;
    attribute vec3 pathColor;

    uniform float uTime;
    uniform vec3 uEnergyPulseStart;
    uniform vec3 uEnergyPulseEnd;
    uniform float uEnergyPulseProgress;
    uniform float uEnergyPulseActive;

    varying vec3 vColor;
    varying float vRevealed;
    varying float vEnergyIntensity;
    varying vec3 vWorldPosition;

    void main() {
      float t = pathProgress;

      // Bezier curve for smooth path
      vec3 midPoint = mix(startPoint, endPoint, 0.5);
      vec3 perpendicular = normalize(cross(normalize(endPoint - startPoint), vec3(0.0, 1.0, 0.0)));
      if (length(perpendicular) < 0.1) perpendicular = vec3(1.0, 0.0, 0.0);

      float arcHeight = sin(t * 3.14159) * 0.5;
      midPoint += perpendicular * arcHeight;

      vec3 p0 = mix(startPoint, midPoint, t);
      vec3 p1 = mix(midPoint, endPoint, t);
      vec3 finalPos = mix(p0, p1, t);

      vWorldPosition = (modelMatrix * vec4(finalPos, 1.0)).xyz;
      vColor = pathColor;
      vRevealed = revealed;

      // Energy pulse detection
      vEnergyIntensity = 0.0;
      if (uEnergyPulseActive > 0.5) {
        float pulsePos = uEnergyPulseProgress;
        float proximity = abs(t - pulsePos);
        vEnergyIntensity = smoothstep(0.15, 0.0, proximity) * (1.0 - uEnergyPulseProgress);
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
    }
  `,

  fragmentShader: `
    uniform float uTime;

    varying vec3 vColor;
    varying float vRevealed;
    varying float vEnergyIntensity;
    varying vec3 vWorldPosition;

    void main() {
      vec3 color = vColor;
      float alpha = vRevealed * 0.6;

      // Energy pulse
      if (vEnergyIntensity > 0.0) {
        color = mix(color, vec3(1.0), vEnergyIntensity * 0.8);
        alpha = mix(alpha, 1.0, vEnergyIntensity);
      }

      // Flowing energy pattern
      float flow = sin(vWorldPosition.x * 5.0 - uTime * 3.0) * 0.5 + 0.5;
      alpha *= (0.7 + flow * 0.3);

      gl_FragColor = vec4(color, alpha);
    }
  `
};

export class MapRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.controls = null;

    this.nodesMesh = null;
    this.connectionsMesh = null;

    this.networkData = null;
    this.clock = new THREE.Clock();

    // Energy pulse animation
    this.energyPulse = {
      active: false,
      start: null,
      end: null,
      progress: 0,
      duration: MapConfig.visual.energyPulseDuration
    };

    // Node burst particles
    this.nodeBursts = [];

    this.init();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.008);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 8, 30);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Post-processing
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2,  // strength
      0.5,  // radius
      0.7   // threshold
    );
    this.composer.addPass(bloomPass);
    this.composer.addPass(new OutputPass());

    // Controls (no auto-rotate for precise control)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.6;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 60;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;

    // Starfield background
    this.createStarfield();

    // Window resize
    window.addEventListener('resize', () => this.onWindowResize());

    console.log('[MapRenderer] Initialized');
  }

  createStarfield() {
    const count = 3000;
    const positions = [];

    for (let i = 0; i < count; i++) {
      const r = THREE.MathUtils.randFloat(60, 200);
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);

      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6
    });

    const starfield = new THREE.Points(geometry, material);
    this.scene.add(starfield);
  }

  /**
   * Load network data and create visual meshes
   */
  loadNetwork(networkData) {
    console.log('[MapRenderer] Loading network:', networkData);

    // Clear existing meshes
    if (this.nodesMesh) {
      this.scene.remove(this.nodesMesh);
      this.nodesMesh.geometry.dispose();
      this.nodesMesh.material.dispose();
    }

    if (this.connectionsMesh) {
      this.scene.remove(this.connectionsMesh);
      this.connectionsMesh.geometry.dispose();
      this.connectionsMesh.material.dispose();
    }

    this.networkData = networkData;

    this.createNodesMesh();
    this.createConnectionsMesh();
  }

  createNodesMesh() {
    const nodes = this.networkData.nodes;
    const geometry = new THREE.BufferGeometry();

    const positions = [];
    const sizes = [];
    const states = [];
    const types = [];
    const colors = [];

    nodes.forEach(node => {
      positions.push(node.position.x, node.position.y, node.position.z);
      sizes.push(MapConfig.visual.nodeBaseSize);

      // State as number
      const stateNum = this.getStateNumber(node.state);
      states.push(stateNum);

      types.push(0); // Type not used in shader currently

      // Color based on state
      const color = this.getNodeColor(node);
      colors.push(color.r, color.g, color.b);
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('nodeSize', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('nodeState', new THREE.Float32BufferAttribute(states, 1));
    geometry.setAttribute('nodeType', new THREE.Float32BufferAttribute(types, 1));
    geometry.setAttribute('nodeColor', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHoverNodeId: { value: new THREE.Vector3(999, 999, 999) }
      },
      vertexShader: nodeShaderCode.vertexShader,
      fragmentShader: nodeShaderCode.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.nodesMesh = new THREE.Points(geometry, material);
    this.scene.add(this.nodesMesh);
  }

  createConnectionsMesh() {
    const connections = this.networkData.connections;
    const nodes = this.networkData.nodes;
    const geometry = new THREE.BufferGeometry();

    const positions = [];
    const startPoints = [];
    const endPoints = [];
    const pathProgresses = [];
    const revealeds = [];
    const pathColors = [];

    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);

      if (!fromNode || !toNode) return;

      const segments = 20;
      for (let i = 0; i < segments; i++) {
        const t = i / (segments - 1);
        positions.push(0, 0, 0); // Will be computed in vertex shader
        startPoints.push(fromNode.position.x, fromNode.position.y, fromNode.position.z);
        endPoints.push(toNode.position.x, toNode.position.y, toNode.position.z);
        pathProgresses.push(t);
        revealeds.push(conn.revealed ? 1.0 : 0.0);

        const color = MapConfig.colors.pathDefault;
        pathColors.push(color.r, color.g, color.b);
      }
    });

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('startPoint', new THREE.Float32BufferAttribute(startPoints, 3));
    geometry.setAttribute('endPoint', new THREE.Float32BufferAttribute(endPoints, 3));
    geometry.setAttribute('pathProgress', new THREE.Float32BufferAttribute(pathProgresses, 1));
    geometry.setAttribute('revealed', new THREE.Float32BufferAttribute(revealeds, 1));
    geometry.setAttribute('pathColor', new THREE.Float32BufferAttribute(pathColors, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uEnergyPulseStart: { value: new THREE.Vector3() },
        uEnergyPulseEnd: { value: new THREE.Vector3() },
        uEnergyPulseProgress: { value: 0 },
        uEnergyPulseActive: { value: 0 }
      },
      vertexShader: connectionShaderCode.vertexShader,
      fragmentShader: connectionShaderCode.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.connectionsMesh = new THREE.LineSegments(geometry, material);
    this.scene.add(this.connectionsMesh);
  }

  /**
   * Trigger golden energy burst when node is clicked
   */
  triggerNodeBurst(node) {
    console.log(`[MapRenderer] Golden burst on node: ${node.id}`);

    // Create particle burst
    const burstParticles = [];
    const particleCount = 30;
    const position = node.position;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 3 + Math.random() * 2;

      burstParticles.push({
        position: new THREE.Vector3(position.x, position.y, position.z),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed * 0.5,
          Math.sin(angle * 2) * speed * 0.5
        ),
        life: 1.0,
        size: 0.3 + Math.random() * 0.4
      });
    }

    this.nodeBursts.push({
      particles: burstParticles,
      createdAt: this.clock.getElapsedTime()
    });
  }

  /**
   * Update and render node bursts
   */
  updateNodeBursts(deltaTime) {
    const currentTime = this.clock.getElapsedTime();

    // Update existing bursts
    this.nodeBursts = this.nodeBursts.filter(burst => {
      const age = currentTime - burst.createdAt;
      if (age > 1.5) return false; // Remove old bursts

      burst.particles.forEach(particle => {
        // Update position
        particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

        // Update velocity (gravity + drag)
        particle.velocity.y -= 2 * deltaTime;
        particle.velocity.multiplyScalar(0.95);

        // Update life
        particle.life -= deltaTime / 1.5;
      });

      return true;
    });
  }

  /**
   * Render node bursts
   */
  renderNodeBursts() {
    this.nodeBursts.forEach(burst => {
      burst.particles.forEach(particle => {
        if (particle.life <= 0) return;

        // Create sprite for particle
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: particle.life * 0.8,
            blending: THREE.AdditiveBlending
          })
        );

        sprite.position.copy(particle.position);
        sprite.scale.set(particle.size, particle.size, 1);

        this.scene.add(sprite);

        // Remove sprite after rendering (temporary)
        requestAnimationFrame(() => {
          this.scene.remove(sprite);
          sprite.material.dispose();
        });
      });
    });
  }
  startEnergyPulse(fromNodeId, toNodeId) {
    const fromNode = this.networkData.nodes.find(n => n.id === fromNodeId);
    const toNode = this.networkData.nodes.find(n => n.id === toNodeId);

    if (!fromNode || !toNode) return;

    this.energyPulse.active = true;
    this.energyPulse.start = fromNode.position;
    this.energyPulse.end = toNode.position;
    this.energyPulse.progress = 0;

    console.log(`[MapRenderer] Energy pulse: ${fromNodeId} -> ${toNodeId}`);
  }

  /**
   * Update network visualization
   */
  updateNetwork(networkData) {
    this.networkData = networkData;

    // Update node states and colors
    if (this.nodesMesh) {
      const states = this.nodesMesh.geometry.attributes.nodeState;
      const colors = this.nodesMesh.geometry.attributes.nodeColor;

      networkData.nodes.forEach((node, i) => {
        states.array[i] = this.getStateNumber(node.state);
        const color = this.getNodeColor(node);
        colors.array[i * 3] = color.r;
        colors.array[i * 3 + 1] = color.g;
        colors.array[i * 3 + 2] = color.b;
      });

      states.needsUpdate = true;
      colors.needsUpdate = true;
    }

    // Update connection revealed states
    if (this.connectionsMesh) {
      const revealeds = this.connectionsMesh.geometry.attributes.revealed;
      let idx = 0;

      networkData.connections.forEach(conn => {
        const revealedValue = conn.revealed ? 1.0 : 0.0;
        const segments = 20;
        for (let i = 0; i < segments; i++) {
          revealeds.array[idx] = revealedValue;
          idx++;
        }
      });

      revealeds.needsUpdate = true;
    }
  }

  getStateNumber(state) {
    const map = {
      [NodeStates.CURRENT]: 0,
      [NodeStates.AVAILABLE]: 1,
      [NodeStates.LOCKED]: 2,
      [NodeStates.HIDDEN]: 3,
      [NodeStates.COMPLETED]: 4
    };
    return map[state] || 3;
  }

  getNodeColor(node) {
    const colorMap = {
      [NodeStates.CURRENT]: MapConfig.colors.current,
      [NodeStates.AVAILABLE]: MapConfig.colors.available,
      [NodeStates.LOCKED]: MapConfig.colors.locked,
      [NodeStates.HIDDEN]: MapConfig.colors.hidden,
      [NodeStates.COMPLETED]: MapConfig.colors.completed
    };
    return colorMap[node.state] || MapConfig.colors.hidden;
  }

  animate() {
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Update controls
    this.controls.update();

    // Update node bursts
    this.updateNodeBursts(deltaTime);

    // Update shader uniforms
    if (this.nodesMesh) {
      this.nodesMesh.material.uniforms.uTime.value = elapsedTime;
    }

    if (this.connectionsMesh) {
      this.connectionsMesh.material.uniforms.uTime.value = elapsedTime;

      // Update energy pulse
      if (this.energyPulse.active) {
        this.energyPulse.progress += deltaTime / this.energyPulse.duration;

        if (this.energyPulse.progress >= 1.0) {
          this.energyPulse.active = false;
          this.energyPulse.progress = 0;
        }

        this.connectionsMesh.material.uniforms.uEnergyPulseStart.value.copy(this.energyPulse.start);
        this.connectionsMesh.material.uniforms.uEnergyPulseEnd.value.copy(this.energyPulse.end);
        this.connectionsMesh.material.uniforms.uEnergyPulseProgress.value = this.energyPulse.progress;
        this.connectionsMesh.material.uniforms.uEnergyPulseActive.value = 1.0;
      } else {
        this.connectionsMesh.material.uniforms.uEnergyPulseActive.value = 0.0;
      }
    }

    // Render node bursts
    this.renderNodeBursts();

    // Render
    this.composer.render();
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  /**
   * Get node at screen position (for raycasting)
   */
  getNodeAtPosition(screenX, screenY) {
    const mouse = new THREE.Vector2(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 0.5;
    raycaster.setFromCamera(mouse, this.camera);

    if (!this.nodesMesh) return null;

    const intersects = raycaster.intersectObject(this.nodesMesh);

    if (intersects.length > 0) {
      const index = intersects[0].index;
      return this.networkData.nodes[index];
    }

    return null;
  }

  dispose() {
    this.controls.dispose();
    this.renderer.dispose();
    this.composer.dispose();

    if (this.nodesMesh) {
      this.nodesMesh.geometry.dispose();
      this.nodesMesh.material.dispose();
    }

    if (this.connectionsMesh) {
      this.connectionsMesh.geometry.dispose();
      this.connectionsMesh.material.dispose();
    }
  }
}
