import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

export class PostProcessing {
  constructor(renderer, scene, camera, qualityConfig) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.qualityConfig = qualityConfig;

    this.composer = null;
    this.renderPass = null;
    this.bloomPass = null;
    this.fxaaPass = null;
    this.outputPass = null;

    this.init();
  }

  init() {
    // Check HDR support
    const actualHDRSupport = this.checkHDRSupport();

    // Create composer with HDR render targets if supported
    this.composer = new EffectComposer(
      this.renderer,
      actualHDRSupport
        ? new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            type: THREE.HalfFloatType,
            colorSpace: THREE.LinearSRGBColorSpace
          })
        : undefined
    );

    // Render Pass
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Bloom Pass - minimal constant bloom
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.35 * this.qualityConfig.bloomStrengthScale, // Minimal: 0.35
      0.3, // radius (tight spread)
      0.7  // threshold (only brightest elements)
    );
    this.composer.addPass(this.bloomPass);

    // FXAA Anti-Aliasing Pass
    this.fxaaPass = new ShaderPass(FXAAShader);
    this.fxaaPass.uniforms['resolution'].value.set(
      1 / window.innerWidth,
      1 / window.innerHeight
    );
    this.composer.addPass(this.fxaaPass);

    // Output Pass for tone mapping and color space conversion
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    console.log('[PostProcessing] Pipeline initialized');
  }

  checkHDRSupport() {
    const capabilities = this.renderer.capabilities;
    if (!capabilities.isWebGL2) return false;

    const halfFloatExt = this.renderer.extensions.get('EXT_color_buffer_half_float');
    return !!halfFloatExt;
  }

  update(phase, elapsedTime) {
    // Update bloom for impact spike (triangle wave 0-150ms)
    if (phase.name === 'impact') {
      const impactT = elapsedTime - phase.phaseStart;
      if (impactT >= 0 && impactT <= 0.15) {
        // Triangle wave: ramp up then down over 150ms
        const progress = impactT / 0.15;
        const spike = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        const bloomBoost = 1.0 + spike * 2.0; // 1.0 to 3.0 multiplier
        this.bloomPass.strength = 0.35 * this.qualityConfig.bloomStrengthScale * bloomBoost;
      }
    } else {
      // Restore baseline bloom
      this.bloomPass.strength = 0.35 * this.qualityConfig.bloomStrengthScale;
    }
  }

  render() {
    this.composer.render();
  }

  handleResize() {
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.fxaaPass.uniforms['resolution'].value.set(
      1 / window.innerWidth,
      1 / window.innerHeight
    );
  }

  destroy() {
    if (this.composer) {
      this.composer.dispose();
    }
  }
}
