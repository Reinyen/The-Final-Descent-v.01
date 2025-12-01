# IntroScreen Baseline Documentation
**Date**: 2025-12-01
**Component**: `src/IntroScreen.tsx`
**Three.js Version**: 0.181.2

## Current Visual Defects (Audit)

### 1. **HDR/LDR Target Selection Issues**
- **Location**: Lines 313-322
- **Issue**: HDR detection only checks `isWebGL2`, not actual `EXT_color_buffer_half_float` extension availability
- **Risk**: Creates `HalfFloatType` render targets without checking if they're actually renderable
- **Impact**: Can cause incomplete framebuffer or precision issues on devices without half-float support

### 2. **Color Pipeline Inconsistency**
- **Location**: Lines 191-200, 336-370
- **Current Setup**:
  - Renderer: `outputColorSpace = THREE.SRGBColorSpace`
  - Composer RT: `colorSpace = THREE.LinearSRGBColorSpace` (if HDR)
  - OutputPass present
- **Risk**: Potential double tone-mapping or color space conversion
- **Status**: Needs verification that OutputPass is only transform applied

### 3. **Starfield Quality Issues**
- **Location**: Lines 376-530
- **Current Sizing**:
  ```glsl
  float finalSize = baseSize * twinkle * absorptionScale;
  float perspectiveFactor = 1.0 / -mvPosition.z;
  float pixelSize = finalSize * perspectiveFactor * viewportHeight * 0.5;
  gl_PointSize = pixelSize * pixelRatio;
  ```
  - Base size: 0.5 - 2.0
  - With perspective: 7-27px at typical depths
  - **Issue**: Stars read as large blobs, not crisp pinpoints
- **Alpha Issue**: Line 497 - twinkle can push alpha > 1.0 (range 0.625-1.125)
- **Twinkle Formula**: `sin(time * 2.0 + seed * 0.5) * 0.25 + 0.875`
  - Range: [0.625, 1.125] - exceeds [0,1]

### 4. **Depth Coherence Failure (Critical)**
- **Star Volume**: Z ∈ [-130, -30] (line 413)
- **Black Hole Position**: (0, -8, 10) (line 938)
- **Camera Position**: (0, 0, 30) (line 188)
- **Selection Radius**: 60 units (line 1546)
- **Problem**:
  - Minimum Z distance: 10 - (-30) = 40 units
  - Maximum Z distance: 10 - (-130) = 140 units
  - Black hole is 40-140 units in FRONT of all stars
  - Selection radius of 60 captures few/no stars
- **Impact**: Star pull effect fails or is barely visible

### 5. **Missing Crack Pass**
- **Location**: Lines 327-335 (commented blueprint)
- **Status**: Reality crack pass mentioned but NOT implemented
- **Expected**: Custom ShaderPass with Voronoi cracks after RenderPass
- **Current Pipeline**: RenderPass → Bloom → FXAA → Output (no crack pass)

### 6. **Hot-Loop Allocations (Performance)**
- **Location**: Lines 586-630 (updateRippleEffects)
  - Line 588-591: Creates new Vector3 per star per frame
  - Line 1481-1482: `clone().multiplyScalar()` creates temporaries
  - Line 1495: `starPos.clone()` allocation
- **Impact**: Potential GC pressure and frame hitching during ripple effects

### 7. **RAF Not Canceled on Cleanup**
- **Location**: Line 1874 (requestAnimationFrame), 1907-1949 (cleanup)
- **Issue**: RAF id not tracked or canceled in cleanup
- **Impact**: Animation continues after unmount, potential memory leak

### 8. **UI Glitch Cadence Too Frequent**
- **Location**: Lines 300-305 (shouldGlitch)
- **Current**: Interval 0.8-2.3s, duration 300ms (line 131)
- **Issue**: Triggers too frequently, feels noisy rather than premium
- **Expected**: 3-7s intervals, 120-180ms duration for cinematic feel

