---
last_updated: 2026-08-05T20:45:40Z
---

# Architecture Design

## System Overview
Single-page HTML5 game application served via Vite dev server. Phaser 3 handles rendering, physics (Matter.js), input, and audio. Game state persisted in LocalStorage. Modular JS architecture with scene-based game flow.

## Tech Stack
- HTML5 + CSS3 + JavaScript ES6+
- Phaser 3.60+ (CDN) with Matter.js physics
- Vite (dev server + build)
- LocalStorage (persistence)

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Entry | HTML structure, SEO, loading | index.html |
| Styles | Dark theme UI, overlays, responsive | style.css |
| Engine | Phaser config, boot, scene registry | main.js |
| Gameplay | Aiming, shooting, physics, levels | game.js |
| Levels | Procedural generation, obstacles | levels.js |
| Effects | Particles, shake, trails, slow-mo | effects.js |
| UI | Menus, HUD, shop, settings, stats | ui.js |
| Data | Save/load, progression, analytics | data.js |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Physics Engine | Matter.js (Phaser built-in) | Realistic 2D physics, no extra deps |
| Rendering | Phaser 3 WebGL/Canvas | Auto-fallback, performant on low-end |
| Asset Strategy | Procedural graphics (no sprites) | <2MB, instant load, no asset files |
| State Management | LocalStorage JSON | Simple, no backend needed |
| Level Generation | Seeded PRNG | Reproducible for Daily Challenge |

## File Tree Plan
```
app/frontend/
├── index.html      # Entry point, SEO, game container
├── style.css       # Dark theme, UI overlays, responsive
├── main.js         # Phaser config, boot scene, scene registry
├── game.js         # Gameplay scene - aiming, shooting, collisions
├── levels.js       # Procedural level generation
├── effects.js      # Visual effects - particles, shake, trails
├── ui.js           # UI scenes - menu, pause, shop, stats
├── data.js         # Persistence, progression, analytics hooks
├── robots.txt      # SEO
└── sitemap.xml     # SEO
```

## Implementation Guide
1. Set up index.html with all SEO tags, Phaser 3 CDN script, game div
2. Style the dark theme UI with CSS overlays for menus
3. Initialize Phaser in main.js with Matter physics, register all scenes
4. Build the core gameplay loop in game.js (aim → shoot → hit/miss → next)
5. Create procedural level generator in levels.js with difficulty curve
6. Add juice/effects in effects.js for premium game feel
7. Build complete UI system in ui.js (menus, shop, stats, settings)
8. Wire up persistence and analytics in data.js

