# The Final Descent - Developer Notes

## 📐 Architecture Overview

### Rendering Pipeline

The intro sequence uses a clean post-processing pipeline:

```
RenderPass → UnrealBloom → FXAA → Output → Screen
```

**Order Rationale:**
- **RenderPass**: Render scene to buffer (HDR when supported)
- **UnrealBloom**: Minimal bloom (0.35 constant strength, no spike)
- **FXAA**: Anti-aliasing for smooth edges
- **Output**: Tone mapping + color space conversion

### HDR Pipeline

The system automatically detects HDR support (HalfFloatType render targets):
- **HDR Mode**: Values can exceed 1.0, allowing proper bloom on highlights
- **LDR Fallback**: Values clamped to [0,1], bloom still works but less headroom

Check render target type in debug HUD: `Render Target: HDR (HalfFloat)` or `LDR`

## 🎮 Diagnostic Mode

Enable debug mode by passing `debugMode={true}` to `<IntroScreen />`:

```tsx
<IntroScreen onBegin={handleIntroComplete} debugMode={true} />
```

### Keyboard Controls

- **D**: Toggle diagnostic controls panel
- **1**: Toggle Composer (on/off compares raw vs composed output)
- **2**: Toggle Bloom pass
- **3**: Toggle FXAA pass
- **4**: Toggle Stars visibility
- **5**: Toggle Comet visibility
- **6**: Toggle Particles visibility
- **7**: Toggle Black Hole visibility

### Debug HUD Information

- **Phase**: Current animation phase (fade_in, comet_approach, impact, crater_settle, button_reveal, complete)
- **Elapsed**: Time since intro start (seconds)
- **FPS**: Current framerate estimate
- **Pulled Stars**: Number of stars being pulled into black hole
- **Active Particles**: Sum of active debris + glass particles
- **Quality**: HIGH or LOW (auto-detected or manual)
- **DPR**: Device Pixel Ratio (capped by quality tier)
- **Render Target**: HDR or LDR pipeline mode
- **Reduced Motion**: User preference for reduced motion

## 🎯 Quality Tiers

Quality is auto-detected based on device capabilities or can be manually set:

```tsx
<IntroScreen quality="high" />  // Force high quality
<IntroScreen quality="low" />   // Force low quality
<IntroScreen quality="auto" />  // Auto-detect (default)
```

### Quality Tier Differences

| Feature | HIGH | LOW |
|---------|------|-----|
| Pixel Ratio | 2.0x max | 1.5x max |
| Bloom Strength | 1.0x | 0.7x |
| Debris Particles | 360 (120 dir × 3) | 180 (60 dir × 3) |
| Glass Particles | Enabled (864 max) | Disabled |

**Auto-Detection Logic:**
- Total pixels < 1920×1080 OR pixelRatio < 1.5 → LOW
- Otherwise → HIGH

## 🌟 Animation Timeline

Total duration: **6.5 seconds** + idle loop

### Phase Breakdown

1. **FADE_IN** (0.0s - 1.0s)
   - Starfield fades in from 0% to 100% opacity
   - Stars rendered with GPU-based shader for crisp points

2. **COMET_APPROACH** (1.0s - 4.0s)
   - Comet falls from (0, 40, -30) to (0, -8, 20)
   - Quadratic ease-in for acceleration
   - Heat builds up via cubic ease (0 → 0.85)
   - Approach angle: ~46° from vertical

3. **IMPACT** (4.0s - 4.5s)
   - **0-120ms**: Comet bursts (scale 1.0 → 6.0)
   - **0-40ms**: Bloom spike (strength 1.5 → 2.5)
   - **40-200ms**: Bloom decay (2.5 → 1.5)
   - Camera shake: exponential decay over 500ms
   - Debris emission: 360 particles at HIGH quality

4. **CRATER_SETTLE** (4.5s - 5.5s)
   - Black hole scales from 0% to 100%
   - Glass dust emits for first 600ms (864 particles max at 60fps)
   - Title appears at 4.9s (40% through phase)
   - Stars begin staggered gravitational pull (1-4 stars starting at 7.5s-11.5s)

5. **BUTTON_REVEAL** (5.5s - 6.5s)
   - Button appears at 5.7s (20% through phase)
   - Both title and button glitch periodically

6. **COMPLETE** (6.5s+)
   - All effects maintain
   - Black hole rotates continuously
   - Stars continue pulling
   - Glitch effects continue on UI
   - User can click "BEGIN THE DESCENT"

## 🔬 Technical Details

### Bloom Configuration

**Problem Solved:** Original bloom peak of 6.0 caused complete whiteout. Even after multiple reductions (2.5, then 1.2), screen still went 80% white during impact.

