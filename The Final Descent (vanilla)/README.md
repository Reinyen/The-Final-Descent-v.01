# The Final Descent - Vanilla Implementation

A cosmic horror intro sequence built with vanilla HTML, CSS, JavaScript, and Three.js.

## 🌌 Overview

This is a pure vanilla web implementation of "The Final Descent" intro page, featuring:
- **3,000 twinkling stars** with realistic colors
- **Falling comet** with procedural noise and atmospheric heat effects
- **Explosive impact** with 3,000+ particle debris
- **4-layer rotating black hole** with custom shaders
- **Star gravitational pull** physics system
- **Space-time ripple effects**
- **Glitch-effect title and button** reveals
- **6.5-second cinematic animation** sequence

## 🛠️ Technology Stack

- **HTML5**: Semantic markup
- **CSS3**: Custom animations and styling
- **Vanilla JavaScript (ES6+)**: Core logic
- **Three.js 0.181.2**: 3D rendering engine
- **Import Maps**: For ES module imports from CDN

## 📦 File Structure

```
The Final Descent (vanilla)/
├── index.html                  # Main HTML entry point
├── styles/
│   ├── main.css               # Base styles and layout
│   └── animations.css         # Glitch effects and keyframes
├── scripts/
│   ├── main.js                # Application entry point
│   ├── ui-controller.js       # DOM manipulation and UI updates
│   ├── timeline.js            # Phase management system
│   ├── scene-setup.js         # Three.js scene orchestration
│   ├── starfield.js           # 3000-star system with shaders
│   ├── comet.js               # Comet with noise displacement
│   ├── black-hole.js          # 4-layer black hole system
│   ├── particles.js           # Debris particle system
│   ├── physics.js             # Star pulling and ripples
│   └── post-processing.js     # Bloom, FXAA, output pipeline
└── README.md                  # This file
```

## 🚀 Quick Start

### Option 1: Local Development Server (Recommended)

Since the code uses ES6 modules, you'll need to run a local web server. Here are several options:

**Using Python:**
```bash
# Python 3
cd "The Final Descent (vanilla)"
python -m http.server 8000

# Open browser to http://localhost:8000
```

**Using Node.js (http-server):**
```bash
# Install globally
npm install -g http-server

# Run server
cd "The Final Descent (vanilla)"
http-server -p 8000

# Open browser to http://localhost:8000
```

**Using VS Code Live Server:**
1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

### Option 2: Direct File Access

Some browsers (like Firefox) allow direct file:// access with ES6 modules, but this is not guaranteed. Use a local server for best results.

## 🎮 Usage

1. Open `index.html` in a modern browser
2. The intro animation will play automatically (6.5 seconds)
3. After the animation, click "BEGIN THE DESCENT" or press Enter/Space
4. The button click currently shows an alert (placeholder for game transition)

## 🎨 Animation Timeline

The 6.5-second sequence consists of 6 phases:

1. **FADE_IN** (0.0s - 1.0s): Stars fade in
2. **COMET_APPROACH** (1.0s - 4.0s): Comet falls with heat effects
3. **IMPACT** (4.0s - 4.5s): Explosive collision with debris and camera shake
4. **CRATER_SETTLE** (4.5s - 5.5s): Black hole forms, stars pull inward
5. **BUTTON_REVEAL** (5.5s - 6.5s): UI elements glitch in
6. **COMPLETE** (6.5s+): All effects maintain, button interactive

## ⚙️ Configuration

### Quality Settings

The app auto-detects quality based on device capabilities:
- **HIGH**: Full particle count, glass dust, 2.0x max pixel ratio
- **LOW**: 50% particles, no glass dust, 1.5x max pixel ratio

Edit `main.js` to force a quality tier:
```javascript
this.config = {
  quality: 'high', // 'auto' | 'high' | 'low'
  debugMode: false
};
```

### Debug Mode

Enable debug mode in `main.js`:
```javascript
this.config = {
  quality: 'auto',
  debugMode: true // Set to true
};
```

Debug keyboard shortcuts:
- `D`: Toggle debug panel
- `F`: Freeze/unfreeze time
- `,` / `.`: Scrub time backward/forward

## ♿ Accessibility

The implementation respects `prefers-reduced-motion`:
- Disables camera shake during impact
- Disables UI glitch animations
- Maintains fade transitions

Keyboard navigation:
- `Enter` or `Space`: Activate BEGIN button
- Auto-focus on button reveal

## 🎯 Performance

**Target**: 60 FPS on modern hardware, 30 FPS minimum on mid-range

**Optimizations**:
- Scratch vectors (no per-frame allocations)
- Particle culling (alpha < 0.01)
- Quality tier auto-detection
- Proper cleanup on unmount

## 🌐 Browser Support

Requires browsers with:
- WebGL 2.0 support
- ES6 module support
- Import Maps support

**Supported browsers:**
- Chrome 89+
- Firefox 108+
- Safari 16.4+
- Edge 89+

## 📝 Technical Details

### Rendering Pipeline

1. **RenderPass**: Scene render
2. **UnrealBloomPass**: Minimal bloom (0.35 strength)
3. **FXAAShader**: Anti-aliasing
4. **OutputPass**: Tone mapping and color space conversion

### Color Workflow

- Linear color workflow (no double tone-mapping)
- HDR rendering with LDR fallback
- OutputPass applies final gamma correction

### Shader Systems

All major elements use custom GLSL shaders:
- **Stars**: Vertex sizing with depth cueing and twinkle
- **Comet**: Simplex noise displacement with heat effects
- **Black Hole**: 4 layers (event horizon, core, disk, glow)
- **Particles**: Pixel-consistent sizing with fade

## 🐛 Troubleshooting

### WebGL Errors
- Ensure your browser supports WebGL 2.0
- Update GPU drivers
- Try a different browser

### Import Map Not Working
- Use a local web server (not file://)
- Ensure modern browser with Import Maps support

### Performance Issues
- Lower quality setting to 'low'
- Close other GPU-intensive applications
- Reduce window size

### CORS Errors
- Must run from a local web server
- Check browser console for specific errors

## 📄 License

Part of "The Final Descent" project.

## 🎉 Credits

Built with:
- [Three.js](https://threejs.org/) - 3D rendering
- [Google Fonts](https://fonts.google.com/) - Rajdhani font
- Simplex noise algorithm - Ken Perlin

---

**Experience the cosmic horror** 🌌