### 9. **Impact Visual Weakness**
- **Location**: Lines 348-356 (bloom config)
- **Current**: Constant bloom 0.35, no spike during impact
- **Issue**: Impact flash depends only on comet scaling, lacks controlled highlight burst
- **Expected**: Brief controlled bloom spike at impact moment (0-100ms window)

### 10. **Debris Sizing Uncalibrated**
- **Location**: Lines 1299-1400 (debris system)
- **Issue**: Point sizing formula exists but not validated for pixel consistency
- **Risk**: Debris may appear chunky or inconsistent across resolutions

## Current Postprocessing Pipeline

**Order**: RenderPass → UnrealBloomPass → FXAAShader → OutputPass

### Pass Configuration:
1. **RenderPass** (line 344)
   - Renders scene to buffer

2. **UnrealBloomPass** (lines 350-356)
   - Strength: 0.35 * qualityScale (constant, no impact spike)
   - Radius: 0.3 (tight spread)
   - Threshold: 0.7 (only brightest elements)

3. **FXAAShader** (lines 360-365)
   - Applied before output for edge smoothing
   - Resolution uniforms: 1/width, 1/height

4. **OutputPass** (line 369-370)
   - Tone mapping and color space conversion
   - Final stage

### Render Target:
- **HDR Path**: HalfFloatType + LinearSRGBColorSpace (if WebGL2)
- **LDR Path**: Default (UnsignedByteType)
- **Issue**: No extension check, only WebGL2 check

## Starfield Technical Details

### Current Sizing Formula (Vertex Shader):
```glsl
// Base size (CPU): 0.5 - 2.0 (median ~1.25)
// Twinkle modulation: 0.625 - 1.125 (BAD: exceeds 1.0)
float finalSize = baseSize * twinkle * absorptionScale;

// Perspective projection to pixels
float perspectiveFactor = 1.0 / -mvPosition.z;
float pixelSize = finalSize * perspectiveFactor * viewportHeight * 0.5;

// Final point size (clamped by driver, typically 64px or 1024px max)
gl_PointSize = pixelSize * pixelRatio;
```

### Expected Pixel Sizes:
- At Z=-80 (median depth), viewport 1080px, DPR=2, baseSize=1.25:
  - finalSize ≈ 1.25 * 0.875 = 1.09
  - perspectiveFactor = 1/80 = 0.0125
  - pixelSize = 1.09 * 0.0125 * 1080 * 0.5 = 7.36px
  - gl_PointSize = 7.36 * 2 = **14.7px** (too large, reads as blob)

### Star Texture:
- **Resolution**: 64x64 canvas
- **Gradient**: Radial, white center → transparent edge
- **Quality**: Good, but sizing makes it irrelevant

### Depth Range:
- **Stars**: Z ∈ [-130, -30]
- **Comet Start/End**: Z varies (approaches impact point)
- **Black Hole**: Z = 10 (in front of camera!)
- **Camera**: Z = 30

## Known Working Systems

### ✅ Phase Timeline System (lines 218-270)
- Deterministic phase mapper
- Pure function of elapsed time
- Phases: fade_in (0-1s), comet_approach (1-4s), impact (4-4.5s), crater_settle (4.5-5.5s), button_reveal (5.5-6.5s), complete (6.5s+)

### ✅ Deterministic Camera Shake (lines 277-295)
- Non-accumulating sinusoidal shake
- Exponential decay (k=10)
- FPS-independent
- Active only during impact (0-0.5s)

### ✅ Quality System (lines 21-59)
- HIGH/LOW configs with auto-detect
- Particle scaling, bloom scaling, DPR clamping
- Glass particles quality-gated

### ✅ StrictMode Safety (lines 172-176)
- Initialization guard to prevent double-init
- Flag reset in cleanup

### ✅ Diagnostic System (Partial) (lines 96-166)
- Keyboard toggles for passes/systems (keys 1-7)
- Debug HUD with phase/FPS/stats
- Diagnostic panel toggle (D key)

## Animation Phases & Timings