**Fundamental Solution:**
The explosion flash comes from the **COMET ITSELF** (physical scale growth), **NOT from bloom**.
Bloom is ONLY for subtle glow on black hole accretion disk and bright elements.

**Final Settings:**
- **Constant bloom**: 0.35 (ultra-low, never varies)
- **NO bloom spike** during impact (stays 0.35 throughout)
- **Threshold**: 0.7 (only brightest elements bloom)
- **Radius**: 0.3 (minimal spread)

**How Impact Works Now:**
- Comet scales from 1.0 → 3.5x (creates visual "flash")
- Comet glow intensity minimal (0.6 + 0.2 = 0.8 max)
- Bloom stays constant at 0.35 (cannot cause whiteout)
- After 120ms: comet hidden, debris visible, black hole appears

**Result:** Explosion is impactful without ANY whiteout. Sky stays visible. Black hole appears clearly at 4.5s.

### Starfield Shader

Stars use custom ShaderMaterial (not PointsMaterial) for:
- **Pixel-perfect sizing**: DPR-aware calculation prevents blobs
- **GPU twinkle**: Smooth animation via `sin(time * 2.0 + seed)`, reduced frequency from 2.5 to 2.0
- **Depth cueing**: Distant stars 30% dimmer
- **Absorption**: Per-star scale for black hole pull

### Camera Shake

Deterministic shake using sinusoidal combination:
- **Frequencies**: 17.3, 23.7, 31.1 Hz (incommensurate for natural feel)
- **Amplitude**: Exponential decay with k=10
- **Duration**: 500ms
- **Framerate independent**: Pure function of time, no accumulation

### Particle Systems

**Debris Particles:**
- Capacity: 3000 particles
- Emission: 360 at HIGH (120 directions × 3 particles)
- Physics: dt-based velocity damping (exp(-1.22 * dt))
- Lifetime: 600ms

**Glass Dust Particles:**
- Capacity: 1000 particles
- Emission: 24 directions, 1 particle per direction per frame
- Window: 600ms (first 60% of crater_settle phase)
- At 60fps: ~864 particles (safely within capacity)
- Physics: dt-based gravity and drag

### Star Pulling Physics

**Selection System:**
- **Count**: Randomly selects 1-4 stars from those within 30 units of black hole
- **Staggered timing**: Each star starts being pulled at a random time 3-7 seconds after black hole forms (7.5s-11.5s absolute)
- **Initial state**: All stars start at rest (zero velocity)

**Gravitational Physics:**
- **Force**: Inverse square law: `F = G * M / r²` where `G * M = 50.0`
- **Integration**: Velocity-Verlet physics with dt-based updates
  - `velocity += (direction * acceleration) * dt`
  - `position += velocity * dt`
- **Framerate independent**: Works correctly at any FPS (30, 60, 144)

**Impact Detection:**
- **Threshold**: Star has impacted when distance < 2.0 units from black hole center
- **On impact**: Create space-time ripple effect and begin absorption

**Space-Time Ripples:**
- **Trigger**: Created when star impacts black hole
- **Duration**: Random 0.3-0.8 seconds per ripple
- **Radius**: Expands from 0 to 15-25 units
- **Visual effects**:
  - Radial wave that expands outward
  - Warm golden glow on nearby stars (adds orange/yellow tint)
  - Ring thickness: 15% of max radius
  - Intensity fades over time: `1.0 - progress`
- **Multiple ripples**: Can overlap and co-exist

**Absorption Effect:**
- **Method**: Exponential via GPU attribute (k=3.0)
- **Duration**: Gradual fade using `exp(-3.0 * dt)`
- **Removal**: Stars with absorptionScale < 0.05 moved far offscreen (10000, 10000, -10000)

### Black Hole Rendering

4-layer mesh system:
1. **Event Horizon** (core): Solid black, writes depth
2. **Inner Core**: Additive volumetric spirals, no depth write
3. **Accretion Disk**: Additive ring, no depth write
4. **Outer Glow**: Additive atmosphere, no depth write

**Depth Write Strategy:**
- Core writes depth for proper occlusion
- All additive layers respect depth but don't write it
- Prevents z-fighting and sorting issues

### Shader Prewarm

Comet shader is "prewarmed" before animation starts:
- Render once offscreen with non-zero uniforms
- Forces shader compilation
- Prevents first-frame hitch when effects appear

## ♿ Accessibility

### Keyboard Support

- **Enter** or **Space**: Activate "BEGIN THE DESCENT" button
- Button auto-focuses when it appears
- Title has `aria-live="polite"` for screen readers
- Button has descriptive `aria-label`

### Reduced Motion

System respects `prefers-reduced-motion: reduce`:
- Camera shake greatly reduced
- Glitch effects less intense

## 🧹 Memory Management

### Cleanup on Unmount

