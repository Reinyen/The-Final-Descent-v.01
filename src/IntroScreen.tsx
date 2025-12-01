import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

/**
 * Animation timeline phases for the intro sequence
 */
type AnimationPhase = 'fade_in' | 'comet_approach' | 'impact' | 'crater_settle' | 'button_reveal' | 'complete';

interface IntroScreenProps {
  onBegin?: () => void;
  quality?: 'high' | 'low' | 'auto'; // BLUEPRINT 12: Quality tier configuration
  debugMode?: boolean; // BLUEPRINT 14: Debug HUD toggle
}

// BLUEPRINT 12: Quality tier configuration
interface QualityConfig {
  particleScale: number;      // Multiplier for particle counts
  bloomStrengthScale: number; // Multiplier for bloom intensity
  pixelRatioMax: number;      // Max device pixel ratio
  enableGlassParticles: boolean; // Whether to emit glass dust
}

const QUALITY_CONFIGS: Record<'high' | 'low', QualityConfig> = {
  high: {
    particleScale: 1.0,
    bloomStrengthScale: 1.0,
    pixelRatioMax: 2.0,
    enableGlassParticles: true
  },
  low: {
    particleScale: 0.5,
    bloomStrengthScale: 0.7,
    pixelRatioMax: 1.5,
    enableGlassParticles: false
  }
};

/**
 * BLUEPRINT 12.2: Auto-detect quality based on device capabilities
 */
function detectQuality(): 'high' | 'low' {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio;
  const totalPixels = width * height * Math.min(pixelRatio, 2);

  // Low-end devices: small screens or low pixel counts
  if (totalPixels < 1920 * 1080 || pixelRatio < 1.5) {
    return 'low';
  }

  return 'high';
}

/**
 * IntroScreen Component
 *
 * Cosmic horror intro animation for "The Final Descent"
 * Duration: 6.5 seconds with 6 distinct phases
 *
 * @param {Function} onBegin - Callback triggered when user clicks begin button
 */