| Phase          | Start | End  | Duration | Key Events                          |
|----------------|-------|------|----------|-------------------------------------|
| fade_in        | 0.0s  | 1.0s | 1.0s     | Stars fade in                       |
| comet_approach | 1.0s  | 4.0s | 3.0s     | Comet visible, approaches           |
| impact         | 4.0s  | 4.5s | 0.5s     | Debris emit, camera shake           |
| crater_settle  | 4.5s  | 5.5s | 1.0s     | Black hole visible, stars pull      |
| button_reveal  | 5.5s  | 6.5s | 1.0s     | Title/button fade in                |
| complete       | 6.5s+ | ∞    | ∞        | Idle state, interactive             |

## Geometry Counts

- **Stars**: 3000 points
- **Comet**: IcosahedronGeometry (1.2 radius, 3 detail)
- **Comet Glow**: IcosahedronGeometry (1.8 radius, 2 detail)
- **Black Hole Components** (4 meshes):
  - Event Horizon: SphereGeometry (2 radius, 32x32)
  - Inner Core: SphereGeometry (3.5 radius, 32x32)
  - Accretion Disk: RingGeometry (3-10 radius, 64 segments)
  - Outer Glow: SphereGeometry (8 radius, 32x32)
- **Debris**: 360 points (HIGH) / 180 (LOW)
- **Glass Dust**: 180 points (HIGH only)

## Shader Inventory

1. **Star Shader** (lines 472-530)
   - Vertex: Custom sizing + twinkle + depth cueing
   - Fragment: Texture sample, alpha modulation

2. **Comet Shader** (lines 780-880)
   - Vertex: Simplex noise displacement + heat turbulence
   - Fragment: Multi-scale noise texture, heat color shift

3. **Comet Glow Shader** (lines 890-930)
   - Vertex: Pass through
   - Fragment: Heat-reactive Fresnel glow

4. **Black Hole Inner Core** (lines 956-1020)
   - Vertex: Pass through + view position calc
   - Fragment: Polar coords, animated spiral patterns, Fresnel

5. **Accretion Disk** (lines 1025-1090)
   - Vertex: Pass through
   - Fragment: Ring gradient, rotational smear

6. **Black Hole Outer Glow** (lines 1095-1140)
   - Vertex: Pass through
   - Fragment: Fresnel glow

7. **Debris Shader** (lines 1212-1260)
   - Vertex: Custom sizing
   - Fragment: Solid color

8. **Glass Shader** (lines 1410-1460)
   - Vertex: Custom sizing
   - Fragment: Shimmer effect

## Configuration Constants

- **Star Count**: 3000
- **Impact Point**: (0, -8, 10)
- **Black Hole Position**: (0, -8, 10)
- **Camera Position**: (0, 0, 30)
- **Camera FOV**: 75°
- **Bloom Strength**: 0.35 (constant)
- **Star Pull Radius**: 60 units
- **Initial Stars Pulled**: 12
- **Batch Pull Interval**: 2-5s
- **Glitch Interval**: 0.8-2.3s (current, too frequent)
- **Glitch Duration**: 300ms (current, too long)

## File Structure

- **IntroScreen.tsx**: 1950+ lines, monolithic
- **index.css**: CSS animations for UI glitch effects
- **No external shader files**: All GLSL inline

## Tools & Diagnostics Available

### Debug Keys (debugMode=true):
- `D`: Toggle diagnostic panel
- `1`: Toggle composer
- `2`: Toggle bloom
- `3`: Toggle FXAA
- `4`: Toggle stars
- `5`: Toggle comet
- `6`: Toggle particles
- `7`: Toggle black hole

### Debug HUD Shows:
- Phase name
- Elapsed time
- FPS
- Pulled stars count
- Active particles count
- Quality tier
- Device pixel ratio
- Render target type
- Reduced motion preference

## Next Steps

This baseline establishes the current state. Subsequent phases will address each defect systematically, starting with diagnostic enhancements (Phase 1) and progressing through color pipeline fixes, starfield rebuild, depth coherence, crack pass restoration, and performance optimizations.
