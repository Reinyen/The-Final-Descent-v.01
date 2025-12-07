/**
 * Quality Manager for Three.js Layer
 *
 * Manages quality tiers (High/Medium/Low/Auto) and adjusts:
 * - Particle counts
 * - Post-processing strength
 * - Pixel ratio capping
 */

export const QualityPresets = {
  HIGH: {
    particleCount: 1.0,
    postStrength: 1.0,
    maxPixelRatio: 2.0,
    enablePerCardParticles: true,
    enableRerollSilhouettes: true,
    label: 'High'
  },
  MEDIUM: {
    particleCount: 0.6,
    postStrength: 0.7,
    maxPixelRatio: 1.5,
    enablePerCardParticles: true,
    enableRerollSilhouettes: true,
    label: 'Medium'
  },
  LOW: {
    particleCount: 0.3,
    postStrength: 0.5,
    maxPixelRatio: 1.0,
    enablePerCardParticles: false,
    enableRerollSilhouettes: false,
    label: 'Low'
  }
};

/**
 * Detect appropriate quality tier based on device capabilities
 */
export function detectQualityTier() {
  // Check device pixel ratio
  const dpr = window.devicePixelRatio || 1;

  // Check for mobile/low-end device indicators
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Check available memory (if supported)
  const memory = (navigator as any).deviceMemory;

  // Check GPU tier (basic heuristic)
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';

  // Decision logic
  if (isMobile || memory < 4) {
    return 'MEDIUM';
  }

  if (dpr > 2 || memory >= 8) {
    return 'HIGH';
  }

  return 'MEDIUM';
}

/**
 * Apply quality settings to renderer and effects
 */
export function applyQualitySettings(renderer, effects, tier) {
  const preset = QualityPresets[tier] || QualityPresets.MEDIUM;

  // Set pixel ratio cap
  if (renderer) {
    const pixelRatio = Math.min(window.devicePixelRatio, preset.maxPixelRatio);
    renderer.setPixelRatio(pixelRatio);
  }

  // Apply particle count multiplier
  if (effects) {
    if (effects.particles) {
      effects.particles.setCountMultiplier(preset.particleCount);
    }

    // Apply post-processing strength
    if (effects.vignette) {
      effects.vignette.setStrength(preset.postStrength);
    }

    // Enable/disable per-card particles
    if (effects.cardParticles) {
      effects.cardParticles.setEnabled(preset.enablePerCardParticles);
    }
  }

  console.log(`[Quality Manager] Applied ${preset.label} quality settings`);
  return preset;
}

/**
 * Create quality selector UI (for dev/settings)
 */
export function createQualitySelector(store) {
  const selector = document.createElement('select');
  selector.id = 'qualitySelector';
  selector.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.8);
    color: #0f0;
    border: 1px solid #0f0;
    font-family: monospace;
    z-index: 10000;
  `;

  const options = [
    { value: 'auto', label: 'Auto' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' }
  ];

  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    selector.appendChild(option);
  });

  selector.addEventListener('change', (e) => {
    const tier = e.target.value === 'auto' ? detectQualityTier() : e.target.value;
    store.setQualityTier(tier);
  });

  document.body.appendChild(selector);
  return selector;
}
