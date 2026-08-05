---
last_updated: 2026-08-05T20:45:40Z
status: active
---

# Project Context

## Project Overview
One Shot Challenge - A production-ready HTML5 hyper-casual physics game built with Phaser 3. Players drag to aim and set power, release to fire a single shot per level. Hit the target to advance, miss to instantly retry. Procedurally generated levels with increasing difficulty. Dark theme, mobile-first, premium game feel.

## Key Decisions
| Date | Decision | By | Rationale |
|------|----------|-----|-----------|
| 2026-08-05 | Use Phaser 3 via CDN | Alex | Keep bundle small, no build complexity |
| 2026-08-05 | Matter.js physics (built into Phaser) | Alex | Realistic physics for projectile/obstacles |
| 2026-08-05 | LocalStorage for all persistence | Alex | No backend requirement |
| 2026-08-05 | Flat minimalist 2D with geometric shapes | Alex | Performance + aesthetic |
| 2026-08-05 | Single HTML + modular JS files | Alex | Template constraint, clean architecture |

## Constraints
- Dark theme with soft gradients and rounded UI
- Mobile-first responsive design
- 60 FPS target, <2MB initial download
- 8 code files maximum
- No backend, LocalStorage only
- Phaser 3 + Matter.js physics
- Flat 2D geometric visual style