export default function IntroScreen({ onBegin, quality = 'auto', debugMode = false }: IntroScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showTitle, setShowTitle] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [titleGlitch, setTitleGlitch] = useState(false);
  const [buttonGlitch, setButtonGlitch] = useState(false);

  // BLUEPRINT 11.3: Track initialization and glitch timeouts for cleanup
  const initializedRef = useRef(false);
  const glitchTimeoutsRef = useRef<Set<number>>(new Set());

  // BLUEPRINT 12 & 13: Quality and accessibility configuration
  const activeQuality = quality === 'auto' ? detectQuality() : quality;
  const qualityConfig = QUALITY_CONFIGS[activeQuality];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // BLUEPRINT 14: Debug state tracking
  const [debugState, setDebugState] = useState({
    phase: 'fade_in' as AnimationPhase,
    elapsed: 0,
    fps: 0,
    pulledStars: 0,
    activeParticles: 0
  });

  // PHASE 1: Diagnostic toggles for isolating rendering issues
  const [diagnostics, setDiagnostics] = useState({
    showPanel: false,
    composerEnabled: true,
    bloomEnabled: true,
    crackEnabled: true,
    fxaaEnabled: true,
    starsEnabled: true,
    cometEnabled: true,
    particlesEnabled: true,
    blackHoleEnabled: true,
    renderTargetType: 'detecting...' as string
  });

  // PHASE 6: Keyboard accessibility handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showButton && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (onBegin) onBegin();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showButton, onBegin]);

  // PHASE 6: Auto-focus button when it appears
  useEffect(() => {
    if (showButton && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [showButton]);

  // PHASE 1: Diagnostic keyboard controls (dev mode only)
  useEffect(() => {
    if (!debugMode) return;

    const handleDiagnosticKeys = (e: KeyboardEvent) => {
      // Don't interfere with button interactions
      if (e.target instanceof HTMLButtonElement) return;

      switch (e.key.toLowerCase()) {
        case 'd':
          setDiagnostics(prev => ({ ...prev, showPanel: !prev.showPanel }));
          break;
        case '1':
          setDiagnostics(prev => ({ ...prev, composerEnabled: !prev.composerEnabled }));
          break;
        case '2':
          setDiagnostics(prev => ({ ...prev, bloomEnabled: !prev.bloomEnabled }));
          break;
        case '3':
          setDiagnostics(prev => ({ ...prev, crackEnabled: !prev.crackEnabled }));
          break;
        case '4':
          setDiagnostics(prev => ({ ...prev, fxaaEnabled: !prev.fxaaEnabled }));
          break;
        case '5':
          setDiagnostics(prev => ({ ...prev, starsEnabled: !prev.starsEnabled }));
          break;
        case '6':
          setDiagnostics(prev => ({ ...prev, cometEnabled: !prev.cometEnabled }));
          break;
        case '7':
          setDiagnostics(prev => ({ ...prev, particlesEnabled: !prev.particlesEnabled }));
          break;
        case '8':
          setDiagnostics(prev => ({ ...prev, blackHoleEnabled: !prev.blackHoleEnabled }));
          break;
      }
    };

    window.addEventListener('keydown', handleDiagnosticKeys);
    return () => window.removeEventListener('keydown', handleDiagnosticKeys);
  }, [debugMode]);

  useEffect(() => {
    if (!containerRef.current) return;

    // BLUEPRINT 11.3: StrictMode safety - prevent double initialization
    if (initializedRef.current) {
      console.warn('[IntroScreen] Already initialized, skipping duplicate effect (StrictMode)');
      return;
    }
    initializedRef.current = true;

    // ============================================================================
    // SCENE SETUP
    // ============================================================================
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 30);

    // BLUEPRINT 1.1: Renderer configuration (LDR pipeline with post-AA)
    const renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: false // Using FXAA post-processing instead
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityConfig.pixelRatioMax));
    renderer.setClearColor(0x000000);
    // LDR color pipeline - keep all values in [0,1] range in shaders
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);

    // ============================================================================
    // PHASE 1 FIX: DETERMINISTIC TIMELINE SYSTEM
    // ============================================================================

    /**
     * Phase mapper: Pure function of intro elapsed time
     * Returns phase info without side effects
     */
    interface PhaseInfo {
      name: AnimationPhase;
      phaseT: number;    // 0..1 within current phase
      globalT: number;   // 0..1 across full 6.5s
      phaseStart: number;
      phaseEnd: number;
    }

    function getPhaseInfo(introElapsed: number): PhaseInfo {
      const clamped = Math.max(0, introElapsed);

      if (clamped < 1.0) {
        return {
          name: 'fade_in',
          phaseT: clamped / 1.0,
          globalT: clamped / 6.5,
          phaseStart: 0.0,
          phaseEnd: 1.0
        };
      } else if (clamped < 4.0) {
        return {
          name: 'comet_approach',
          phaseT: (clamped - 1.0) / 3.0,
          globalT: clamped / 6.5,
          phaseStart: 1.0,
          phaseEnd: 4.0
        };
      } else if (clamped < 4.5) {
        return {
          name: 'impact',
          phaseT: (clamped - 4.0) / 0.5,
          globalT: clamped / 6.5,
          phaseStart: 4.0,
          phaseEnd: 4.5
        };
      } else if (clamped < 5.5) {
        return {
          name: 'crater_settle',
          phaseT: (clamped - 4.5) / 1.0,
          globalT: clamped / 6.5,
          phaseStart: 4.5,
          phaseEnd: 5.5
        };
      } else if (clamped < 6.5) {
        return {
          name: 'button_reveal',
          phaseT: (clamped - 5.5) / 1.0,
          globalT: clamped / 6.5,
          phaseStart: 5.5,
          phaseEnd: 6.5
        };
      } else {
        return {
          name: 'complete',
          phaseT: 1.0,
          globalT: 1.0,
          phaseStart: 6.5,
          phaseEnd: Infinity
        };
      }
    }

    /**
     * PHASE 4: Deterministic camera shake - Pure function of time since impact
     * Uses sinusoidal combination for stable, FPS-independent shake
     * No accumulation, no drift, works correctly at any framerate
     */
    function getCameraShake(timeSinceImpact: number): { x: number; y: number } {
      if (timeSinceImpact < 0 || timeSinceImpact > 0.5) {
        return { x: 0, y: 0 };
      }

      // PHASE 4: Exponential amplitude decay (k=10 for rapid falloff)
      const amplitude = 0.8 * Math.exp(-timeSinceImpact * 10);

      // PHASE 4: Combination of incommensurate frequencies for natural feel
      // Using prime-like frequencies to avoid repetition patterns
      const shake1 = Math.sin(timeSinceImpact * 17.3);
      const shake2 = Math.sin(timeSinceImpact * 23.7);
      const shake3 = Math.sin(timeSinceImpact * 31.1);

      return {
        x: amplitude * (shake1 * 0.5 + shake2 * 0.3 + shake3 * 0.2),
        y: amplitude * (shake2 * 0.5 + shake1 * 0.3 + shake3 * 0.2) * 0.625 // Vertical is 62.5% of horizontal
      };
    }

    /**
     * Time-based glitch trigger: Deterministic from elapsed time
     */
    function shouldGlitch(elapsed: number, lastGlitchTime: number, seed: number): boolean {
      if (elapsed - lastGlitchTime < 0.8) return false; // Min 0.8s between glitches

      // Use seed for deterministic "random" intervals
      const interval = 0.8 + ((Math.sin(seed + lastGlitchTime * 0.7) * 0.5 + 0.5) * 1.5); // 0.8-2.3s (much more frequent)
      return elapsed - lastGlitchTime >= interval;
    }

    /**
     * Project world position to normalized screen coordinates (0-1)
     * Used for dynamic crater center calculation
     */
    function projectToScreenUV(worldPos: THREE.Vector3, camera: THREE.Camera): THREE.Vector2 {
      const vector = worldPos.clone();
      vector.project(camera);

      // Convert from NDC (-1 to 1) to UV (0 to 1)
      // Note: Y is inverted because screen Y goes down but NDC Y goes up
      return new THREE.Vector2(
        (vector.x + 1) / 2,
        1 - (vector.y + 1) / 2
      );
    }

    // ============================================================================
    // PHASE 1: HDR RENDER TARGET DETECTION & SETUP
    // ============================================================================

    // Detect HDR support (half-float render targets)
    const supportsHDR = renderer.capabilities.isWebGL2;
    let renderTargetType: string = 'LDR';

    if (supportsHDR) {
      const halfFloatExt = renderer.extensions.get('EXT_color_buffer_half_float');
      if (halfFloatExt) {
        renderTargetType = 'HDR (HalfFloat)';
      }
    }

    // Update diagnostic state with render target type
    setDiagnostics(prev => ({ ...prev, renderTargetType }));

    // ============================================================================
    // BLUEPRINT 1.2: POST-PROCESSING PIPELINE (DOCUMENTED ORDER)
    // Order: RenderPass → CrackEffect → UnrealBloom → FXAA → Output
    //
    // Rationale (Option A from Blueprint):
    // 1. RenderPass: Render scene to buffer
    // 2. CrackEffect: Modify scene color with reality cracks and distortions
    // 3. UnrealBloom: Bloom both underlying scene AND crack highlights (hot edges glow)
    // 4. FXAA: Final anti-aliasing pass for smooth edges
    // 5. Output: Tone mapping and color space conversion (added in Phase 1)
    //
    // This order allows cracks to participate in bloom, creating the desired
    // "reality-breaking glow" aesthetic where crack edges emit light.
    // ============================================================================

    // Create composer with HDR render targets if supported
    const composer = new EffectComposer(renderer, supportsHDR ?
      new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        type: THREE.HalfFloatType,
        colorSpace: THREE.LinearSRGBColorSpace
      }) : undefined
    );
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Reality Crack Shader (Post-Processing)
    // Applied BEFORE bloom so bloom can enhance the crack effects
    const crackShader = {
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        time: { value: 0.0 },
        intensity: { value: 0.0 },
        crackPhase: { value: 0.0 },
        craterCenter: { value: new THREE.Vector2(0.5, 0.67) } // Updated dynamically each frame
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float time;
        uniform float intensity;
        uniform float crackPhase;
        uniform vec2 craterCenter;
        varying vec2 vUv;

        // Hash function for pseudo-random values
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        // Voronoi cell distance calculation
        vec3 voronoi(vec2 x, float scale) {
          vec2 p = floor(x * scale);
          vec2 f = fract(x * scale);

          float minDist1 = 1.0;
          float minDist2 = 1.0;
          vec2 minPoint = vec2(0.0);

          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 neighbor = vec2(float(i), float(j));
              vec2 point = hash(p + neighbor) * vec2(1.0) + neighbor;
              float dist = length(point - f);

              if (dist < minDist1) {
                minDist2 = minDist1;
                minDist1 = dist;
                minPoint = point;
              } else if (dist < minDist2) {
                minDist2 = dist;
              }
            }
          }

          return vec3(minDist1, minDist2, hash(p + floor(minPoint)));
        }

        void main() {
          vec2 uv = vUv;
          vec2 center = craterCenter;

          // Distance from crater center
          float dist = length(uv - center);

          // Radial fade (soft outer edge) - INCREASED RANGE for more visible cracks
          float radialFade = smoothstep(0.75, 0.0, dist) * intensity;

          if (radialFade < 0.01) {
            gl_FragColor = texture2D(tDiffuse, uv);
            return;
          }

          // PHASE 5: Stable Voronoi cell generation (FIXED SCALE - no crawling)
          // Critical: voronoiScale is CONSTANT to prevent cell topology changes
          // Only crackPhase drives expansion; cell boundaries remain stable
          float voronoiScale = 25.0; // IMMUTABLE - do not animate this!
          vec3 voronoiData = voronoi(uv, voronoiScale);
          float cellDist1 = voronoiData.x;
          float cellDist2 = voronoiData.y;
          float cellId = voronoiData.z;

          // Crack lines (Voronoi edges only) - THICKER, MORE VISIBLE CRACKS
          float edgeDist = cellDist2 - cellDist1;
          float cracks = smoothstep(0.15, 0.0, edgeDist); // Increased from 0.08 to 0.15 for thicker cracks

          // Per-shard distortion - MUCH MORE SEPARATION for visible shards
          float rotation = cellId * 6.28318;
          float separation = crackPhase * 0.15; // Increased from 0.04 to 0.15
          vec2 shardOffset = vec2(cos(rotation), sin(rotation)) * sqrt(cellDist1) * separation * radialFade;
          vec2 distortedUv = uv + shardOffset;

          // Chromatic aberration - MORE INTENSE
          float aberrationStrength = radialFade * 0.06 * (1.0 + cracks * 5.0); // Increased from 0.02 and multiplier from 3.0 to 5.0
          float r = texture2D(tDiffuse, distortedUv + vec2(aberrationStrength, 0.0)).r;
          float g = texture2D(tDiffuse, distortedUv).g;
          float b = texture2D(tDiffuse, distortedUv - vec2(aberrationStrength, 0.0)).b;
          vec3 color = vec3(r, g, b);

          // Crack rendering - MUCH DARKER AND MORE VISIBLE
          float crackDarkness = cracks * 0.9; // Increased from 0.5 to 0.9 for near-black cracks
          color = mix(color, vec3(0.0), crackDarkness);

          // Hot edges (fresh cracks, fade over time) - BRIGHTER
          float hotEdge = cracks * (1.0 - crackPhase * 0.5); // Reduced fade from 0.7 to 0.5
          vec3 hotColor = vec3(3.5, 2.5, 1.8); // Increased brightness
          color += hotColor * hotEdge * 1.2; // Increased from 0.5 to 1.2

          // Cool glow (purple ↔ teal animated) - MORE INTENSE
          vec3 purple = vec3(0.7, 0.3, 1.0); // Brighter purple
          vec3 teal = vec3(0.3, 1.0, 0.9); // Brighter teal
          vec3 coolGlow = mix(purple, teal, sin(time * 2.0) * 0.5 + 0.5);
          color += coolGlow * cracks * 0.8; // Increased from 0.3 to 0.8

          // Glass reflections (shimmer effect) - BRIGHTER
          float shimmer = sin(time * 3.0 + cellId * 6.28) * 0.5 + 0.5;
          vec3 shimmerColor = vec3(0.5, 0.6, 0.7); // Brighter shimmer
          color += shimmerColor * shimmer * cellDist1 * 0.3; // Increased from 0.08 to 0.3

          // Edge reflections (white on boundaries) - MUCH BRIGHTER
          float edgeReflection = smoothstep(0.2, 0.02, edgeDist); // Wider and brighter
          color += vec3(2.0, 1.8, 2.2) * edgeReflection * 1.5; // Increased brightness and added color tint

          // REDUCED desaturation and darkening to keep effects visible
          float luminance = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(color, vec3(luminance), 0.1); // Reduced from 0.3 to 0.1
          color *= 0.95; // Reduced darkening from 0.75 to 0.95

          // Final output with INCREASED opacity for more visibility
          gl_FragColor = vec4(color, radialFade * 0.85); // Increased from 0.5 to 0.85
        }
      `
    };

    const crackPass = new ShaderPass(crackShader);
    composer.addPass(crackPass);

    // PHASE 1: UnrealBloomPass with AGGRESSIVE THRESHOLD for selective bloom
    // Applied AFTER crack shader to enhance glowing effects on cracks
    // CRITICAL FIX: Raised threshold from 0.3 to 0.85 to prevent starfield blooming
    // Only very bright elements (comet, crack highlights, accretion) will bloom
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5 * qualityConfig.bloomStrengthScale, // REDUCED base from 2.0 to 1.5
      0.4, // radius (reduced from 0.5 for tighter glow)
      0.85  // threshold (RAISED from 0.3 to 0.85 for selective bloom)
    );
    composer.addPass(bloomPass);

    // FXAA Anti-Aliasing Pass
    // Applied before output pass to smooth all visual artifacts
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms['resolution'].value.set(
      1 / window.innerWidth,
      1 / window.innerHeight
    );
    composer.addPass(fxaaPass);

    // PHASE 1: Output Pass for proper tone mapping and color space conversion
    // This ensures no double tone-mapping and correct sRGB output
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // ============================================================================
    // BLUEPRINT 4: STARFIELD SYSTEM (GPU-optimized with per-star attributes)
    // ============================================================================
    const starCount = 3000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starBaseSizes = new Float32Array(starCount);
    const starTwinkleSeeds = new Float32Array(starCount);
    const starAbsorptionScales = new Float32Array(starCount);
    const starOriginalPositions = new Float32Array(starCount * 3);

    // PHASE 2: Create high-quality star texture (64x64 for crisp rendering)
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 64;
    starCanvas.height = 64;
    const starCtx = starCanvas.getContext('2d')!;
    const gradient = starCtx.createRadialGradient(32, 32, 0, 32, 32, 32);

    // PHASE 2: Sharper gradient with bright core and diffuse halo
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');    // Bright center
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 1.0)');  // Hold brightness
    gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.8)'); // Sharp falloff starts
    gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.3)'); // Soft halo
    gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.1)');  // Diffuse edge
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');      // Fade out

    starCtx.fillStyle = gradient;
    starCtx.fillRect(0, 0, 64, 64);

    const starTexture = new THREE.CanvasTexture(starCanvas);
    starTexture.needsUpdate = true;

    // Initialize star properties
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      // Position
      starPositions[i3] = (Math.random() - 0.5) * 200; // X: -100 to 100
      starPositions[i3 + 1] = (Math.random() - 0.5) * 150; // Y: -75 to 75
      starPositions[i3 + 2] = -130 + Math.random() * 100; // Z: -130 to -30

      // Store original positions for black hole physics
      starOriginalPositions[i3] = starPositions[i3];
      starOriginalPositions[i3 + 1] = starPositions[i3 + 1];
      starOriginalPositions[i3 + 2] = starPositions[i3 + 2];

      // Star color distribution
      const colorRand = Math.random();
      if (colorRand < 0.7) {
        // 70% white stars
        starColors[i3] = 0.95 + Math.random() * 0.05;
        starColors[i3 + 1] = 0.95 + Math.random() * 0.05;
        starColors[i3 + 2] = 1.0;
      } else if (colorRand < 0.9) {
        // 20% blue-tinted
        starColors[i3] = 0.85;
        starColors[i3 + 1] = 0.9;
        starColors[i3 + 2] = 1.0;
      } else {
        // 10% yellow-tinted
        starColors[i3] = 1.0;
        starColors[i3 + 1] = 0.9;
        starColors[i3 + 2] = 0.8;
      }

      // BLUEPRINT 4.1: Per-star attributes for GPU-based animation
      // Base size (0.5 - 2.0) - immutable
      starBaseSizes[i] = 0.5 + Math.random() * 1.5;

      // Twinkle seed for deterministic GPU animation
      starTwinkleSeeds[i] = Math.random() * 100.0;

      // Absorption scale (1.0 = normal, decreases when pulled into black hole)
      starAbsorptionScales[i] = 1.0;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('baseSize', new THREE.BufferAttribute(starBaseSizes, 1));
    starGeometry.setAttribute('twinkleSeed', new THREE.BufferAttribute(starTwinkleSeeds, 1));
    starGeometry.setAttribute('absorptionScale', new THREE.BufferAttribute(starAbsorptionScales, 1));

    // PHASE 2: Enhanced GPU-based starfield shader with pixel-perfect sizing
    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        starTexture: { value: starTexture },
        baseOpacity: { value: 1.0 },
        pixelRatio: { value: Math.min(window.devicePixelRatio, qualityConfig.pixelRatioMax) },
        viewportHeight: { value: window.innerHeight }
      },
      vertexShader: `
        attribute float baseSize;
        attribute float twinkleSeed;
        attribute float absorptionScale;
        attribute vec3 color;

        uniform float time;
        uniform float baseOpacity;
        uniform float pixelRatio;
        uniform float viewportHeight;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;

        void main() {
          vColor = color;

          // PHASE 2: Smooth twinkle (reduced frequency for less flicker)
          float twinkle = sin(time * 2.0 + twinkleSeed * 0.5) * 0.25 + 0.875;

          // Apply absorption scale (modified on CPU during black hole pull)
          float finalSize = baseSize * twinkle * absorptionScale;

          // Calculate alpha based on opacity and absorption
          vAlpha = baseOpacity * twinkle * absorptionScale;

          // Transform to view space
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // PHASE 2: Pixel-perfect point size calculation
          // Account for perspective, DPR, and viewport height for consistent screen-space size
          float perspectiveFactor = 1.0 / -mvPosition.z;
          float pixelSize = finalSize * perspectiveFactor * viewportHeight * 0.5;
          gl_PointSize = pixelSize * pixelRatio;

          // PHASE 2: Pass depth for depth-cueing in fragment shader
          vDepth = -mvPosition.z / 160.0; // Normalize depth (0=near, 1=far)

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D starTexture;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;

        void main() {
          // PHASE 2: Sample star texture
          vec4 texColor = texture2D(starTexture, gl_PointCoord);

          // PHASE 2: Depth cueing - distant stars slightly dimmer
          float depthFade = 1.0 - vDepth * 0.3; // 30% dimming at max depth

          // PHASE 2: Enhanced star core with subtle glow
          // Stars have sharp center that blooms slightly at edges
          float dist = length(gl_PointCoord - vec2(0.5));
          float coreBrightness = 1.0 - smoothstep(0.0, 0.3, dist);

          // Combine texture alpha with depth fade and core brightness
          float finalAlpha = texColor.a * vAlpha * depthFade;
          vec3 finalColor = vColor * (0.85 + coreBrightness * 0.15);

          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // Track which stars are being pulled
    const pulledStars = new Set<number>();

    // ============================================================================
    // COMET SHADER MATERIALS
    // ============================================================================

    // Simplex noise function for vertex shader
    const simplexNoise3D = `
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

    const cometMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        heatIntensity: { value: 0.0 }
      },
      vertexShader: `
        ${simplexNoise3D}

        uniform float time;
        uniform float heatIntensity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);

          // PHASE 4: Enhanced surface displacement with heat-driven turbulence
          vec3 pos = position;
          float baseNoise = snoise(pos * 2.0 + time * 0.3);
          float heatTurbulence = snoise(pos * 5.0 + time * 2.0) * heatIntensity * 0.1;
          pos += normal * (baseNoise * 0.12 + heatTurbulence);

          vPosition = pos;
          vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        ${simplexNoise3D}

        uniform float time;
        uniform float heatIntensity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          // Multi-scale noise for rock texture
          float noise1 = snoise(vPosition * 3.0 + time * 0.1) * 0.5 + 0.5;
          float noise2 = snoise(vPosition * 7.0 + time * 0.15) * 0.5 + 0.5;
          float noise3 = snoise(vPosition * 15.0 + time * 0.2) * 0.5 + 0.5;
          float combinedNoise = (noise1 + noise2 * 0.5 + noise3 * 0.25) / 1.75;

          // Base rock colors
          vec3 darkGray = vec3(0.12, 0.11, 0.10);
          vec3 mediumGray = vec3(0.20, 0.18, 0.16);
          vec3 lightGray = vec3(0.28, 0.25, 0.22);
          vec3 tan = vec3(0.25, 0.20, 0.15);

          vec3 baseColor = mix(darkGray, mediumGray, noise1);
          baseColor = mix(baseColor, lightGray, noise2 * 0.5);
          baseColor = mix(baseColor, tan, noise3 * 0.3);

          // PHASE 3: Improved atmospheric heat effect with smooth transitions
          if (heatIntensity > 0.01) { // Small epsilon to avoid unnecessary calculations
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 1.8); // Sharper fresnel

            // PHASE 3: Smooth heat intensity curve (smoothstep for C2 continuity)
            float smoothHeat = smoothstep(0.0, 1.0, heatIntensity);
            smoothHeat = smoothHeat * smoothHeat * (3.0 - 2.0 * smoothHeat); // Double smoothstep

            // Multi-stage heat color gradient with smooth transitions
            vec3 earlyHeat = vec3(1.0, 0.45, 0.15);    // Warm orange
            vec3 midHeat = vec3(1.0, 0.25, 0.08);      // Deep orange-red
            vec3 lateHeat = vec3(0.7, 0.2, 0.8);       // Purple plasma
            vec3 extremeHeat = vec3(0.5, 0.35, 1.0);   // Blue-violet (hottest)

            // PHASE 3: Use smoothstep for color transitions to avoid banding
            vec3 heatColor;
            if (smoothHeat < 0.33) {
              float t = smoothstep(0.0, 0.33, smoothHeat);
              heatColor = mix(earlyHeat, midHeat, t);
            } else if (smoothHeat < 0.66) {
              float t = smoothstep(0.33, 0.66, smoothHeat);
              heatColor = mix(midHeat, lateHeat, t);
            } else {
              float t = smoothstep(0.66, 1.0, smoothHeat);
              heatColor = mix(lateHeat, extremeHeat, t);
            }

            // Emissive hotspots (turbulent noise-driven bright spots)
            float hotspotNoise = snoise(vPosition * 8.0 + time * 1.5) * 0.5 + 0.5;
            float hotspots = pow(hotspotNoise, 4.0) * smoothHeat; // Increased pow for sharper spots
            vec3 emissive = heatColor * hotspots * 1.8;

            // PHASE 3: Combine base with heat glow and emissive hotspots
            float heatMix = fresnel * smoothHeat * 0.75;
            baseColor = mix(baseColor, heatColor, heatMix);
            baseColor += emissive * 0.9; // Slightly reduced emissive to avoid over-bloom
          }

          gl_FragColor = vec4(baseColor, 1.0);
        }
      `
    });

    // ============================================================================
    // COMET COMPONENT
    // ============================================================================
    const cometGeometry = new THREE.IcosahedronGeometry(1.2, 4);
    const comet = new THREE.Mesh(cometGeometry, cometMaterial);
    comet.position.set(0, 40, -30);
    comet.scale.set(0.01, 0.01, 0.01);
    comet.visible = false;
    scene.add(comet);

    // PHASE 4: Dynamic comet glow aura (heat-reactive)
    const glowGeometry = new THREE.IcosahedronGeometry(1.8, 2);
    const glowMaterial = new THREE.ShaderMaterial({
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
          vec3 coldColor = vec3(0.4, 0.2, 1.0);      // Purple (cold)
          vec3 warmColor = vec3(1.0, 0.4, 0.1);      // Orange (warm)
          vec3 hotColor = vec3(0.6, 0.3, 0.9);       // Violet (hot)

          vec3 glowColor;
          if (heatIntensity < 0.5) {
            glowColor = mix(coldColor, warmColor, heatIntensity / 0.5);
          } else {
            glowColor = mix(warmColor, hotColor, (heatIntensity - 0.5) / 0.5);
          }

          // Pulsing opacity based on heat
          float pulse = sin(time * 3.0) * 0.05 + 0.95;
          float opacity = (0.15 + heatIntensity * 0.25) * pulse;

          gl_FragColor = vec4(glowColor, opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const cometGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    comet.add(cometGlow);

    // ============================================================================
    // BLACK HOLE COMPONENT (4 layered meshes)
    // ============================================================================
    const blackHoleGroup = new THREE.Group();
    blackHoleGroup.position.set(0, -8, 10);
    blackHoleGroup.scale.set(0, 0, 0);
    blackHoleGroup.visible = false;
    scene.add(blackHoleGroup);

    // PHASE 5: Event Horizon (center sphere) - WRITES DEPTH
    const eventHorizonGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const eventHorizonMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      opacity: 1.0,
      depthWrite: true,  // PHASE 5: Core writes depth for proper occlusion
      depthTest: true
    });
    const eventHorizon = new THREE.Mesh(eventHorizonGeometry, eventHorizonMaterial);
    blackHoleGroup.add(eventHorizon);

    // PHASE 5: Volumetric Inner Core - NO DEPTH WRITE (additive layer)
    const innerCoreGeometry = new THREE.SphereGeometry(3.5, 32, 32);
    const innerCoreMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,  // PHASE 5: Additive layers don't write depth
      depthTest: true,    // But still respect depth for occlusion
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vUv = uv;
          vPosition = position;

          // PHASE 2: Pass world position for proper Fresnel calculation
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vViewPosition = cameraPosition - worldPosition.xyz;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vViewPosition;

        void main() {
          // Convert to polar coordinates
          float radius = length(vPosition.xy) / 3.5;
          float angle = atan(vPosition.y, vPosition.x);

          // 3 counter-rotating spiral layers
          float layer1 = sin(angle * 5.0 + radius * 2.0 - time * 3.0);
          float layer2 = sin(angle * 7.0 - radius * 3.0 + time * 2.0);
          float layer3 = sin(angle * 11.0 + radius * 1.5 - time * 4.0);

          float pattern = (layer1 + layer2 + layer3) / 3.0 * 0.5 + 0.5;

          // PHASE 2: Proper Fresnel calculation using actual view direction
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

          // Color mixing (purple ↔ teal)
          vec3 purple = vec3(0.3, 0.05, 0.4);
          vec3 teal = vec3(0.05, 0.3, 0.35);
          vec3 color = mix(purple, teal, pattern);

          // Pulsing
          float pulse = sin(time * 1.5) * 0.2 + 0.8;

          float alpha = pattern * fresnel * 0.6 * pulse;

          gl_FragColor = vec4(color, alpha);
        }
      `
    });
    const innerCore = new THREE.Mesh(innerCoreGeometry, innerCoreMaterial);
    blackHoleGroup.add(innerCore);

    // PHASE 5: Accretion Disk - NO DEPTH WRITE (additive layer)
    const accretionDiskGeometry = new THREE.RingGeometry(3, 10, 64);
    const accretionDiskMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,  // PHASE 5: Additive layers don't write depth
      depthTest: true,
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Polar coordinates
          float dist = length(vPosition.xy) / 10.0;
          float angle = atan(vPosition.y, vPosition.x);

          // 3 spiral arms
          float spiral1 = sin(angle * 3.0 - dist * 2.0 + time * 2.0);
          float spiral2 = sin(angle * 5.0 + dist * 1.5 - time * 1.5);
          float spiral3 = sin(angle * 7.0 - dist * 3.0 + time * 2.5);

          float pattern = (spiral1 + spiral2 + spiral3) / 3.0 * 0.5 + 0.5;

          // Radial fade
          float radialFade = smoothstep(1.0, 0.3, dist) * smoothstep(0.15, 0.4, dist);

          // Color gradient (inner bright purple → outer dark teal)
          vec3 innerColor = vec3(0.6, 0.2, 0.8);
          vec3 outerColor = vec3(0.1, 0.4, 0.5);
          vec3 color = mix(innerColor, outerColor, dist);

          // Hotspots
          float hotspots = pow(pattern, 3.0);
          color += vec3(0.3, 0.2, 0.4) * hotspots;

          float alpha = radialFade * (0.4 + pattern * 0.3);

          gl_FragColor = vec4(color, alpha);
        }
      `
    });
    const accretionDisk = new THREE.Mesh(accretionDiskGeometry, accretionDiskMaterial);
    accretionDisk.rotation.x = -Math.PI / 2.5; // Tilted
    blackHoleGroup.add(accretionDisk);

    // PHASE 5: Outer Glow (atmosphere) - NO DEPTH WRITE (additive layer)
    const outerGlowGeometry = new THREE.SphereGeometry(5, 32, 32);
    const outerGlowMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,  // PHASE 5: Additive layers don't write depth
      depthTest: true,
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);

          // PHASE 2: Pass world position for proper Fresnel calculation
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vViewPosition = cameraPosition - worldPosition.xyz;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          // PHASE 2: Proper Fresnel calculation using actual view direction
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);

          // Color
          vec3 color = vec3(0.2, 0.1, 0.3);

          // Pulse
          float pulse = sin(time * 2.0) * 0.3 + 0.7;

          float alpha = fresnel * 0.15 * pulse;

          gl_FragColor = vec4(color, alpha);
        }
      `
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    blackHoleGroup.add(outerGlow);

    // ============================================================================
    // PARTICLE SYSTEMS
    // ============================================================================

    // 8.1 Explosion Debris Particles
    const debrisCount = 3000;
    const debrisGeometry = new THREE.BufferGeometry();
    const debrisPositions = new Float32Array(debrisCount * 3);
    const debrisVelocities = new Float32Array(debrisCount * 3);
    const debrisColors = new Float32Array(debrisCount * 3);
    const debrisSizes = new Float32Array(debrisCount);
    const debrisLifetimes = new Float32Array(debrisCount);
    const debrisMaxLifetimes = new Float32Array(debrisCount);

    debrisGeometry.setAttribute('position', new THREE.BufferAttribute(debrisPositions, 3));
    debrisGeometry.setAttribute('color', new THREE.BufferAttribute(debrisColors, 3));
    debrisGeometry.setAttribute('size', new THREE.BufferAttribute(debrisSizes, 1));

    const debrisMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.3, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const debrisParticles = new THREE.Points(debrisGeometry, debrisMaterial);
    scene.add(debrisParticles);

    // 8.2 Glass Dust Particles
    const glassCount = 1000;
    const glassGeometry = new THREE.BufferGeometry();
    const glassPositions = new Float32Array(glassCount * 3);
    const glassVelocities = new Float32Array(glassCount * 3);
    const glassSizes = new Float32Array(glassCount);
    const glassRotations = new Float32Array(glassCount);
    const glassLifetimes = new Float32Array(glassCount);
    const glassMaxLifetimes = new Float32Array(glassCount);

    glassGeometry.setAttribute('position', new THREE.BufferAttribute(glassPositions, 3));
    glassGeometry.setAttribute('size', new THREE.BufferAttribute(glassSizes, 1));

    const glassMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 }
      },
      vertexShader: `
        attribute float size;

        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center) * 2.0;

          // Base shape
          float base = smoothstep(0.5, 0.3, dist);

          // Sparkle effect
          float sparkle = pow(1.0 - dist * 2.0, 3.0);
          sparkle = max(0.0, sparkle);

          float alpha = (base + sparkle * 0.5) * 0.6;

          vec3 color = vec3(0.9, 0.95, 1.0);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const glassParticles = new THREE.Points(glassGeometry, glassMaterial);
    scene.add(glassParticles);

    // ============================================================================
    // PHASE 1 FIX: DETERMINISTIC ANIMATION STATE
    // ============================================================================
    const clock = new THREE.Clock();
    let introElapsed = 0;          // Single source of truth for timeline
    let prevPhase: AnimationPhase = 'fade_in';
    let lastTitleGlitchTime = -10; // Force first glitch check after reveal
    let lastButtonGlitchTime = -10;

    // Camera base position
    const cameraBasePosition = new THREE.Vector3(0, 0, 30);

    // Active particle tracking
    let activeDebrisCount = 0;
    let activeGlassCount = 0;

    // BLUEPRINT 14: FPS tracking for debug HUD
    let lastFpsUpdate = 0;
    let frameCount = 0;
    let currentFps = 60;

    // ============================================================================
    // PHASE 3: SHADER PREWARM (prevents first-frame hitch)
    // ============================================================================

    /**
     * Warm up shaders by rendering offscreen once
     * This triggers shader compilation before they're visible to the user
     */
    function prewarmShaders() {
      // Temporarily show comet offscreen for one render
      const originalCometPos = comet.position.clone();
      const originalCometVisible = comet.visible;

      comet.position.set(10000, 10000, -10000); // Far offscreen
      comet.visible = true;

      // Set non-zero heat for full shader path compilation
      cometMaterial.uniforms.heatIntensity.value = 0.5;
      glowMaterial.uniforms.heatIntensity.value = 0.5;

      // Render once (forces shader compilation)
      renderer.render(scene, camera);

      // Restore original state
      comet.position.copy(originalCometPos);
      comet.visible = originalCometVisible;
      cometMaterial.uniforms.heatIntensity.value = 0.0;
      glowMaterial.uniforms.heatIntensity.value = 0.0;

      // Also prewarm crack shader (render crack pass once)
      crackPass.uniforms.intensity.value = 0.5;
      crackPass.uniforms.crackPhase.value = 0.5;
      composer.render();
      crackPass.uniforms.intensity.value = 0.0;
      crackPass.uniforms.crackPhase.value = 0.0;
    }

    // Prewarm shaders before starting animation
    prewarmShaders();

    // ============================================================================
    // PARTICLE EMISSION FUNCTIONS
    // ============================================================================

    /**
     * PHASE 4: Emit explosion debris particles with strict count consistency
     * Spec: 360 total particles = 120 directions × 3 particles per direction
     * Quality scaling: HIGH = 360 particles (1.0x), LOW = 180 particles (0.5x)
     */
    function emitDebrisParticles() {
      const impactPoint = new THREE.Vector3(0, -8, 10);
      const colorPalette = [
        [0.6, 0.2, 0.8], // Purple
        [0.2, 0.8, 0.7], // Teal
        [0.4, 0.9, 0.5]  // Green
      ];

      // PHASE 4: Scale burst count by quality (120 directions at high, 60 at low)
      const burstCount = Math.floor(120 * qualityConfig.particleScale);
      for (let burst = 0; burst < burstCount; burst++) {
        // PHASE 4: Evenly distributed radial directions (360° / burstCount)
        const angle = (burst * (360 / burstCount)) * Math.PI / 180;

        for (let p = 0; p < 3; p++) {
          if (activeDebrisCount >= debrisCount) break;

          const i = activeDebrisCount;
          const i3 = i * 3;

          // Position at impact point
          debrisPositions[i3] = impactPoint.x;
          debrisPositions[i3 + 1] = impactPoint.y;
          debrisPositions[i3 + 2] = impactPoint.z;

          // Velocity (radial burst)
          const speed = 15 + Math.random() * 25; // 15-40 units/second
          debrisVelocities[i3] = Math.cos(angle) * speed + (Math.random() - 0.5) * 5;
          debrisVelocities[i3 + 1] = Math.sin(angle) * speed * (0.5 * Math.random()) + (Math.random() - 0.5) * 5;
          debrisVelocities[i3 + 2] = (Math.random() - 0.5) * 5;

          // Color (random from palette)
          const colorIndex = Math.floor(Math.random() * colorPalette.length);
          const color = colorPalette[colorIndex];
          debrisColors[i3] = color[0];
          debrisColors[i3 + 1] = color[1];
          debrisColors[i3 + 2] = color[2];

          // Size
          debrisSizes[i] = 12 + Math.random() * 8;

          // Lifetime
          debrisLifetimes[i] = 0;
          debrisMaxLifetimes[i] = 0.6; // 0.6 seconds

          activeDebrisCount++;
        }
      }

      debrisGeometry.attributes.position.needsUpdate = true;
      debrisGeometry.attributes.color.needsUpdate = true;
      debrisGeometry.attributes.size.needsUpdate = true;
    }

    /**
     * PHASE 5: Emit glass dust particles from crack lines
     * Spec: 24 directions, 1 particle per direction per frame, 600ms window (~864 max)
     * Capacity: 1000 particles (buffer size from geometry)
     * Called during crater_settle phase when phaseT < 0.6 (600ms of 1000ms phase)
     * At 60fps: 600ms × 60fps × 24 directions = 864 particles (within 1000 capacity)
     */
    function emitGlassParticles() {
      // This function is only called during appropriate time window
      // Caller (crater_settle phase) handles timing check

      const impactPoint = new THREE.Vector3(0, -8, 10);
      const directions = 24; // PHASE 5: 24 radial directions (spec)
      const particlesPerDirection = 1; // PHASE 5: 1 particle per direction per frame (spec)

      for (let d = 0; d < directions; d++) {
        const angle = (d / directions) * Math.PI * 2;

        for (let p = 0; p < particlesPerDirection; p++) {
          if (activeGlassCount >= glassCount) break;

          const i = activeGlassCount;
          const i3 = i * 3;

          // Position (5-13 units from center, flattened Y)
          const dist = 5 + Math.random() * 8;
          glassPositions[i3] = impactPoint.x + Math.cos(angle) * dist;
          glassPositions[i3 + 1] = impactPoint.y + Math.sin(angle) * dist * 0.3;
          glassPositions[i3 + 2] = impactPoint.z + (Math.random() - 0.5) * 2;

          // Velocity
          glassVelocities[i3] = Math.cos(angle) * 3 + (Math.random() - 0.5) * 8;
          glassVelocities[i3 + 1] = Math.sin(angle) * 3 + (Math.random() - 0.5) * 8;
          glassVelocities[i3 + 2] = (Math.random() - 0.5) * 8;

          // Size
          glassSizes[i] = 0.3 + Math.random() * 1.2;

          // Rotation
          glassRotations[i] = (Math.random() - 0.5) * 4; // -2 to +2 rad/s

          // Lifetime
          glassLifetimes[i] = 0;
          glassMaxLifetimes[i] = 0.8 + Math.random() * 0.4; // 0.8-1.2 seconds

          activeGlassCount++;
        }
      }

      glassGeometry.attributes.position.needsUpdate = true;
      glassGeometry.attributes.size.needsUpdate = true;
    }

    /**
     * PHASE 3: Optimized particle update system
     * Only updates buffers when there are active particles
     */
    function updateParticles(deltaTime: number) {
      // Update debris particles (only if active)
      if (activeDebrisCount > 0) {
        for (let i = 0; i < activeDebrisCount; i++) {
          const i3 = i * 3;

          debrisLifetimes[i] += deltaTime;

          if (debrisLifetimes[i] < debrisMaxLifetimes[i]) {
            // Update position
            debrisPositions[i3] += debrisVelocities[i3] * deltaTime;
            debrisPositions[i3 + 1] += debrisVelocities[i3 + 1] * deltaTime;
            debrisPositions[i3 + 2] += debrisVelocities[i3 + 2] * deltaTime;

            // PHASE 1 FIX: Time-based velocity damping (exponential decay)
            // k=1.22 matches ~0.98 per frame at 60fps: exp(-1.22/60) ≈ 0.98
            const damping = Math.exp(-1.22 * deltaTime);
            debrisVelocities[i3] *= damping;
            debrisVelocities[i3 + 1] *= damping;
            debrisVelocities[i3 + 2] *= damping;

            // Alpha fade (avoid per-frame random allocation - size set at emission)
            const lifeRatio = debrisLifetimes[i] / debrisMaxLifetimes[i];
            debrisSizes[i] *= (1.0 - lifeRatio * 0.3); // Gentle size fade
          } else {
            // Hide dead particle
            debrisSizes[i] = 0;
          }
        }

        // PHASE 3: Only update buffers when particles are active
        debrisGeometry.attributes.position.needsUpdate = true;
        debrisGeometry.attributes.size.needsUpdate = true;
      }

      // Update glass particles (only if active)
      if (activeGlassCount > 0) {
        for (let i = 0; i < activeGlassCount; i++) {
          const i3 = i * 3;

          glassLifetimes[i] += deltaTime;

          if (glassLifetimes[i] < glassMaxLifetimes[i]) {
            // Update position
            glassPositions[i3] += glassVelocities[i3] * deltaTime;
            glassPositions[i3 + 1] += glassVelocities[i3 + 1] * deltaTime;
            glassPositions[i3 + 2] += glassVelocities[i3 + 2] * deltaTime;

            // Gravity
            glassVelocities[i3 + 1] -= 9.8 * 0.3 * deltaTime;

            // PHASE 1 FIX: Time-based air resistance (exponential decay)
            // k=0.92 matches ~0.985 per frame at 60fps: exp(-0.92/60) ≈ 0.985
            const damping = Math.exp(-0.92 * deltaTime);
            glassVelocities[i3] *= damping;
            glassVelocities[i3 + 1] *= damping;
            glassVelocities[i3 + 2] *= damping;

            // Alpha fade (avoid per-frame random allocation)
            const lifeRatio = glassLifetimes[i] / glassMaxLifetimes[i];
            glassSizes[i] *= (1.0 - lifeRatio * 0.4); // Fade out
          } else {
            // Hide dead particle
            glassSizes[i] = 0;
          }
        }

        // PHASE 3: Only update buffers when particles are active
        glassGeometry.attributes.position.needsUpdate = true;
        glassGeometry.attributes.size.needsUpdate = true;
      }
    }

    /**
     * PHASE 5: Screen-space star-pulling physics with deltaTime integration
     * - dt-based integration: works correctly at any framerate (30fps, 60fps, 144fps)
     * - Clamped velocity: prevents snapping on long frames
     * - Exponential absorption: smooth fade via GPU attribute
     * - Screen-space pull: visually consistent effect regardless of depth
     */
    function updateStarPulling(deltaTime: number, camera: THREE.Camera) {
      const blackHolePos = new THREE.Vector3(0, -8, 10);
      const positions = starGeometry.attributes.position.array as Float32Array;
      const absorptionScales = starGeometry.attributes.absorptionScale.array as Float32Array;

      // Project black hole to screen space once
      const blackHoleScreen = blackHolePos.clone();
      blackHoleScreen.project(camera);

      let positionChanged = false;
      let absorptionChanged = false;

      pulledStars.forEach(starIndex => {
        const i3 = starIndex * 3;

        const starPos = new THREE.Vector3(
          positions[i3],
          positions[i3 + 1],
          positions[i3 + 2]
        );

        // Project star to screen space
        const starScreen = starPos.clone();
        starScreen.project(camera);

        // Calculate screen-space distance and direction
        const screenDist = Math.sqrt(
          Math.pow(blackHoleScreen.x - starScreen.x, 2) +
          Math.pow(blackHoleScreen.y - starScreen.y, 2)
        );

        // Screen-space pull direction (normalized)
        const screenDirX = (blackHoleScreen.x - starScreen.x) / (screenDist + 0.001);
        const screenDirY = (blackHoleScreen.y - starScreen.y) / (screenDist + 0.001);

        // PHASE 5: dt-based pull force with velocity clamping
        // pullStrength scales with deltaTime (framerate independent)
        const pullStrength = deltaTime * 0.08 / (screenDist * screenDist + 0.01);
        const clampedPullStrength = Math.min(pullStrength, 0.05); // Prevent snapping

        // Apply pull in screen space
        starScreen.x += screenDirX * clampedPullStrength;
        starScreen.y += screenDirY * clampedPullStrength;
        // Keep original Z depth in screen space

        // Unproject back to world space
        starScreen.unproject(camera);

        // Update position
        positions[i3] = starScreen.x;
        positions[i3 + 1] = starScreen.y;
        positions[i3 + 2] = starScreen.z;
        positionChanged = true;

        // World-space distance for absorption effect
        const worldDist = starPos.distanceTo(blackHolePos);

        // BLUEPRINT 8.3: Time-based absorption via GPU attribute
        if (worldDist < 3) {
          // Exponential decay: exp(-k * dt) where k=3.0
          absorptionScales[starIndex] *= Math.exp(-3.0 * deltaTime);
          absorptionChanged = true;

          // BLUEPRINT 8.3: Mark as absorbed when scale is very small
          if (absorptionScales[starIndex] < 0.05) {
            // Move star far away (effectively removed)
            positions[i3] = 10000;
            positions[i3 + 1] = 10000;
            positions[i3 + 2] = -10000;
          }
        }
      });

      // Only update buffers if changes were made
      if (positionChanged) {
        starGeometry.attributes.position.needsUpdate = true;
      }
      if (absorptionChanged) {
        starGeometry.attributes.absorptionScale.needsUpdate = true;
      }
    }

    /**
     * Select stars for pulling (8% of nearby stars)
     */
    function selectStarsToPull() {
      const blackHolePos = new THREE.Vector3(0, -8, 10);
      const positions = starGeometry.attributes.position.array as Float32Array;

      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        const starPos = new THREE.Vector3(
          positions[i3],
          positions[i3 + 1],
          positions[i3 + 2]
        );

        const distance = starPos.distanceTo(blackHolePos);

        // Within 30 units and 8% probability
        if (distance < 30 && Math.random() < 0.08) {
          pulledStars.add(i);
        }
      }
    }

    // ============================================================================
    // PHASE 1 FIX: TIME-BASED GLITCH TRIGGERING (NO SETTIMEOUT)
    // ============================================================================
    // Glitch logic now handled deterministically in animate loop

    // ============================================================================
    // ANIMATION LOOP
    // ============================================================================

    function animate() {
      // PHASE 1 FIX: Long-frame protection
      const rawDelta = clock.getDelta();
      const deltaTime = Math.min(rawDelta, 1 / 30); // Clamp to 30fps max step

      introElapsed += deltaTime;
      const phase = getPhaseInfo(introElapsed);

      // Update shader time uniforms (use introElapsed for consistency)
      starMaterial.uniforms.time.value = introElapsed;
      cometMaterial.uniforms.time.value = introElapsed;
      crackPass.uniforms.time.value = introElapsed;
      innerCoreMaterial.uniforms.time.value = introElapsed;
      accretionDiskMaterial.uniforms.time.value = introElapsed;
      outerGlowMaterial.uniforms.time.value = introElapsed;

      // Update crater center projection dynamically
      const blackHoleWorldPos = new THREE.Vector3(0, -8, 10);
      const craterUV = projectToScreenUV(blackHoleWorldPos, camera);
      crackPass.uniforms.craterCenter.value.copy(craterUV);

      // ============================================================================
      // PHASE 1 FIX: DETERMINISTIC PHASE EXECUTION
      // ============================================================================

      // One-time phase enter actions
      if (phase.name !== prevPhase) {
        if (phase.name === 'comet_approach') {
          comet.visible = true;
        } else if (phase.name === 'impact') {
          emitDebrisParticles();
        } else if (phase.name === 'crater_settle') {
          blackHoleGroup.visible = true;
          selectStarsToPull();
        }
        prevPhase = phase.name;
      }

      // ============================================================================
      // PHASE-SPECIFIC UPDATES (Time-driven, not state-driven)
      // ============================================================================

      // FADE_IN: Starfield opacity fade (via shader uniform)
      if (phase.name === 'fade_in') {
        starMaterial.uniforms.baseOpacity.value = phase.phaseT;
      } else {
        starMaterial.uniforms.baseOpacity.value = 1.0;
      }

      // COMET_APPROACH: Falling comet with heat buildup
      if (phase.name === 'comet_approach') {
        const eased = phase.phaseT * phase.phaseT; // Quadratic ease-in for acceleration

        // PHASE 3: Trajectory tuned for ~60° from vertical approach angle
        // Vertical drop: 48 units (40 to -8)
        // Forward motion: 50 units (-30 to 20) for dramatic diagonal approach
        // This creates tan⁻¹(50/48) ≈ 46° from vertical (compromise for visual impact)
        const startPos = new THREE.Vector3(0, 40, -30);
        const endPos = new THREE.Vector3(0, -8, 20); // Increased Z from 10 to 20 for steeper angle
        comet.position.lerpVectors(startPos, endPos, eased);

        // PHASE 3: Size grows smoothly from tiny to full scale
        const scale = 0.01 + (1.0 - 0.01) * phase.phaseT;
        comet.scale.set(scale, scale, scale);

        // PHASE 3: Rotation uses deltaTime for frame-rate independence
        comet.rotation.x += 1.8 * deltaTime;
        comet.rotation.y += 1.3 * deltaTime;

        // PHASE 3: Smooth cubic heat transition (ease-in-out)
        // Heat starts building gradually, then accelerates
        const t = phase.phaseT;
        const cubicEase = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const heatIntensity = cubicEase * 0.85; // Max 0.85 to avoid over-brightness

        cometMaterial.uniforms.heatIntensity.value = heatIntensity;
        glowMaterial.uniforms.heatIntensity.value = heatIntensity;
        glowMaterial.uniforms.time.value = introElapsed;
      }

      // PHASE 4: Impact explosion with precise timing windows
      if (phase.name === 'impact') {
        // PHASE 4: Strict time windows for controlled sequence
        // 0-120ms: Explosive burst with visible comet
        // 120-500ms: Bloom decay, shake decay, debris expansion

        if (phase.phaseT < 0.24) {
          const t = phase.phaseT / 0.24;
          // PHASE 4: Ease-out cubic for realistic explosion physics
          const easeOut = 1.0 - Math.pow(1.0 - t, 3.0);
          const explosionScale = 1.0 + (6.0 - 1.0) * easeOut;
          comet.scale.set(explosionScale, explosionScale, explosionScale);

          // PHASE 4: Enhance comet glow during explosion
          if (glowMaterial.uniforms) {
            const explosionGlow = easeOut * 0.7;
            glowMaterial.uniforms.heatIntensity.value = Math.min(1.0, 0.85 + explosionGlow);
          }
        } else {
          // Hide comet after explosion burst
          comet.visible = false;
        }

        // PHASE 1 FIX: Controlled bloom spike (SIGNIFICANTLY REDUCED to prevent whiteout)
        // Base strength is now 1.5 (set at bloom pass creation)
        // Peak reduced from 6.0 to 2.5 for controlled flash
        let bloomStrength = 1.5;
        if (!prefersReducedMotion) {
          if (phase.phaseT < 0.04) {
            // Instant flash in first 20ms - REDUCED from 6.0 to 2.5
            bloomStrength = 2.5;
          } else if (phase.phaseT < 0.2) {
            // Rapid decay to medium bloom (20-100ms)
            const t = (phase.phaseT - 0.04) / 0.16;
            bloomStrength = 2.5 - (2.5 - 2.0) * t; // 2.5 -> 2.0
          } else if (phase.phaseT < 0.6) {
            // Exponential decay to base (100-300ms)
            const t = (phase.phaseT - 0.2) / 0.4;
            bloomStrength = 2.0 * Math.exp(-t * 1.5); // Gentler decay
            bloomStrength = Math.max(bloomStrength, 1.5); // Floor at base
          } else {
            bloomStrength = 1.5;
          }
        } else {
          // Reduced motion: gentler bloom spike
          if (phase.phaseT < 0.2) {
            bloomStrength = 2.0;
          } else {
            bloomStrength = 1.5;
          }
        }
        bloomPass.strength = bloomStrength * qualityConfig.bloomStrengthScale;
      } else {
        bloomPass.strength = 1.5 * qualityConfig.bloomStrengthScale; // Reset to base
      }

      // CRATER_SETTLE: Black hole formation + reality cracks + title
      if (phase.name === 'crater_settle' || phase.name === 'button_reveal' || phase.name === 'complete') {
        // Black hole scale fade-in (only during crater_settle)
        if (phase.name === 'crater_settle') {
          blackHoleGroup.scale.setScalar(phase.phaseT);

          // Reality crack effect
          crackPass.uniforms.intensity.value = phase.phaseT;
          crackPass.uniforms.crackPhase.value = phase.phaseT;

          // BLUEPRINT 12: Emit glass particles (first 600ms = 60% of phase) if enabled
          if (phase.phaseT < 0.6 && qualityConfig.enableGlassParticles) {
            emitGlassParticles();
          }

          // Title reveal at 0.4s mark (40% through phase = 4.9s global)
          if (phase.phaseT >= 0.4 && !showTitle) {
            setShowTitle(true);
            // FIXED: Trigger immediate glitch on reveal for dramatic effect
            setTitleGlitch(true);
            const timeout = setTimeout(() => setTitleGlitch(false), 300);
            glitchTimeoutsRef.current.add(timeout);
            // Set timer to allow next glitch soon after
            lastTitleGlitchTime = introElapsed - 1.5;
          }
        } else {
          // Maintain full scale and crack effect
          blackHoleGroup.scale.setScalar(1.0);
          crackPass.uniforms.intensity.value = 1.0;
          crackPass.uniforms.crackPhase.value = 1.0;
        }

        // Black hole rotation (continuous)
        blackHoleGroup.rotation.y += 0.3 * deltaTime;
        blackHoleGroup.rotation.z += 0.15 * deltaTime;
        innerCore.rotation.y -= 0.8 * deltaTime;
        accretionDisk.rotation.z += 2.0 * deltaTime;

        // PHASE 3: Star pulling in screen space (continuous)
        updateStarPulling(deltaTime, camera);

        // Button reveal (only during button_reveal phase at 0.2s mark = 5.7s global)
        if (phase.name === 'button_reveal' && phase.phaseT >= 0.2 && !showButton) {
          setShowButton(true);
          // FIXED: Trigger immediate glitch on reveal for dramatic effect
          setButtonGlitch(true);
          const timeout = setTimeout(() => setButtonGlitch(false), 300);
          glitchTimeoutsRef.current.add(timeout);
          // Set timer to allow next glitch soon after
          lastButtonGlitchTime = introElapsed - 1.5;
        }
      }

      // ============================================================================
      // DETERMINISTIC CONTINUOUS UPDATES
      // ============================================================================

      // PHASE 2: Star twinkling now handled by GPU shader (removed CPU loop)

      // BLUEPRINT 13: Deterministic camera shake (reduced if prefers-reduced-motion)
      if (phase.name === 'impact' && !prefersReducedMotion) {
        const timeSinceImpact = introElapsed - phase.phaseStart;
        const shake = getCameraShake(timeSinceImpact);
        camera.position.x = cameraBasePosition.x + shake.x;
        camera.position.y = cameraBasePosition.y + shake.y;
      } else {
        camera.position.copy(cameraBasePosition);
      }

      // PHASE 1 FIX: Deterministic glitch triggering - INCREASED DURATION
      if (showTitle && shouldGlitch(introElapsed, lastTitleGlitchTime, 12.34)) {
        lastTitleGlitchTime = introElapsed;
        setTitleGlitch(true);
        // Schedule glitch-off after 300ms to match animation duration
        const timeout = setTimeout(() => setTitleGlitch(false), 300);
        glitchTimeoutsRef.current.add(timeout);
      }

      if (showButton && shouldGlitch(introElapsed, lastButtonGlitchTime, 56.78)) {
        lastButtonGlitchTime = introElapsed;
        setButtonGlitch(true);
        // Schedule glitch-off after 300ms to match animation duration
        const timeout = setTimeout(() => setButtonGlitch(false), 300);
        glitchTimeoutsRef.current.add(timeout);
      }

      // Update particles
      updateParticles(deltaTime);

      // BLUEPRINT 14: Update debug state
      if (debugMode) {
        frameCount++;
        if (introElapsed - lastFpsUpdate >= 0.5) {
          currentFps = Math.round(frameCount / (introElapsed - lastFpsUpdate));
          frameCount = 0;
          lastFpsUpdate = introElapsed;

          setDebugState({
            phase: phase.name,
            elapsed: introElapsed,
            fps: currentFps,
            pulledStars: pulledStars.size,
            activeParticles: activeDebrisCount + activeGlassCount
          });
        }
      }

      // PHASE 1: Conditional rendering based on diagnostic toggles
      if (debugMode) {
        // Control scene object visibility
        starField.visible = diagnostics.starsEnabled;
        comet.visible = comet.visible && diagnostics.cometEnabled; // Respect phase visibility
        debrisParticles.visible = diagnostics.particlesEnabled;
        glassParticles.visible = diagnostics.particlesEnabled;
        blackHoleGroup.visible = blackHoleGroup.visible && diagnostics.blackHoleEnabled; // Respect phase visibility

        // Control post-processing passes
        bloomPass.enabled = diagnostics.bloomEnabled;
        crackPass.enabled = diagnostics.crackEnabled;
        fxaaPass.enabled = diagnostics.fxaaEnabled;

        // Render with or without composer
        if (diagnostics.composerEnabled) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }
      } else {
        // Normal render path (no diagnostic overhead)
        composer.render();
      }

      requestAnimationFrame(animate);
    }

    animate();

    // ============================================================================
    // WINDOW RESIZE HANDLING
    // ============================================================================

    function handleResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      composer.setSize(width, height);

      // Update post-processing uniforms
      crackPass.uniforms.resolution.value.set(width, height);
      fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);

      // PHASE 2: Update starfield uniforms for pixel-perfect sizing
      starMaterial.uniforms.viewportHeight.value = height;
      starMaterial.uniforms.pixelRatio.value = Math.min(window.devicePixelRatio, qualityConfig.pixelRatioMax);
    }

    window.addEventListener('resize', handleResize);

    // ============================================================================
    // BLUEPRINT 11.2: COMPREHENSIVE CLEANUP
    // ============================================================================

    return () => {
      window.removeEventListener('resize', handleResize);

      // Clear all glitch timeouts
      glitchTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      glitchTimeoutsRef.current.clear();

      // Dispose geometries
      starGeometry.dispose();
      cometGeometry.dispose();
      glowGeometry.dispose();
      eventHorizonGeometry.dispose();
      innerCoreGeometry.dispose();
      accretionDiskGeometry.dispose();
      outerGlowGeometry.dispose();
      debrisGeometry.dispose();
      glassGeometry.dispose();

      // Dispose materials
      starMaterial.dispose();
      cometMaterial.dispose();
      glowMaterial.dispose();
      eventHorizonMaterial.dispose();
      innerCoreMaterial.dispose();
      accretionDiskMaterial.dispose();
      outerGlowMaterial.dispose();
      debrisMaterial.dispose();
      glassMaterial.dispose();

      // Dispose textures
      starTexture.dispose();

      // Dispose renderer and render targets
      composer.dispose?.(); // Dispose composer if method exists
      renderer.dispose();

      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }

      // Reset initialization flag for potential remount
      initializedRef.current = false;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Three.js canvas container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* PHASE 1: Enhanced Debug HUD with Diagnostics */}
      {debugMode && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-90 text-white font-mono text-xs p-3 rounded z-50 pointer-events-none">
          <div className="font-bold text-green-400 mb-2">DEBUG MODE (Press D for Diagnostics)</div>
          <div>Phase: {debugState.phase}</div>
          <div>Elapsed: {debugState.elapsed.toFixed(2)}s</div>
          <div>FPS: {debugState.fps}</div>
          <div>Pulled Stars: {debugState.pulledStars}</div>
          <div>Active Particles: {debugState.activeParticles}</div>
          <div>Quality: {activeQuality}</div>
          <div>DPR: {Math.min(window.devicePixelRatio, qualityConfig.pixelRatioMax).toFixed(2)}</div>
          <div>Render Target: {diagnostics.renderTargetType}</div>
          <div>Reduced Motion: {prefersReducedMotion ? 'Yes' : 'No'}</div>
        </div>
      )}

      {/* PHASE 1: Diagnostic Controls Panel */}
      {debugMode && diagnostics.showPanel && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-90 text-white font-mono text-xs p-3 rounded z-50 pointer-events-none">
          <div className="font-bold text-cyan-400 mb-2">DIAGNOSTICS</div>
          <div className="text-gray-400 mb-2">Press keys to toggle:</div>
          <div className={diagnostics.composerEnabled ? 'text-green-400' : 'text-red-400'}>
            [1] Composer: {diagnostics.composerEnabled ? 'ON' : 'OFF'}
          </div>
          <div className={diagnostics.bloomEnabled ? 'text-green-400' : 'text-red-400'}>
            [2] Bloom: {diagnostics.bloomEnabled ? 'ON' : 'OFF'}
          </div>
          <div className={diagnostics.crackEnabled ? 'text-green-400' : 'text-red-400'}>
            [3] Cracks: {diagnostics.crackEnabled ? 'ON' : 'OFF'}
          </div>
          <div className={diagnostics.fxaaEnabled ? 'text-green-400' : 'text-red-400'}>
            [4] FXAA: {diagnostics.fxaaEnabled ? 'ON' : 'OFF'}
          </div>
          <div className={diagnostics.starsEnabled ? 'text-green-400' : 'text-red-400'}>
            [5] Stars: {diagnostics.starsEnabled ? 'ON' : 'OFF'}
          </div>
          <div className={diagnostics.cometEnabled ? 'text-green-400' : 'text-red-400'}>
            [6] Comet: {diagnostics.cometEnabled ? 'ON' : 'OFF'}
          </div>
          <div className={diagnostics.particlesEnabled ? 'text-green-400' : 'text-red-400'}>
            [7] Particles: {diagnostics.particlesEnabled ? 'ON' : 'OFF'}
          </div>
          <div className={diagnostics.blackHoleEnabled ? 'text-green-400' : 'text-red-400'}>
            [8] Black Hole: {diagnostics.blackHoleEnabled ? 'ON' : 'OFF'}
          </div>
        </div>
      )}

      {/* Title Text - PHASE 6: Added semantic heading and aria-live */}
      <div
        className={`absolute top-[30%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-600 ${
          showTitle ? 'opacity-100' : 'opacity-0'
        }`}
        aria-live="polite"
        aria-atomic="true"
      >
        <h1
          className={`font-rajdhani font-bold text-5xl tracking-[0.25em] text-white text-center ${
            titleGlitch ? 'animate-glitch' : showTitle ? 'animate-glitch-in' : ''
          }`}
          style={{
            textShadow: `
              2px 0 0 rgba(255, 0, 255, 0.7),
              -2px 0 0 rgba(0, 255, 255, 0.7),
              0 0 40px rgba(150, 100, 200, 0.8)
            `
          }}
        >
          THE FINAL DESCENT
        </h1>
      </div>

      {/* PHASE 6: Enhanced button with accessibility and focus states */}
      <div
        className={`absolute top-[66%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 ${
          showButton ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          ref={buttonRef}
          className={`font-rajdhani font-semibold text-base tracking-[0.2em] text-white bg-transparent border-none px-4 py-2 cursor-pointer transition-all duration-200 hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-60 ${
            buttonGlitch ? 'animate-glitch' : showButton ? 'animate-glitch-in' : ''
          }`}
          style={{
            textShadow: `
              1px 0 0 rgba(255, 0, 255, 0.6),
              -1px 0 0 rgba(0, 255, 255, 0.6),
              0 0 20px rgba(150, 255, 200, 0.8)
            `,
            pointerEvents: showButton ? 'auto' : 'none'
          }}
          onClick={() => {
            if (onBegin) onBegin();
          }}
          disabled={!showButton}
          aria-label="Begin the descent - Start the game"
          tabIndex={showButton ? 0 : -1}
        >
          BEGIN THE DESCENT
        </button>
      </div>
    </div>
  );
}
