# Ugly Mario - Platformer Game

A fun platformer game with 100 levels, 6 ugly heroes, 10 worlds, and actual music!

## Features
- **100 procedurally generated levels** across 10 themed worlds (grassland, desert, cave, snow, lava, night, swamp, sky, toxic, crystal)
- **6 unique playable characters** with distinct appearances
- **Multiple enemy types**: walkers, speedsters, flyers, jumpers, chargers, and turrets
- **Hazards**: spikes, lava, saw blades, wind zones, falling platforms
- **Music & sound effects** per theme using Tone.js

## Controls
- **Arrow keys** or **WASD** - Move
- **Space** - Jump
- Stomp enemies from above to defeat them

## Play Online
[Play the game on GitHub Pages](https://YOUR_USERNAME.github.io/ugly-mario-platformer/)

To deploy to GitHub Pages:
1. **Configure Git** (if not already done):
   ```
   git config --global user.email "your@email.com"
   git config --global user.name "Your Name"
   ```

2. **Commit and push**:
   ```
   git commit -m "Initial commit: Ugly Mario platformer"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ugly-mario-platformer.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**: Go to repo **Settings** → **Pages** → **Build and deployment** → Source: **GitHub Actions**

4. The game will be live at: `https://YOUR_USERNAME.github.io/ugly-mario-platformer/`

## Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Deploy to GitHub Pages
1. Push to GitHub
2. Go to Settings → Pages
3. Source: Deploy from branch
4. Branch: main, folder: / (root) or use GitHub Actions for Vite
