import * as THREE from 'three';

export class BlackHole {
  constructor() {
    this.blackHoleGroup = null;
    this.innerCoreMaterial = null;
    this.accretionDiskMaterial = null;
    this.outerGlowMaterial = null;
    this.eventHorizonMaterial = null;
    this.eventHorizonMesh = null;

    // CubeCamera for reflections
    this.cubeCamera = null;
    this.cubeRenderTarget = null;

    // Position at Z=-70 (inside star volume for depth coherence)
    this.position = new THREE.Vector3(0, -8, -70);

    this.init();
  }

  init() {
    this.blackHoleGroup = new THREE.Group();
    this.blackHoleGroup.position.copy(this.position);
    this.blackHoleGroup.scale.set(0, 0, 0);
    this.blackHoleGroup.visible = false;

    // Create CubeCamera for real-time reflections with high resolution for glass-like clarity
    this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter
    });
    this.cubeCamera = new THREE.CubeCamera(0.1, 1000, this.cubeRenderTarget);
    this.cubeCamera.position.copy(this.position);

    // Layer 1: Event Horizon (reflective dark mirror sphere) - LARGEST solid sphere
    const eventHorizonGeometry = new THREE.SphereGeometry(10.5, 64, 64); // Higher segments for smooth reflections
    this.eventHorizonMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,     // Dark gray base to show reflections clearly
      metalness: 1.0,      // Fully metallic for perfect mirror reflections
      roughness: 0.0,      // Perfectly smooth glass surface
      envMap: this.cubeRenderTarget.texture, // Dynamic reflection map
      envMapIntensity: 3.5, // Very strong reflections for visible mirror effect
      side: THREE.FrontSide,
      transparent: false,   // Completely opaque - no transparency
      opacity: 1.0,
      depthWrite: true,     // Write to depth buffer to occlude objects behind
      depthTest: true
    });
    this.eventHorizonMesh = new THREE.Mesh(eventHorizonGeometry, this.eventHorizonMaterial);
    this.eventHorizonMesh.renderOrder = -1; // Render first to ensure it occludes properly
    this.blackHoleGroup.add(this.eventHorizonMesh);

    // Layer 2: Inner Core (volumetric with spiral patterns) - INSIDE event horizon
    const innerCoreGeometry = new THREE.SphereGeometry(9.5, 32, 32);
    this.innerCoreMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      uniforms: {
        time: { value: 0.0 },
        cameraPosition: { value: new THREE.Vector3() }
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
          // Polar coordinates
          float radius = length(vPosition.xy) / 9.5;
          float angle = atan(vPosition.y, vPosition.x);

          // 3 counter-rotating spiral layers
          float layer1 = sin(angle * 5.0 + radius * 2.0 - time * 3.0);
          float layer2 = sin(angle * 7.0 - radius * 3.0 + time * 2.0);
          float layer3 = sin(angle * 11.0 + radius * 1.5 - time * 4.0);

          float pattern = (layer1 + layer2 + layer3) / 3.0 * 0.5 + 0.5;

          // Fresnel
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
    const innerCore = new THREE.Mesh(innerCoreGeometry, this.innerCoreMaterial);
    this.blackHoleGroup.add(innerCore);

    // Layer 3: Accretion Disk - 3x larger
    const accretionDiskGeometry = new THREE.RingGeometry(9, 30, 64);
    this.accretionDiskMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
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
          float dist = length(vPosition.xy) / 30.0;
          float angle = atan(vPosition.y, vPosition.x);

          // 3 spiral arms
          float spiral1 = sin(angle * 3.0 - dist * 2.0 + time * 2.0);
          float spiral2 = sin(angle * 5.0 + dist * 1.5 - time * 1.5);
          float spiral3 = sin(angle * 7.0 - dist * 3.0 + time * 2.5);

          float pattern = (spiral1 + spiral2 + spiral3) / 3.0 * 0.5 + 0.5;

          // Radial fade
          float radialFade = smoothstep(1.0, 0.3, dist) * smoothstep(0.15, 0.4, dist);

          // Color gradient
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
    const accretionDisk = new THREE.Mesh(accretionDiskGeometry, this.accretionDiskMaterial);
    accretionDisk.rotation.x = -Math.PI / 2.5; // Tilted
    this.blackHoleGroup.add(accretionDisk);

    // Layer 4: Outer Glow (atmosphere) - 3x larger
    const outerGlowGeometry = new THREE.SphereGeometry(15, 32, 32);
    this.outerGlowMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      uniforms: {
        time: { value: 0.0 },
        cameraPosition: { value: new THREE.Vector3() }
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
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          // Fresnel
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
    const outerGlow = new THREE.Mesh(outerGlowGeometry, this.outerGlowMaterial);
    this.blackHoleGroup.add(outerGlow);

    console.log('[BlackHole] Created 4-layer system at', this.position);
  }

  update(phase, elapsedTime, camera) {
    // Update time uniforms
    this.innerCoreMaterial.uniforms.time.value = elapsedTime;
    this.accretionDiskMaterial.uniforms.time.value = elapsedTime;
    this.outerGlowMaterial.uniforms.time.value = elapsedTime;

    // Update camera position for Fresnel calculations
    this.innerCoreMaterial.uniforms.cameraPosition.value.copy(camera.position);
    this.outerGlowMaterial.uniforms.cameraPosition.value.copy(camera.position);

    // Black hole reveals during crater_settle
    if (phase.name === 'crater_settle' || phase.name === 'button_reveal' || phase.name === 'complete') {
      this.blackHoleGroup.visible = true;

      // Scale in during crater_settle
      if (phase.name === 'crater_settle') {
        const scaleT = Math.min(1.0, phase.phaseT * 2.0); // Scale in over first 50%
        const easeT = scaleT * scaleT * (3.0 - 2.0 * scaleT); // Smoothstep
        this.blackHoleGroup.scale.setScalar(easeT);
      } else {
        this.blackHoleGroup.scale.setScalar(1.0);
      }

      // Slow rotation
      this.blackHoleGroup.rotation.z = elapsedTime * 0.1;
    } else {
      this.blackHoleGroup.visible = false;
    }
  }

  // Update reflection map - call this before rendering
  updateReflections(renderer, scene) {
    if (!this.cubeCamera || !this.eventHorizonMesh) return;

    // Hide the event horizon temporarily to avoid self-reflection
    this.eventHorizonMesh.visible = false;

    // Update the cube camera to capture the environment
    this.cubeCamera.update(renderer, scene);

    // Show the event horizon again
    this.eventHorizonMesh.visible = true;
  }

  getGroup() {
    return this.blackHoleGroup;
  }

  getPosition() {
    return this.position;
  }

  destroy() {
    if (this.eventHorizonMaterial) {
      this.eventHorizonMaterial.dispose();
    }
    if (this.innerCoreMaterial) {
      this.innerCoreMaterial.dispose();
    }
    if (this.accretionDiskMaterial) {
      this.accretionDiskMaterial.dispose();
    }
    if (this.outerGlowMaterial) {
      this.outerGlowMaterial.dispose();
    }
    if (this.cubeRenderTarget) {
      this.cubeRenderTarget.dispose();
    }
  }
}
