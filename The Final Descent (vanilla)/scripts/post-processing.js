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
    this.starfieldRenderTarget = null; // Render target for starfield with lensing
    this.sceneRenderTarget = null; // Render target for rest of scene
    this.bloomPass = null;
    this.lensingPass = null; // Gravitational lensing pass
    this.fxaaPass = null;
    this.outputPass = null;

    this.init();
  }

  init() {
    // Check HDR support
    const actualHDRSupport = this.checkHDRSupport();

    const renderTargetParams = actualHDRSupport
      ? {
          type: THREE.HalfFloatType,
          colorSpace: THREE.LinearSRGBColorSpace
        }
      : {};

    // Create separate render targets for layered rendering
    this.starfieldRenderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      renderTargetParams
    );

    this.sceneRenderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      renderTargetParams
    );

    // Create composer with HDR render targets if supported
    this.composer = new EffectComposer(
      this.renderer,
      actualHDRSupport
        ? new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, renderTargetParams)
        : undefined
    );

    // Render Pass - will be used for final composite
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.renderPass.clear = false; // Don't clear, we'll handle that manually
    this.composer.addPass(this.renderPass);

    // Bloom Pass - minimal constant bloom
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.35 * this.qualityConfig.bloomStrengthScale, // Minimal: 0.35
      0.3, // radius (tight spread)
      0.7  // threshold (only brightest elements)
    );
    this.composer.addPass(this.bloomPass);

    // Gravitational Lensing Pass - Distorts space around black hole
    const lensingShader = {
      uniforms: {
        tDiffuse: { value: null },
        blackHoleScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
        lensingStrength: { value: 0.0 }, // 0 when not visible
        lensingRadius: { value: 0.15 } // Radius of effect in screen space
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
        uniform vec2 blackHoleScreenPos;
        uniform float lensingStrength;
        uniform float lensingRadius;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;

          // Calculate distance from black hole center in screen space
          vec2 toCenter = uv - blackHoleScreenPos;
          float dist = length(toCenter);

          // Apply gravitational lensing distortion
          if (dist < lensingRadius && lensingStrength > 0.0) {
            // Smooth falloff from center to edge
            float distortionFactor = lensingStrength * smoothstep(lensingRadius, 0.0, dist);

            // Warp UV coordinates - bend light around black hole
            vec2 direction = normalize(toCenter);
            float angle = atan(toCenter.y, toCenter.x);

            // Create swirling distortion (gravitational frame dragging effect)
            float swirl = distortionFactor * 0.3;
            mat2 rotation = mat2(
              cos(swirl), -sin(swirl),
              sin(swirl), cos(swirl)
            );
            vec2 rotated = rotation * toCenter;

            // Radial distortion (light bending)
            float pull = distortionFactor * 0.08;
            vec2 warped = uv + direction * pull + (rotated - toCenter) * 0.5;

            // Chromatic aberration for realistic lensing
            float aberration = distortionFactor * 0.003;
            float r = texture2D(tDiffuse, warped + direction * aberration).r;
            float g = texture2D(tDiffuse, warped).g;
            float b = texture2D(tDiffuse, warped - direction * aberration).b;

            gl_FragColor = vec4(r, g, b, 1.0);
          } else {
            // No distortion
            gl_FragColor = texture2D(tDiffuse, uv);
          }
        }
      `
    };

    this.lensingPass = new ShaderPass(lensingShader);
    this.composer.addPass(this.lensingPass);

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

  updateLensing(blackHoleWorldPos, blackHoleVisible) {
    if (!this.lensingPass) return;

    if (blackHoleVisible && blackHoleWorldPos) {
      // Project black hole world position to screen space
      const vector = blackHoleWorldPos.clone();
      vector.project(this.camera);

      // Convert from NDC (-1 to 1) to screen space (0 to 1)
      const screenX = (vector.x + 1) / 2;
      const screenY = (1 - vector.y) / 2; // Flip Y for screen coordinates

      // Update shader uniforms
      this.lensingPass.uniforms.blackHoleScreenPos.value.set(screenX, screenY);
      this.lensingPass.uniforms.lensingStrength.value = 1.0;
    } else {
      // Black hole not visible - disable lensing
      this.lensingPass.uniforms.lensingStrength.value = 0.0;
    }
  }

  render() {
    // Save current camera layers
    const originalLayers = this.camera.layers.mask;

    // Step 1: Render starfield (layer 1) to separate render target
    this.camera.layers.set(1); // Only render layer 1 (starfield)
    this.renderer.setRenderTarget(this.starfieldRenderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // Step 2: Apply lensing to starfield if enabled
    if (this.lensingPass && this.lensingPass.uniforms.lensingStrength.value > 0.0) {
      // Apply lensing shader to starfield texture
      const lensedTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
      this.lensingPass.uniforms.tDiffuse.value = this.starfieldRenderTarget.texture;
      this.renderer.setRenderTarget(lensedTarget);
      this.lensingPass.render(this.renderer, lensedTarget, this.starfieldRenderTarget);

      // Copy lensed result back to starfield target
      this.renderer.setRenderTarget(this.starfieldRenderTarget);
      this.renderer.render(this.lensingPass.fsQuad.material, lensedTarget);
      lensedTarget.dispose();
    }

    // Step 3: Restore camera layers and render normally with starfield as background
    this.camera.layers.mask = originalLayers;
    this.camera.layers.enable(0); // Render layer 0 (everything except starfield)
    this.camera.layers.disable(1); // Don't render starfield again

    // Render main scene to composer with starfield as background
    this.renderer.setRenderTarget(this.composer.writeBuffer);
    this.renderer.clear();

    // First blit the lensed starfield
    const starfieldMaterial = new THREE.MeshBasicMaterial({
      map: this.starfieldRenderTarget.texture,
      depthTest: false,
      depthWrite: false
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), starfieldMaterial);
    quad.frustumCulled = false;
    const quadScene = new THREE.Scene();
    quadScene.add(quad);
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.renderer.render(quadScene, quadCamera);

    // Then render the rest of the scene on top
    this.renderer.render(this.scene, this.camera);

    // Restore camera layers
    this.camera.layers.mask = originalLayers;

    // Apply remaining post-processing (bloom, FXAA, output)
    this.composer.render();
  }

  handleResize() {
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.starfieldRenderTarget.setSize(window.innerWidth, window.innerHeight);
    this.sceneRenderTarget.setSize(window.innerWidth, window.innerHeight);
    this.fxaaPass.uniforms['resolution'].value.set(
      1 / window.innerWidth,
      1 / window.innerHeight
    );
  }

  destroy() {
    if (this.composer) {
      this.composer.dispose();
    }
    if (this.starfieldRenderTarget) {
      this.starfieldRenderTarget.dispose();
    }
    if (this.sceneRenderTarget) {
      this.sceneRenderTarget.dispose();
    }
  }
}