Full disposal of all Three.js resources:
- ✅ All geometries
- ✅ All materials
- ✅ All textures
- ✅ Composer and renderer
- ✅ All event listeners
- ✅ All timeouts (glitch effects)
- ✅ DOM elements

### StrictMode Safety

- Double-init protection via `initializedRef`
- Cleanup function properly closes all resources
- No RAF leaks (animation loop stopped on unmount)

## 🚀 Performance Characteristics

### Target Performance

- **High-end**: 60 FPS at 2560×1440 @ 2.0 DPR
- **Mid-range**: 60 FPS at 1920×1080 @ 1.5 DPR
- **Low-end**: 30+ FPS at 1920×1080 @ 1.0 DPR

### Optimization Strategies

1. **GPU-based effects**: Stars twinkle via shader, not CPU
2. **Selective updates**: Only update particle buffers when active
3. **Delta-time clamping**: Max step of 1/30s prevents spiral on lag
4. **Quality tiers**: Auto-reduce workload on weak devices
5. **Shader prewarm**: Prevent compilation hitches

### Idle State Memory

In COMPLETE phase (6.5s+), memory should be stable:
- No new particle allocation
- Only continuous updates: black hole rotation, star pulling
- Glitch timeouts: properly managed and cleaned

## 🐛 Known Limitations

1. **Mobile Performance**: Glass particles disabled at LOW quality (too many for mobile GPUs)
2. **Bloom Selectivity**: Uses threshold-based bloom, not layer-based (simpler but less control)
3. **Star Count**: Fixed at 3000 (not configurable per quality tier)
4. **Star Pull Count**: Random 1-4 stars (not configurable)

## 🔧 Troubleshooting

### "Bloom washes out everything"
- Check bloom threshold in diagnostic mode (should be 0.85)
- Verify base strength is 1.5, not 2.0+
- Ensure OutputPass is present (proper tone mapping)

### "Stars look like blobs"
- Verify ShaderMaterial is being used (not PointsMaterial)
- Check DPR in debug HUD (high DPR can cause oversized points)
- Ensure `gl_PointSize` calculation includes pixelRatio

### "Performance is poor"
- Check quality tier (auto-detect may not work on some devices)
- Force LOW quality: `<IntroScreen quality="low" />`
- Verify glass particles are disabled at LOW
- Check particle counts in debug HUD

### "First frame stutters"
- Ensure `prewarmShaders()` is called before animation starts
- Check browser console for shader compilation warnings
- WebGL extensions may not be available (fallback to simpler shaders)

## 📝 Code Organization

### File Structure

- `IntroScreen.tsx`: Single-file component (~2000 lines)
  - Scene setup (lines 175-200)
  - Post-processing pipeline (lines 325-531)
  - Starfield system (lines 533-690)
  - Comet + shaders (lines 710-915)
  - Black hole (lines 935-1125)
  - Particle systems (lines 1127-1220)
  - Physics functions (lines 1242-1580)
  - Animation loop (lines 1600-1885)
  - Cleanup (lines 1914-1960)

### Design Philosophy

**Deterministic timeline**: All animations are pure functions of `introElapsed`. No state machines, no flags. This makes debugging trivial (jump to any time) and ensures consistency across framerates.

**Minimal CPU updates**: Stars twinkle via shader uniforms. Particles only update buffers when active. Black hole rotations via dt-based accumulation.

**Quality over quantity**: Better to have fewer high-quality effects than many low-quality ones. Each effect is tuned to look professional.

## 🎨 Visual Tuning Guide

### Want MORE intense impact flash?
Increase comet explosion scale (line ~1705):
```typescript
const explosionScale = 1.0 + (4.5 - 1.0) * easeOut; // Was 3.5x
```

**Note:** Flash comes from comet scale, NOT from bloom. Bloom stays constant at 0.35 to prevent whiteout.

### Want LONGER camera shake?
Increase duration check (line ~282):
```typescript
if (timeSinceImpact < 0 || timeSinceImpact > 0.8) { // Was 0.5
```

### Want MORE stars pulled into black hole?
Change the selection count (line ~1439 in selectStarsToPull):
```typescript
const numStarsToPull = Math.floor(Math.random() * 6) + 1; // Was 1-4, now 1-6
```

### Want EARLIER star impacts?
Reduce the pull start time range (line ~1450 in selectStarsToPull):
```typescript
const pullStartTime = 5.0 + Math.random() * 2.0; // Was 7.5-11.5s, now 5.0-7.0s
```

### Want FASTER heat buildup on comet?
Adjust heat intensity calculation (line ~1622):
```typescript
const heatIntensity = cubicEase * 0.95; // Was 0.85
```

---

**Built with cosmic dread and professional graphics engineering** 🌌
