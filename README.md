# The Final Descent

A cosmic horror browser-based game with an immersive intro sequence featuring Three.js 3D graphics and reality-breaking visual effects.

## 🌌 Overview

**The Final Descent** features a spectacular 6.5-second intro animation showcasing:
- 3,000 twinkling stars with realistic colors
- A falling comet with procedural noise textures and atmospheric heat effects
- Explosive impact with 240+ particle debris
- Reality-shattering Voronoi glass crack effects with chromatic aberration
- A fully 3D rotating black hole with layered meshes and custom shaders
- Star-pulling physics system
- Glitch-effect title and button reveals

## 🛠️ Technical Stack

- **Framework**: React 19
- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite
- **3D Engine**: Three.js 0.181.2
- **Styling**: Tailwind CSS v4
- **Font**: Rajdhani (Google Fonts)

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm

### Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd The-Final-Descent-v.01
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build**:
   ```bash
   npm run preview
   ```

## 🎮 Usage

The intro screen will automatically play when you load the application. After 6.5 seconds, the "BEGIN THE DESCENT" button will appear. Click it to proceed to the main game (coming soon).

## 🎨 Features

### Animation Timeline

The intro sequence consists of 6 distinct phases:

1. **FADE_IN** (0.0s - 1.0s): Starfield fades in
2. **COMET_APPROACH** (1.0s - 4.0s): Comet falls from top with atmospheric heating
3. **IMPACT** (4.0s - 4.5s): Explosive collision with particle burst and camera shake
4. **CRATER_SETTLE** (4.5s - 5.5s): Black hole forms, reality cracks, title appears
5. **BUTTON_REVEAL** (5.5s - 6.5s): Button glitches in
6. **COMPLETE** (6.5s+): All effects maintain until user interaction

### Custom Shaders

- **Comet Surface Shader**: Procedural rocky texture with multi-octave noise and heat effects
- **Reality Crack Shader**: Voronoi-based glass shatter with per-shard distortion and chromatic aberration
- **Black Hole Inner Core**: 3 counter-rotating spiral layers with fresnel fading
- **Accretion Disk**: Rotating spiral arms with radial gradient
- **Outer Glow**: Pulsing atmospheric effect

### Particle Systems

- **Explosion Debris**: 240 particles in 360° radial burst with velocity damping
- **Glass Dust**: 1,000+ sparkly particles emitting from crack lines with gravity

### Physics

- **Star Pulling**: ~8% of nearby stars are gravitationally pulled into the black hole
- **Camera Shake**: Exponential decay during impact phase
- **Bloom Effects**: Dynamic intensity spike during explosion

## 📁 Project Structure

```
The-Final-Descent-v.01/
├── src/
│   ├── IntroScreen.tsx    # Main intro component with all Three.js logic
│   ├── App.tsx            # Application entry point
│   ├── index.css          # Global styles with glitch animations
│   └── main.tsx           # React mounting
├── public/                # Static assets
├── dist/                  # Production build output
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS configuration
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
└── package.json           # Dependencies and scripts
```

## 🔧 Configuration

### TypeScript

The project uses TypeScript in strict mode with the following key settings:
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`

### Tailwind CSS

Custom font family configuration:
```javascript
fontFamily: {
  'rajdhani': ['Rajdhani', 'Arial', 'sans-serif']
}
```

### Three.js Post-Processing

The rendering pipeline includes:
1. **RenderPass**: Standard scene render
2. **UnrealBloomPass**: Glow effects (strength: 2.0-6.0)
3. **ShaderPass**: Custom reality crack effect

## 🎯 Performance

- **Target**: 60 FPS on modern hardware
- **Minimum**: 30 FPS on mid-range hardware
- **Optimizations**:
  - Particle culling (alpha < 0.01)
  - Frustum culling (Three.js default)
  - Geometry reuse across particle systems
  - Max device pixel ratio capped at 2x
  - Proper memory cleanup on unmount

## 🐛 Troubleshooting

### WebGL Issues
If you encounter WebGL errors, ensure your browser supports WebGL 2.0:
- Chrome 56+
- Firefox 51+
- Safari 15+
- Edge 79+

### Performance Issues
- Close other GPU-intensive applications
- Try a different browser
- Reduce window size
- Check GPU drivers are up to date

### Build Errors
If you encounter build errors:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run build
```

## 📝 Dependencies

### Core Dependencies
- `react: ^19.0.0`
- `react-dom: ^19.0.0`
- `three: ^0.181.2`

### Dev Dependencies
- `@types/three: latest`
- `@types/react: latest`
- `@types/react-dom: latest`
- `typescript: ^5.8.0`
- `vite: ^7.2.6`
- `tailwindcss: latest`
- `@tailwindcss/postcss: latest`
- `autoprefixer: latest`

## 🚀 Future Enhancements

- Game UI implementation
- Audio system with cosmic horror soundscape
- Level progression system
- Save/load functionality
- Additional visual effects
- Mobile optimization

## 📄 License

[Your License Here]

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

[Your Contact Information]

---

**Built with cosmic dread and Three.js magic** 🌌
