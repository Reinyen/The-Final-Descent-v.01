import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

/**
 * PHASE 9: Scratch vectors for hot-loop operations (avoid per-frame allocations)
 * These are reused across frames to eliminate GC pressure
 */
const _scratchVec3A = new THREE.Vector3();
const _scratchVec3B = new THREE.Vector3();
const _scratchVec3C = new THREE.Vector3();

/**
 * PHASE 9: Constant positions (hoisted to avoid repeated allocations)
 */
const BLACK_HOLE_POSITION = new THREE.Vector3(0, -8, -70);
const IMPACT_POINT = new THREE.Vector3(0, -8, -70);
const COMET_START_POSITION = new THREE.Vector3(0, 40, -30);
const COMET_END_POSITION = new THREE.Vector3(0, -8, -70);

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
    fxaaEnabled: true,
    outputPassEnabled: true,
    crackPassEnabled: true, // Future: for Phase 6
    starsEnabled: true,
    cometEnabled: true,
    particlesEnabled: true,
    blackHoleEnabled: true,
    uiEnabled: true,
    parityMode: false, // Golden parity: composer with ONLY RenderPass
    timeFrozen: false,
    scrubbedTime: 0,
    renderTargetType: 'detecting...' as string,
    renderSize: { width: 0, height: 0 },
    toneMapping: 'unknown' as string,
    outputColorSpace: 'unknown' as string
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
          setDiagnostics(prev => ({ ...prev, fxaaEnabled: !prev.fxaaEnabled }));
          break;
        case '4':
          setDiagnostics(prev => ({ ...prev, starsEnabled: !prev.starsEnabled }));
          break;
        case '5':
          setDiagnostics(prev => ({ ...prev, cometEnabled: !prev.cometEnabled }));
          break;
        case '6':
          setDiagnostics(prev => ({ ...prev, particlesEnabled: !prev.particlesEnabled }));
          break;
        case '7':
          setDiagnostics(prev => ({ ...prev, blackHoleEnabled: !prev.blackHoleEnabled }));
          break;
        case '8':
          setDiagnostics(prev => ({ ...prev, outputPassEnabled: !prev.outputPassEnabled }));
          break;
        case '9':
          setDiagnostics(prev => ({ ...prev, crackPassEnabled: !prev.crackPassEnabled }));
          break;
        case '0':
          setDiagnostics(prev => ({ ...prev, uiEnabled: !prev.uiEnabled }));
          break;
        case 'p':
          // Toggle parity mode (golden reference: RenderPass only)
          setDiagnostics(prev => ({ ...prev, parityMode: !prev.parityMode }));
          break;
        case 'f':
          // Freeze/unfreeze time
          setDiagnostics(prev => ({ ...prev, timeFrozen: !prev.timeFrozen }));
          break;
        case ',':
        case '<':
          // Scrub time backward (0.1s steps)
          setDiagnostics(prev => ({
            ...prev,
            scrubbedTime: Math.max(0, prev.scrubbedTime - 0.1),
            timeFrozen: true
          }));
          break;
        case '.':
        case '>':
          // Scrub time forward (0.1s steps)
          setDiagnostics(prev => ({
            ...prev,
            scrubbedTime: Math.min(10, prev.scrubbedTime + 0.1),
            timeFrozen: true
          }));
          break;
      }
    };

    window.addEventListener('keydown', handleDiagnosticKeys);
    return () => window.removeEventListener('keydown', handleDiagnosticKeys);
  }, [debugMode]);

  useEffect(() => {
    if (!containerRef.current) return;

    // PHASE 10: StrictMode safety - prevent double initialization
    if (initializedRef.current) {
      console.warn('[IntroScreen] Already initialized, skipping duplicate effect (StrictMode)');
      return;
    }
    initializedRef.current = true;

    // PHASE 10: Track RAF ID for cleanup
    let rafId: number | null = null;

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

    // ============================================================================
    // PHASE 3: RENDERER CONFIGURATION (LINEAR WORKFLOW)
    // ============================================================================
    /**
     * PHASE 3: Renderer settings for linear color workflow
     *
     * - toneMapping: Default is NoToneMapping (correct - OutputPass handles it)
     * - outputColorSpace: SRGBColorSpace (linear → sRGB for direct render)
     * - When using composer: OutputPass applies sRGB conversion instead
     *
     * This ensures color-correct rendering in both paths:
     * 1. Direct render: renderer applies linear → sRGB
     * 2. Composer render: OutputPass applies linear → sRGB
     */
    const renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: false // Using FXAA post-processing instead
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityConfig.pixelRatioMax));
    renderer.setClearColor(0x000000);

    // PHASE 3: Linear workflow - no tone mapping on renderer (OutputPass handles it)
    // renderer.toneMapping defaults to THREE.NoToneMapping (0) - correct!
    // PHASE 3: Output color space conversion (linear → sRGB gamma)
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // PHASE 4: Query device max point size for star sizing clamp
    const gl = renderer.getContext();
    const maxPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
    console.log(`[IntroScreen] Device max point size: ${maxPointSize}px`);

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
     * PHASE 11: Time-based glitch trigger with cinematic cadence
     * Respects prefers-reduced-motion accessibility setting
     */
    function shouldGlitch(elapsed: number, lastGlitchTime: number, seed: number): boolean {
      // PHASE 11: Disable glitches entirely for reduced motion preference
      if (prefersReducedMotion) return false;

      // PHASE 11: Cinematic cadence - min 3s between glitches (was 0.8s)
      if (elapsed - lastGlitchTime < 3.0) return false;

      // PHASE 11: Use seed for deterministic "random" intervals: 3-7s (was 0.8-2.3s)
      // More premium feel - rare, deliberate glitches rather than constant noise
      const interval = 3.0 + ((Math.sin(seed + lastGlitchTime * 0.7) * 0.5 + 0.5) * 4.0);
      return elapsed - lastGlitchTime >= interval;
    }

    // ============================================================================
    // PHASE 2: HDR RENDER TARGET DETECTION & SETUP (ROBUST)
    // ============================================================================
    /**
     * PHASE 2: Robust HDR capability detection
     *
     * HDR rendering requires:
     * 1. WebGL2 context (for integer sampler support, MRT, etc.)
     * 2. EXT_color_buffer_half_float extension (for renderable HalfFloat attachments)
     *
     * If BOTH are available:
     *   - Create HalfFloatType render targets with LinearSRGBColorSpace
     *   - Allows values > 1.0 for bloom highlights
     *   - OutputPass applies tone mapping at the end
     *
     * If EITHER is missing:
     *   - Fall back to default LDR (UnsignedByteType)
     *   - All shader outputs must be clamped to [0, 1]
     *   - OutputPass still applies color space conversion
     *
     * This ensures no incomplete framebuffer errors or precision issues.
     */
    const supportsHDR = renderer.capabilities.isWebGL2;
    let renderTargetType: string = 'LDR (UnsignedByte)';
    let actualHDRSupport = false;

    if (supportsHDR) {
      const halfFloatExt = renderer.extensions.get('EXT_color_buffer_half_float');
      if (halfFloatExt) {
        renderTargetType = 'HDR (HalfFloat)';
        actualHDRSupport = true;
      } else {
        renderTargetType = 'LDR (WebGL2, no HalfFloat ext)';
      }
    }

    // PHASE 1: Gather comprehensive diagnostic data
    const toneMappingNames = ['NoToneMapping', 'LinearToneMapping', 'ReinhardToneMapping',
                               'CineonToneMapping', 'ACESFilmicToneMapping', 'CustomToneMapping'];
    const toneMapping = toneMappingNames[renderer.toneMapping] || 'Unknown';
    const outputColorSpaceName = renderer.outputColorSpace === THREE.SRGBColorSpace ? 'sRGB' :
                                   renderer.outputColorSpace === THREE.LinearSRGBColorSpace ? 'Linear-sRGB' :
                                   'Unknown';

    // Update diagnostic state with comprehensive pipeline info
    setDiagnostics(prev => ({
      ...prev,
      renderTargetType,
      renderSize: { width: window.innerWidth, height: window.innerHeight },
      toneMapping,
      outputColorSpace: outputColorSpaceName
    }));

    // ============================================================================
    // PHASE 2 & 3: POST-PROCESSING PIPELINE (LINEAR WORKFLOW CONTRACT)
    // ============================================================================
    /**
     * Pipeline Order: RenderPass → [CrackPass (Phase 6)] → UnrealBloom → FXAA → OutputPass
     *
     * COLOR PIPELINE CONTRACT (PHASE 3):
     * ----------------------------------
     * 1. All scene shaders output LINEAR color values (no gamma encoding)
     * 2. All intermediate render targets use LinearSRGBColorSpace (if HDR)
     * 3. Bloom operates on linear values (correct physically-based behavior)
     * 4. OutputPass is the ONLY stage that applies:
     *    - Tone mapping (if HDR: compress > 1.0 values)
     *    - sRGB gamma encoding (for display)
     * 5. Renderer.outputColorSpace = SRGBColorSpace ensures direct render matches
     *
     * CRITICAL: OutputPass must be enabled for correct output. Disabling it
     * (via diagnostics) will result in linear output that appears washed out.
     *
     * VERIFICATION:
     * - Use [P] parity mode to compare: direct render vs composer+RenderPass only
     * - These should match visually (both apply same output transform)
     * - Use [1] to toggle composer and compare direct vs full pipeline
     */

    // PHASE 2: Create composer with HDR render targets ONLY if extension available
    const composer = new EffectComposer(renderer, actualHDRSupport ?
      new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        type: THREE.HalfFloatType,
        colorSpace: THREE.LinearSRGBColorSpace  // Linear workflow: no gamma in intermediate buffers
      }) : undefined  // LDR fallback: EffectComposer creates default UnsignedByteType target
    );
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // CRITICAL FIX: Minimal bloom - explosion flash comes from comet itself, NOT bloom
    // Bloom is ONLY for subtle glow on cracks and black hole accretion disk
    // NO bloom spike during impact - keeps constant low value throughout
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.35 * qualityConfig.bloomStrengthScale, // MINIMAL: 0.35 (no whiteout possible)
      0.3, // radius (tight, minimal spread)
      0.7  // threshold (only brightest elements like crack highlights)
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
    const starBaseColors = new Float32Array(starCount * 3); // Store original colors for ripple effects
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

      // PHASE 4: Per-star base size (recalibrated for crisp pinpoints)
      // Distribution: 70% small (0.3-0.6), 25% medium (0.6-0.9), 5% hero (0.9-1.2)
      const sizeRand = Math.random();
      if (sizeRand < 0.70) {
        // 70% small stars
        starBaseSizes[i] = 0.3 + Math.random() * 0.3; // 0.3 - 0.6
      } else if (sizeRand < 0.95) {
        // 25% medium stars
        starBaseSizes[i] = 0.6 + Math.random() * 0.3; // 0.6 - 0.9
      } else {
        // 5% hero stars (brightest, largest)
        starBaseSizes[i] = 0.9 + Math.random() * 0.3; // 0.9 - 1.2
      }

      // Twinkle seed for deterministic GPU animation
      starTwinkleSeeds[i] = Math.random() * 100.0;

      // Absorption scale (1.0 = normal, decreases when pulled into black hole)
      starAbsorptionScales[i] = 1.0;

      // Store base color for ripple effects (copy from color)
      starBaseColors[i3] = starColors[i3];
      starBaseColors[i3 + 1] = starColors[i3 + 1];
      starBaseColors[i3 + 2] = starColors[i3 + 2];
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('basePosition', new THREE.BufferAttribute(starOriginalPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('baseColor', new THREE.BufferAttribute(starBaseColors, 3));
    starGeometry.setAttribute('baseSize', new THREE.BufferAttribute(starBaseSizes, 1));
    starGeometry.setAttribute('twinkleSeed', new THREE.BufferAttribute(starTwinkleSeeds, 1));
    starGeometry.setAttribute('absorptionScale', new THREE.BufferAttribute(starAbsorptionScales, 1));

    // ============================================================================
    // PHASE 3 & 4: STARFIELD SHADER (LINEAR COLOR OUTPUT)
    // ============================================================================
    /**
     * PHASE 3: Shader outputs LINEAR color values (no gamma encoding)
     * - Color buffer values are linear (0.95, 1.0, etc.)
     * - No pow(color, 1.0/2.2) or other gamma correction in shader
     * - Output transform applied by OutputPass only
     *
     * PHASE 4: Starfield sizing will be recalibrated for crisp pinpoints
     * (Current sizing produces 7-27px blobs - to be fixed)
     */
    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        starTexture: { value: starTexture },
        baseOpacity: { value: 1.0 },
        starIntensity: { value: 0.85 }, // PHASE 4: Global intensity scalar (tunable)
        pixelRatio: { value: Math.min(window.devicePixelRatio, qualityConfig.pixelRatioMax) },
        viewportHeight: { value: window.innerHeight },
        maxPointSize: { value: maxPointSize } // PHASE 4: Device max point size
      },
      vertexShader: `
        attribute float baseSize;
        attribute float twinkleSeed;
        attribute float absorptionScale;
        attribute vec3 color;

        uniform float time;
        uniform float baseOpacity;
        uniform float starIntensity;
        uniform float pixelRatio;
        uniform float viewportHeight;
        uniform float maxPointSize;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;

        void main() {
          vColor = color;

          // PHASE 4: Twinkle with controlled range [0.8, 1.0] (never exceeds 1.0!)
          // Reduced amplitude (0.1 instead of 0.25) for subtlety
          float twinkle = sin(time * 1.5 + twinkleSeed * 0.5) * 0.1 + 0.9;

          // PHASE 4: Size modulation (twinkle affects brightness more than size)
          float sizeMultiplier = twinkle * absorptionScale;
          float brightnessMultiplier = twinkle * absorptionScale * starIntensity;

          // Transform to view space
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float viewDistance = -mvPosition.z;

          // PHASE 4: Depth cueing - distant stars smaller and dimmer (subtle)
          float depthFactor = 1.0 - (viewDistance - 30.0) / 100.0; // 30-130 range
          depthFactor = clamp(depthFactor, 0.6, 1.0); // Min 60% size/brightness at far plane

          // PHASE 4: Final size calculation (recalibrated for crisp pinpoints)
          // Target: ~1-2px at Z=-80 for median star (baseSize=0.45)
          // Formula simplified: pixels = baseSize * factors * screenScale / distance
          float screenScale = viewportHeight * pixelRatio * 0.025; // Tuning factor
          float pixelSize = baseSize * sizeMultiplier * depthFactor * screenScale / viewDistance;

          // PHASE 4: Clamp to device limits and aesthetic max (4px)
          gl_PointSize = clamp(pixelSize, 1.0, min(maxPointSize, 4.0 * pixelRatio));

          // PHASE 4: Alpha with clamping discipline (never > 1.0)
          vAlpha = clamp(baseOpacity * brightnessMultiplier * depthFactor, 0.0, 1.0);

          // PHASE 4: Pass normalized depth for fragment shader
          vDepth = (viewDistance - 30.0) / 100.0; // 0=near, 1=far

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D starTexture;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vDepth;

        void main() {
          // PHASE 4: Sample star texture
          vec4 texColor = texture2D(starTexture, gl_PointCoord);

          // PHASE 4: Depth is already baked into vAlpha from vertex shader
          // No double-application of depth cueing

          // PHASE 4: Subtle core brightness boost for pinpoint crispness
          float dist = length(gl_PointCoord - vec2(0.5));
          float coreBrightness = smoothstep(0.5, 0.0, dist); // Sharper falloff

          // PHASE 4: Final color with subtle core highlight
          vec3 finalColor = vColor * (0.9 + coreBrightness * 0.1);

          // PHASE 4: Final alpha (depth already applied in vertex shader)
          float finalAlpha = texColor.a * vAlpha;

          // PHASE 4: Ensure clamping (redundant safeguard)
          gl_FragColor = vec4(finalColor, clamp(finalAlpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // Track stars being pulled with detailed physics state
    interface PulledStarData {
      index: number;
      pullStartTime: number; // Absolute time when pull starts (7.5s-11.5s)
      velocity: THREE.Vector3; // Current velocity
      hasImpacted: boolean; // Whether star has hit the black hole
    }
    const pulledStars: PulledStarData[] = [];

    // Track active space-time ripples from star impacts
    interface SpaceTimeRipple {
      position: THREE.Vector3; // Impact position
      startTime: number; // When ripple was created
      duration: number; // How long it lasts (0.3-0.8s)
      maxRadius: number; // Maximum ripple radius
    }
    const activeRipples: SpaceTimeRipple[] = [];

    /**
     * Create a space-time ripple effect when a star impacts the black hole
     */
    function createStarImpactRipple(impactPos: THREE.Vector3, currentTime: number) {
      const duration = 0.3 + Math.random() * 0.5; // 0.3-0.8 seconds
      const maxRadius = 15 + Math.random() * 10; // 15-25 units

      activeRipples.push({
        position: impactPos.clone(),
        startTime: currentTime,
        duration: duration,
        maxRadius: maxRadius
      });

      console.log(`Star impact at (${impactPos.x.toFixed(1)}, ${impactPos.y.toFixed(1)}, ${impactPos.z.toFixed(1)}) - ripple created`);
    }

    /**
     * PHASE 9: Update ripple effects and apply distortion to nearby stars
     * Optimized to eliminate per-frame Vector3 allocations using scratch vectors
     */
    function updateRippleEffects(introElapsed: number) {
      const positions = starGeometry.attributes.position.array as Float32Array;
      const basePositions = starGeometry.attributes.basePosition.array as Float32Array;
      const colors = starGeometry.attributes.color.array as Float32Array;
      const baseColors = starGeometry.attributes.baseColor.array as Float32Array;

      // Clean up expired ripples
      for (let i = activeRipples.length - 1; i >= 0; i--) {
        const ripple = activeRipples[i];
        const age = introElapsed - ripple.startTime;
        if (age > ripple.duration) {
          activeRipples.splice(i, 1);
        }
      }

      // If no active ripples, reset all stars to base colors and positions
      if (activeRipples.length === 0) {
        let needsColorReset = false;
        let needsPositionReset = false;
        for (let i = 0; i < starCount; i++) {
          const i3 = i * 3;
          // Reset colors
          if (colors[i3] !== baseColors[i3] || colors[i3 + 1] !== baseColors[i3 + 1] || colors[i3 + 2] !== baseColors[i3 + 2]) {
            colors[i3] = baseColors[i3];
            colors[i3 + 1] = baseColors[i3 + 1];
            colors[i3 + 2] = baseColors[i3 + 2];
            needsColorReset = true;
          }
          // Reset positions
          if (positions[i3] !== basePositions[i3] || positions[i3 + 1] !== basePositions[i3 + 1] || positions[i3 + 2] !== basePositions[i3 + 2]) {
            positions[i3] = basePositions[i3];
            positions[i3 + 1] = basePositions[i3 + 1];
            positions[i3 + 2] = basePositions[i3 + 2];
            needsPositionReset = true;
          }
        }
        if (needsColorReset) {
          starGeometry.attributes.color.needsUpdate = true;
        }
        if (needsPositionReset) {
          starGeometry.attributes.position.needsUpdate = true;
        }
        return;
      }

      let colorChanged = false;
      let positionChanged = false;

      // PHASE 9: Apply ripple effects to all stars (no allocations in hot loop)
      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;

        // PHASE 9: Use scratch vector instead of allocating
        const basePosX = basePositions[i3];
        const basePosY = basePositions[i3 + 1];
        const basePosZ = basePositions[i3 + 2];
        _scratchVec3A.set(basePosX, basePosY, basePosZ);

        let totalGlow = 0;
        // PHASE 9: Track distortion components directly (no Vector3 allocation)
        let totalDistortionX = 0;
        let totalDistortionY = 0;
        let totalDistortionZ = 0;

        // Accumulate effects from all active ripples
        for (let r = 0; r < activeRipples.length; r++) {
          const ripple = activeRipples[r];
          const age = introElapsed - ripple.startTime;
          const progress = age / ripple.duration; // 0 to 1

          // Current ripple radius expands over time
          const currentRadius = progress * ripple.maxRadius;

          // PHASE 9: Distance calculation without allocation
          const distance = _scratchVec3A.distanceTo(ripple.position);

          // Ripple wave is a thin ring that expands
          const ringThickness = ripple.maxRadius * 0.15; // 15% of max radius
          const distanceToRing = Math.abs(distance - currentRadius);

          if (distanceToRing < ringThickness) {
            // Star is near the expanding ring
            const ringIntensity = 1.0 - (distanceToRing / ringThickness); // 0 to 1

            // Warm golden glow
            const glowFalloff = 1.0 - progress; // Fade over time
            totalGlow += ringIntensity * glowFalloff * 0.8;

            // PHASE 9: Water-like distortion (radial displacement) - no allocations
            const distortionStrength = ringIntensity * glowFalloff * 0.5 * Math.sin(progress * Math.PI * 2.0);

            // Direction from ripple to star (normalized)
            const dx = basePosX - ripple.position.x;
            const dy = basePosY - ripple.position.y;
            const dz = basePosZ - ripple.position.z;
            const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (len > 0.0001) {
              const invLen = 1.0 / len;
              totalDistortionX += dx * invLen * distortionStrength;
              totalDistortionY += dy * invLen * distortionStrength;
              totalDistortionZ += dz * invLen * distortionStrength;
            }
          }
        }

        // Apply warm golden glow to star color
        if (totalGlow > 0.01) {
          const baseR = baseColors[i3];
          const baseG = baseColors[i3 + 1];
          const baseB = baseColors[i3 + 2];

          // Add warm golden tint
          colors[i3] = Math.min(1.0, baseR + totalGlow * 0.8); // More red
          colors[i3 + 1] = Math.min(1.0, baseG + totalGlow * 0.6); // Medium green
          colors[i3 + 2] = Math.min(1.0, baseB + totalGlow * 0.2); // Less blue

          colorChanged = true;
        }

        // PHASE 9: Apply position distortion (warps star positions like ripples in water)
        const distortionLength = Math.sqrt(totalDistortionX * totalDistortionX + totalDistortionY * totalDistortionY + totalDistortionZ * totalDistortionZ);
        if (distortionLength > 0.001) {
          positions[i3] = basePosX + totalDistortionX;
          positions[i3 + 1] = basePosY + totalDistortionY;
          positions[i3 + 2] = basePosZ + totalDistortionZ;
          positionChanged = true;
        }
      }

      if (colorChanged) {
        starGeometry.attributes.color.needsUpdate = true;
      }
      if (positionChanged) {
        starGeometry.attributes.position.needsUpdate = true;
      }
    }

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
    // PHASE 5: BLACK HOLE COMPONENT (4 layered meshes) - DEPTH COHERENCE FIX
    // ============================================================================
    /**
     * PHASE 5: Black hole positioned at Z=-70 (middle of star volume)
     * - Stars: Z ∈ [-130, -30]
     * - Black hole: Z = -70 (inside star volume, not in front!)
     * - Selection radius 60 units now captures many stars
     * - Before: Z=10 was 40-140 units in front of all stars (selection failed)
     */
    const blackHoleGroup = new THREE.Group();
    blackHoleGroup.position.set(0, -8, -70); // PHASE 5: Moved from Z=10 to Z=-70
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
    const debrisBaseSizes = new Float32Array(debrisCount); // PHASE 8: Store initial sizes
    const debrisLifetimes = new Float32Array(debrisCount);
    const debrisMaxLifetimes = new Float32Array(debrisCount);

    debrisGeometry.setAttribute('position', new THREE.BufferAttribute(debrisPositions, 3));
    debrisGeometry.setAttribute('color', new THREE.BufferAttribute(debrisColors, 3));
    debrisGeometry.setAttribute('size', new THREE.BufferAttribute(debrisSizes, 1));

    // PHASE 7: Debris material with pixel-consistent sizing
    const debrisMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        pixelRatio: { value: Math.min(window.devicePixelRatio, qualityConfig.pixelRatioMax) },
        maxPointSize: { value: maxPointSize } // Device max from Phase 4
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;

        uniform float pixelRatio;
        uniform float maxPointSize;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // PHASE 7: Pixel-consistent sizing (calibrated for 3-8px range)
          // size attribute: 1.0-3.0 (set at emission)
          // depth factor: compensate for perspective
          float viewDistance = -mvPosition.z;
          float pixelSize = size * (50.0 / viewDistance) * pixelRatio;

          // PHASE 7: Clamp to device max and aesthetic max (12px)
          gl_PointSize = clamp(pixelSize, 1.0, min(maxPointSize, 12.0 * pixelRatio));

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          // PHASE 7: Circular particle with smooth falloff
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Smoother gradient for less harsh edges
          float alpha = smoothstep(0.5, 0.2, dist);
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

    // 8.2 Glass Dust Particles (disabled but fixed for completeness)
    const glassCount = 1000;
    const glassGeometry = new THREE.BufferGeometry();
    const glassPositions = new Float32Array(glassCount * 3);
    const glassVelocities = new Float32Array(glassCount * 3);
    const glassSizes = new Float32Array(glassCount);
    const glassBaseSizes = new Float32Array(glassCount); // PHASE 8: Store initial sizes
    // const glassRotations = new Float32Array(glassCount); // Unused - reserved for future rotation animation
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
      const impactPoint = new THREE.Vector3(0, -8, -70); // PHASE 5: Match black hole depth
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

          // PHASE 8: Size (store baseSize for dt-consistent fade)
          const baseSize = 1.0 + Math.random() * 2.0; // 1.0-3.0 (matches shader expectation)
          debrisBaseSizes[i] = baseSize;
          debrisSizes[i] = baseSize; // Initial size

          // Lifetime
          debrisLifetimes[i] = 0;
          debrisMaxLifetimes[i] = 0.6 + Math.random() * 0.4; // 0.6-1.0 seconds

          activeDebrisCount++;
        }
      }

      debrisGeometry.attributes.position.needsUpdate = true;
      debrisGeometry.attributes.color.needsUpdate = true;
      debrisGeometry.attributes.size.needsUpdate = true;
    }

    // Glass particle emission function removed - feature disabled

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

            // PHASE 8: dt-consistent size fade (computed from baseSize + lifeRatio)
            // No per-frame multiplication - size is pure function of time
            const lifeRatio = debrisLifetimes[i] / debrisMaxLifetimes[i];
            debrisSizes[i] = debrisBaseSizes[i] * (1.0 - lifeRatio * 0.5); // 50% fade over lifetime
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

            // PHASE 8: dt-consistent size fade (computed from baseSize + lifeRatio)
            // No per-frame multiplication - size is pure function of time
            const lifeRatio = glassLifetimes[i] / glassMaxLifetimes[i];
            glassSizes[i] = glassBaseSizes[i] * (1.0 - lifeRatio * 0.6); // 60% fade over lifetime
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
     * PHASE 9: Screen-space star-pulling physics with deltaTime integration
     * - dt-based integration: works correctly at any framerate (30fps, 60fps, 144fps)
     * - Clamped velocity: prevents snapping on long frames
     * - Exponential absorption: smooth fade via GPU attribute
     * - Screen-space pull: visually consistent effect regardless of depth
     * - Optimized to eliminate per-frame Vector3 allocations using scratch vectors
     */
    function updateStarPulling(deltaTime: number, introElapsed: number) {
      // PHASE 9: Use hoisted constant instead of allocation
      const positions = starGeometry.attributes.position.array as Float32Array;
      const absorptionScales = starGeometry.attributes.absorptionScale.array as Float32Array;

      let positionChanged = false;
      let absorptionChanged = false;

      pulledStars.forEach(starData => {
        // Only pull stars that have reached their start time and haven't impacted
        if (introElapsed < starData.pullStartTime || starData.hasImpacted) {
          return;
        }

        const i3 = starData.index * 3;

        // PHASE 9: Use scratch vector instead of allocating
        const starPosX = positions[i3];
        const starPosY = positions[i3 + 1];
        const starPosZ = positions[i3 + 2];
        _scratchVec3A.set(starPosX, starPosY, starPosZ);

        // PHASE 9: Calculate direction from star to black hole (no allocations)
        const dx = BLACK_HOLE_POSITION.x - starPosX;
        const dy = BLACK_HOLE_POSITION.y - starPosY;
        const dz = BLACK_HOLE_POSITION.z - starPosZ;

        // World-space distance for gravity calculation
        const distance = _scratchVec3A.distanceTo(BLACK_HOLE_POSITION);

        // PHASE 9: Normalize direction (no allocation)
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        let dirX = 0, dirY = 0, dirZ = 0;
        if (len > 0.0001) {
          const invLen = 1.0 / len;
          dirX = dx * invLen;
          dirY = dy * invLen;
          dirZ = dz * invLen;
        }

        // Gravitational acceleration: F = G * M / r^2
        // Using simplified constants: G * M = 200.0 for strong, visible pull
        const gravityConstant = 200.0;
        const acceleration = gravityConstant / (distance * distance + 0.1); // +0.1 to prevent division by zero

        // PHASE 9: Update velocity: v = v + a * dt (no clone)
        starData.velocity.x += dirX * acceleration * deltaTime;
        starData.velocity.y += dirY * acceleration * deltaTime;
        starData.velocity.z += dirZ * acceleration * deltaTime;

        // PHASE 9: Update position: p = p + v * dt (no clone)
        positions[i3] = starPosX + starData.velocity.x * deltaTime;
        positions[i3 + 1] = starPosY + starData.velocity.y * deltaTime;
        positions[i3 + 2] = starPosZ + starData.velocity.z * deltaTime;
        positionChanged = true;

        // Check for impact (distance < 2 units from black hole center)
        if (distance < 2.0 && !starData.hasImpacted) {
          starData.hasImpacted = true;

          // PHASE 9: Trigger impact explosion and ripple effect (use scratch for cloning)
          _scratchVec3B.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
          createStarImpactRipple(_scratchVec3B.clone(), introElapsed);

          // Start absorption effect
          absorptionScales[starData.index] = 1.0;
          absorptionChanged = true;
        }

        // Absorption effect for impacted stars
        if (starData.hasImpacted) {
          absorptionScales[starData.index] *= Math.exp(-3.0 * deltaTime);
          absorptionChanged = true;

          // Remove star when fully absorbed
          if (absorptionScales[starData.index] < 0.05) {
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

    // Track when to pull next batch of stars
    let nextBatchPullTime = 0;
    const alreadyPulledStars = new Set<number>();

    /**
     * PHASE 9: Select initial stars to pull immediately when black hole forms
     * Now properly selects stars because black hole is inside star volume!
     * Optimized to eliminate Vector3 allocations in loop
     */
    function selectInitialStarsToPull() {
      // PHASE 9: Use hoisted constant instead of allocation
      const positions = starGeometry.attributes.position.array as Float32Array;

      // PHASE 9: Find nearby stars (within 60 units) - no allocations in loop
      const nearbyStars: number[] = [];
      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        // PHASE 9: Use scratch vector instead of allocating
        _scratchVec3A.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
        const distance = _scratchVec3A.distanceTo(BLACK_HOLE_POSITION);
        if (distance < 60) {
          nearbyStars.push(i);
        }
      }

      // Select 12 stars
      const numStarsToPull = Math.min(12, nearbyStars.length);

      // Shuffle and pick
      const shuffled = nearbyStars.sort(() => Math.random() - 0.5);
      for (let i = 0; i < numStarsToPull; i++) {
        const starIndex = shuffled[i];
        pulledStars.push({
          index: starIndex,
          pullStartTime: 4.5, // All start immediately when black hole forms
          velocity: new THREE.Vector3(0, 0, 0),
          hasImpacted: false
        });
        alreadyPulledStars.add(starIndex);
      }

      // Schedule first additional batch 2-5 seconds after black hole forms
      nextBatchPullTime = 4.5 + 2.0 + Math.random() * 3.0;

      console.log(`Initial batch: ${numStarsToPull} stars pulled at 4.5s`);
    }

    /**
     * PHASE 9: Pull additional batch of 1-4 stars (called periodically)
     * Optimized to eliminate Vector3 allocations in loop
     */
    function pullNextBatchOfStars(currentTime: number) {
      // PHASE 9: Use hoisted constant instead of allocation
      const positions = starGeometry.attributes.position.array as Float32Array;

      // PHASE 9: Find nearby stars that haven't been pulled yet (within 60 units) - no allocations
      const availableStars: number[] = [];
      for (let i = 0; i < starCount; i++) {
        if (alreadyPulledStars.has(i)) continue;

        const i3 = i * 3;
        // PHASE 9: Use scratch vector instead of allocating
        _scratchVec3A.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
        const distance = _scratchVec3A.distanceTo(BLACK_HOLE_POSITION);
        if (distance < 60) {
          availableStars.push(i);
        }
      }

      if (availableStars.length === 0) {
        // No more stars available, reset and allow re-pulling
        alreadyPulledStars.clear();
        return;
      }

      // Select 1-4 stars
      const numStarsToPull = Math.min(1 + Math.floor(Math.random() * 4), availableStars.length);

      // Shuffle and pick
      const shuffled = availableStars.sort(() => Math.random() - 0.5);
      for (let i = 0; i < numStarsToPull; i++) {
        const starIndex = shuffled[i];
        pulledStars.push({
          index: starIndex,
          pullStartTime: currentTime,
          velocity: new THREE.Vector3(0, 0, 0),
          hasImpacted: false
        });
        alreadyPulledStars.add(starIndex);
      }

      // Schedule next batch 2-5 seconds from now
      nextBatchPullTime = currentTime + 2.0 + Math.random() * 3.0;

      console.log(`Additional batch: ${numStarsToPull} stars pulled at ${currentTime.toFixed(1)}s`);
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

      // PHASE 1: Time freeze/scrub support for diagnostics
      if (debugMode && diagnostics.timeFrozen) {
        introElapsed = diagnostics.scrubbedTime;
      } else {
        introElapsed += deltaTime;
      }

      const phase = getPhaseInfo(introElapsed);

      // Update shader time uniforms (use introElapsed for consistency)
      starMaterial.uniforms.time.value = introElapsed;
      cometMaterial.uniforms.time.value = introElapsed;
      innerCoreMaterial.uniforms.time.value = introElapsed;
      accretionDiskMaterial.uniforms.time.value = introElapsed;
      outerGlowMaterial.uniforms.time.value = introElapsed;

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
          selectInitialStarsToPull();
        }
        prevPhase = phase.name;
      }

      // Pull additional batches of stars periodically
      if (introElapsed >= nextBatchPullTime && nextBatchPullTime > 0) {
        pullNextBatchOfStars(introElapsed);
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

        // PHASE 9: Trajectory updated for depth coherence (impact inside star volume)
        // Vertical drop: 48 units (40 to -8)
        // Depth motion: 40 units (-30 to -70) for dramatic diagonal approach into star field
        // Creates a coherent impact point where stars actually exist
        // Use hoisted constants to avoid per-frame allocation
        comet.position.lerpVectors(COMET_START_POSITION, COMET_END_POSITION, eased);

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

      // PHASE 7: Impact explosion with controlled bloom spike
      if (phase.name === 'impact') {
        // PHASE 7: Structured sub-windows
        // 0-100ms: Burst + controlled highlight injection (bloom spike)
        // 100-500ms: Decay + debris expansion + shake decay

        if (phase.phaseT < 0.24) {
          const t = phase.phaseT / 0.24;
          // CRITICAL FIX: Reduced explosion scale to prevent screen domination
          // Ease-out cubic for realistic explosion physics
          const easeOut = 1.0 - Math.pow(1.0 - t, 3.0);
          const explosionScale = 1.0 + (3.5 - 1.0) * easeOut; // REDUCED: 3.5x (was 6.0x)
          comet.scale.set(explosionScale, explosionScale, explosionScale);

          // CRITICAL FIX: Minimal glow during explosion (flash comes from scale, not glow)
          if (glowMaterial.uniforms) {
            const explosionGlow = easeOut * 0.2; // MINIMAL: 0.2 (was 0.4, originally 0.7)
            glowMaterial.uniforms.heatIntensity.value = Math.min(1.0, 0.6 + explosionGlow);
          }
        } else {
          // Hide comet after explosion burst
          comet.visible = false;
        }

        // PHASE 7: Brief controlled bloom spike (0-100ms only)
        // Peak at 50ms, decay to baseline by 150ms
        const timeSinceImpact = (introElapsed - phase.phaseStart) * 1000; // Convert to ms
        if (timeSinceImpact < 150) {
          // Triangle wave: ramp up 0-50ms, decay 50-150ms
          let bloomMultiplier;
          if (timeSinceImpact < 50) {
            // Ramp up to peak
            bloomMultiplier = 1.0 + (timeSinceImpact / 50) * 1.2; // Peak at 2.2x
          } else {
            // Decay to baseline
            bloomMultiplier = 2.2 - ((timeSinceImpact - 50) / 100) * 1.2; // 2.2x → 1.0x
          }
          bloomPass.strength = 0.35 * bloomMultiplier * qualityConfig.bloomStrengthScale;
        } else {
          bloomPass.strength = 0.35 * qualityConfig.bloomStrengthScale; // Baseline
        }
      } else {
        bloomPass.strength = 0.35 * qualityConfig.bloomStrengthScale; // Constant low bloom
      }

      // CRATER_SETTLE: Black hole formation + reality cracks + title
      if (phase.name === 'crater_settle' || phase.name === 'button_reveal' || phase.name === 'complete') {
        // Black hole scale fade-in (only during crater_settle)
        if (phase.name === 'crater_settle') {
          blackHoleGroup.scale.setScalar(phase.phaseT);

          // Glass particles removed per user request
          // (Reality crack shader and glass effects removed entirely)

          // Title reveal at 0.4s mark (40% through phase = 4.9s global)
          if (phase.phaseT >= 0.4 && !showTitle) {
            setShowTitle(true);
            // PHASE 11: Trigger glitch on reveal (respects reduced motion)
            if (!prefersReducedMotion) {
              setTitleGlitch(true);
              // PHASE 11: Cinematic duration 120-180ms (was 300ms)
              const glitchDuration = 120 + Math.random() * 60;
              const timeout = setTimeout(() => setTitleGlitch(false), glitchDuration);
              glitchTimeoutsRef.current.add(timeout);
            }
            // Set timer to allow next glitch soon after
            lastTitleGlitchTime = introElapsed - 1.5;
          }
        } else {
          // Maintain full scale
          blackHoleGroup.scale.setScalar(1.0);
        }

        // Black hole rotation (continuous)
        blackHoleGroup.rotation.y += 0.3 * deltaTime;
        blackHoleGroup.rotation.z += 0.15 * deltaTime;
        innerCore.rotation.y -= 0.8 * deltaTime;
        accretionDisk.rotation.z += 2.0 * deltaTime;

        // Gravitational star pulling with inverse square law physics
        updateStarPulling(deltaTime, introElapsed);

        // Update space-time ripple effects from star impacts
        updateRippleEffects(introElapsed);

        // Button reveal (only during button_reveal phase at 0.2s mark = 5.7s global)
        if (phase.name === 'button_reveal' && phase.phaseT >= 0.2 && !showButton) {
          setShowButton(true);
          // PHASE 11: Trigger glitch on reveal (respects reduced motion)
          if (!prefersReducedMotion) {
            setButtonGlitch(true);
            // PHASE 11: Cinematic duration 120-180ms (was 300ms)
            const glitchDuration = 120 + Math.random() * 60;
            const timeout = setTimeout(() => setButtonGlitch(false), glitchDuration);
            glitchTimeoutsRef.current.add(timeout);
          }
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

      // PHASE 11: Deterministic glitch triggering with cinematic cadence
      if (showTitle && shouldGlitch(introElapsed, lastTitleGlitchTime, 12.34)) {
        lastTitleGlitchTime = introElapsed;
        setTitleGlitch(true);
        // PHASE 11: Randomized duration 120-180ms for organic feel (was 300ms)
        const glitchDuration = 120 + Math.random() * 60;
        const timeout = setTimeout(() => setTitleGlitch(false), glitchDuration);
        glitchTimeoutsRef.current.add(timeout);
      }

      if (showButton && shouldGlitch(introElapsed, lastButtonGlitchTime, 56.78)) {
        lastButtonGlitchTime = introElapsed;
        setButtonGlitch(true);
        // PHASE 11: Randomized duration 120-180ms for organic feel (was 300ms)
        const glitchDuration = 120 + Math.random() * 60;
        const timeout = setTimeout(() => setButtonGlitch(false), glitchDuration);
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
            pulledStars: pulledStars.length,
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

        // PHASE 1: Control post-processing passes
        if (diagnostics.parityMode) {
          // Golden parity mode: ONLY RenderPass (all other passes disabled)
          bloomPass.enabled = false;
          fxaaPass.enabled = false;
          outputPass.enabled = false;
        } else {
          // Normal diagnostic mode: individual pass toggles
          bloomPass.enabled = diagnostics.bloomEnabled;
          fxaaPass.enabled = diagnostics.fxaaEnabled;
          outputPass.enabled = diagnostics.outputPassEnabled;
          // crackPass toggle will be added in Phase 6
        }

        // Render with or without composer
        if (diagnostics.composerEnabled) {
          composer.render();
        } else {
          // Direct renderer path (bypass composer entirely)
          renderer.render(scene, camera);
        }
      } else {
        // Normal render path (no diagnostic overhead)
        composer.render();
      }

      // PHASE 10: Track RAF ID for proper cleanup
      rafId = requestAnimationFrame(animate);
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
      fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);

      // PHASE 2: Update starfield uniforms for pixel-perfect sizing
      starMaterial.uniforms.viewportHeight.value = height;
      starMaterial.uniforms.pixelRatio.value = Math.min(window.devicePixelRatio, qualityConfig.pixelRatioMax);
    }

    window.addEventListener('resize', handleResize);

    // ============================================================================
    // PHASE 10: COMPREHENSIVE CLEANUP (RAF + Resources)
    // ============================================================================

    return () => {
      // PHASE 10: Cancel animation frame to stop render loop
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        console.log('[IntroScreen] Animation loop canceled (RAF cleaned up)');
      }

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
      {debugMode && diagnostics.uiEnabled && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-90 text-white font-mono text-xs p-3 rounded z-50 pointer-events-none">
          <div className="font-bold text-green-400 mb-2">DEBUG MODE (Press D for Controls)</div>
          <div>Phase: {debugState.phase}</div>
          <div className={diagnostics.timeFrozen ? 'text-yellow-400' : ''}>
            Elapsed: {debugState.elapsed.toFixed(2)}s {diagnostics.timeFrozen ? '(FROZEN - F/,/.)' : ''}
          </div>
          <div>FPS: {debugState.fps}</div>
          <div>Pulled Stars: {debugState.pulledStars}</div>
          <div>Active Particles: {debugState.activeParticles}</div>
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="font-bold text-blue-400 mb-1">Pipeline Info:</div>
            <div>Quality: {activeQuality}</div>
            <div>DPR: {Math.min(window.devicePixelRatio, qualityConfig.pixelRatioMax).toFixed(2)}</div>
            <div>Render Size: {diagnostics.renderSize.width}x{diagnostics.renderSize.height}</div>
            <div>RT Type: {diagnostics.renderTargetType}</div>
            <div>Tone Map: {diagnostics.toneMapping}</div>
            <div>Output CS: {diagnostics.outputColorSpace}</div>
            <div>Reduced Motion: {prefersReducedMotion ? 'Yes' : 'No'}</div>
          </div>
          {diagnostics.parityMode && (
            <div className="mt-2 pt-2 border-t border-yellow-600">
              <div className="font-bold text-yellow-400">⚠ PARITY MODE (Press P)</div>
              <div className="text-yellow-300 text-xs">RenderPass only - compare to direct render</div>
            </div>
          )}
        </div>
      )}

      {/* PHASE 1: Diagnostic Controls Panel */}
      {debugMode && diagnostics.showPanel && diagnostics.uiEnabled && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-90 text-white font-mono text-xs p-3 rounded z-50 pointer-events-none max-h-screen overflow-y-auto">
          <div className="font-bold text-cyan-400 mb-2">DIAGNOSTICS</div>
          <div className="text-gray-400 mb-2">Press keys to toggle:</div>

          <div className="mb-2 pb-2 border-b border-gray-700">
            <div className="text-purple-400 font-bold mb-1">Rendering:</div>
            <div className={diagnostics.composerEnabled ? 'text-green-400' : 'text-red-400'}>
              [1] Composer: {diagnostics.composerEnabled ? 'ON' : 'OFF (direct render)'}
            </div>
            <div className={diagnostics.parityMode ? 'text-yellow-400' : 'text-gray-500'}>
              [P] Parity Mode: {diagnostics.parityMode ? 'ON (RenderPass only)' : 'OFF'}
            </div>
          </div>

          <div className="mb-2 pb-2 border-b border-gray-700">
            <div className="text-purple-400 font-bold mb-1">Post-Processing:</div>
            <div className={diagnostics.bloomEnabled ? 'text-green-400' : 'text-red-400'}>
              [2] Bloom: {diagnostics.bloomEnabled ? 'ON' : 'OFF'}
            </div>
            <div className={diagnostics.fxaaEnabled ? 'text-green-400' : 'text-red-400'}>
              [3] FXAA: {diagnostics.fxaaEnabled ? 'ON' : 'OFF'}
            </div>
            <div className={diagnostics.outputPassEnabled ? 'text-green-400' : 'text-red-400'}>
              [8] OutputPass: {diagnostics.outputPassEnabled ? 'ON' : 'OFF'}
            </div>
            <div className={diagnostics.crackPassEnabled ? 'text-gray-500' : 'text-gray-600'}>
              [9] CrackPass: {diagnostics.crackPassEnabled ? 'ON' : 'OFF'} (Phase 6)
            </div>
          </div>

          <div className="mb-2 pb-2 border-b border-gray-700">
            <div className="text-purple-400 font-bold mb-1">Scene Objects:</div>
            <div className={diagnostics.starsEnabled ? 'text-green-400' : 'text-red-400'}>
              [4] Stars: {diagnostics.starsEnabled ? 'ON' : 'OFF'}
            </div>
            <div className={diagnostics.cometEnabled ? 'text-green-400' : 'text-red-400'}>
              [5] Comet: {diagnostics.cometEnabled ? 'ON' : 'OFF'}
            </div>
            <div className={diagnostics.particlesEnabled ? 'text-green-400' : 'text-red-400'}>
              [6] Particles: {diagnostics.particlesEnabled ? 'ON' : 'OFF'}
            </div>
            <div className={diagnostics.blackHoleEnabled ? 'text-green-400' : 'text-red-400'}>
              [7] Black Hole: {diagnostics.blackHoleEnabled ? 'ON' : 'OFF'}
            </div>
            <div className={diagnostics.uiEnabled ? 'text-green-400' : 'text-red-400'}>
              [0] UI: {diagnostics.uiEnabled ? 'ON' : 'OFF'}
            </div>
          </div>

          <div className="mb-2">
            <div className="text-purple-400 font-bold mb-1">Time Control:</div>
            <div className={diagnostics.timeFrozen ? 'text-yellow-400' : 'text-gray-500'}>
              [F] Freeze: {diagnostics.timeFrozen ? 'FROZEN' : 'Running'}
            </div>
            <div className="text-gray-400 text-xs ml-4">
              [,] / [.] Scrub ±0.1s
            </div>
          </div>
        </div>
      )}

      {/* Title Text - PHASE 6: Added semantic heading and aria-live */}
      {(!debugMode || diagnostics.uiEnabled) && (
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
      )}

      {/* PHASE 6: Enhanced button with accessibility and focus states */}
      {(!debugMode || diagnostics.uiEnabled) && (
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
      )}
    </div>
  );
}
