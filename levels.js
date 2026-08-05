/**
 * levels.js - Procedural Level Generation
 * Generates infinite levels with progressive difficulty
 * New mechanics introduced every 10 levels
 */

window.LevelGenerator = {
    /**
     * Generate a level configuration
     * @param {number} level - Level number (1-based)
     * @param {object} rng - Optional SeededRandom instance (for daily challenge)
     * @param {number} width - Game width
     * @param {number} height - Game height
     */
    generate(level, rng = null, width = 800, height = 600) {
        const random = rng || { 
            next: () => Math.random(), 
            range: (a, b) => a + Math.random() * (b - a),
            int: (a, b) => Math.floor(a + Math.random() * (b - a + 1))
        };
        
        const difficulty = Math.min(level / 50, 1); // 0 to 1 over 50 levels
        const config = {
            level,
            cannon: this.generateCannon(level, random, width, height),
            target: this.generateTarget(level, random, width, height, difficulty),
            obstacles: this.generateObstacles(level, random, width, height, difficulty),
            walls: this.generateWalls(width, height),
            mechanics: this.getMechanics(level),
        };
        
        // Validate level is possible (target is reachable)
        config.target = this.ensureReachable(config, width, height);
        
        return config;
    },
    
    generateCannon(level, random, width, height) {
        // Cannon always at bottom-left area, slight variation
        const x = 60 + random.range(0, 40);
        const y = height - 80 - random.range(0, 30);
        return { x, y, angle: -45 };
    },
    
    generateTarget(level, random, width, height, difficulty) {
        // Target position gets farther and more varied with difficulty
        const minX = width * 0.4 + difficulty * width * 0.1;
        const maxX = width * 0.85;
        const minY = 60;
        const maxY = height * 0.7;
        
        const x = random.range(minX, maxX);
        const y = random.range(minY, maxY);
        
        // Target size decreases with difficulty
        const radius = Math.max(18, 35 - difficulty * 15);
        
        // Moving target after level 10
        let moving = null;
        if (level > 10) {
            const moveChance = Math.min(0.6, (level - 10) / 30);
            if (random.next() < moveChance) {
                const speed = 0.5 + difficulty * 1.5;
                const range = 40 + difficulty * 60;
                const dir = random.next() > 0.5 ? 'horizontal' : 'vertical';
                moving = { speed, range, direction: dir };
            }
        }
        
        return { x, y, radius, moving };
    },
    
    generateObstacles(level, random, width, height, difficulty) {
        const obstacles = [];
        
        if (level < 3) return obstacles; // First 2 levels: no obstacles
        
        // Number of obstacles increases with level
        const maxObstacles = Math.min(5, Math.floor(level / 4) + 1);
        const numObstacles = random.int(1, maxObstacles);
        
        for (let i = 0; i < numObstacles; i++) {
            const type = this.getObstacleType(level, random);
            const obs = this.createObstacle(type, level, random, width, height, difficulty, obstacles);
            if (obs) obstacles.push(obs);
        }
        
        return obstacles;
    },
    
    getObstacleType(level, random) {
        const types = ['wall']; // Always available
        
        if (level >= 5) types.push('wall', 'wall'); // More walls
        if (level >= 10) types.push('moving_wall'); // Moving obstacles
        if (level >= 20) types.push('rotating'); // Rotating barriers
        if (level >= 30) types.push('bumper'); // Bumpers that deflect
        if (level >= 40) types.push('portal'); // Portals
        
        return types[random.int(0, types.length - 1)];
    },
    
    createObstacle(type, level, random, width, height, difficulty, existing) {
        const cannonZone = { x: 0, y: height - 150, w: 150, h: 150 };
        
        let obs = null;
        let attempts = 0;
        
        while (attempts < 10) {
            attempts++;
            
            switch (type) {
                case 'wall': {
                    const w = random.range(60, 120 + difficulty * 40);
                    const h = random.range(12, 20);
                    const x = random.range(width * 0.2, width * 0.75);
                    const y = random.range(height * 0.2, height * 0.75);
                    const angle = random.range(-30, 30);
                    obs = { type: 'wall', x, y, width: w, height: h, angle };
                    break;
                }
                case 'moving_wall': {
                    const w = random.range(60, 100);
                    const h = 14;
                    const x = random.range(width * 0.25, width * 0.7);
                    const y = random.range(height * 0.25, height * 0.65);
                    const speed = 0.8 + difficulty * 1.2;
                    const range = 50 + random.range(0, 60);
                    const dir = random.next() > 0.5 ? 'horizontal' : 'vertical';
                    obs = { type: 'moving_wall', x, y, width: w, height: h, speed, range, direction: dir };
                    break;
                }
                case 'rotating': {
                    const x = random.range(width * 0.3, width * 0.7);
                    const y = random.range(height * 0.25, height * 0.6);
                    const length = random.range(60, 100);
                    const speed = 0.5 + difficulty * 1;
                    obs = { type: 'rotating', x, y, length, height: 12, speed };
                    break;
                }
                case 'bumper': {
                    const x = random.range(width * 0.25, width * 0.7);
                    const y = random.range(height * 0.25, height * 0.7);
                    const radius = random.range(15, 25);
                    obs = { type: 'bumper', x, y, radius, bounciness: 1.5 };
                    break;
                }
                case 'portal': {
                    const x1 = random.range(width * 0.2, width * 0.5);
                    const y1 = random.range(height * 0.2, height * 0.6);
                    const x2 = random.range(width * 0.5, width * 0.8);
                    const y2 = random.range(height * 0.2, height * 0.6);
                    obs = { type: 'portal', x: x1, y: y1, x2, y2, radius: 18 };
                    break;
                }
            }
            
            if (obs && !this.overlapsCannonZone(obs, cannonZone) && !this.overlapExisting(obs, existing)) {
                return obs;
            }
        }
        
        return null;
    },
    
    overlapsCannonZone(obs, zone) {
        const ox = obs.x || 0;
        const oy = obs.y || 0;
        return ox < zone.x + zone.w + 30 && oy > zone.y - 30;
    },
    
    overlapExisting(obs, existing) {
        for (const e of existing) {
            const dx = (obs.x || 0) - (e.x || 0);
            const dy = (obs.y || 0) - (e.y || 0);
            if (Math.sqrt(dx * dx + dy * dy) < 80) return true;
        }
        return false;
    },
    
    generateWalls(width, height) {
        // Boundary walls
        return [
            { x: width / 2, y: -10, width: width, height: 20 }, // Top
            { x: width / 2, y: height + 10, width: width, height: 20 }, // Bottom
            { x: -10, y: height / 2, width: 20, height: height }, // Left
            { x: width + 10, y: height / 2, width: 20, height: height }, // Right
        ];
    },
    
    getMechanics(level) {
        const mechanics = [];
        if (level >= 10) mechanics.push('moving_targets');
        if (level >= 20) mechanics.push('rotating_obstacles');
        if (level >= 30) mechanics.push('bumpers');
        if (level >= 40) mechanics.push('portals');
        return mechanics;
    },
    
    ensureReachable(config, width, height) {
        // Simple validation: ensure target isn't completely blocked
        // If target is too close to cannon, move it
        const dx = config.target.x - config.cannon.x;
        const dy = config.target.y - config.cannon.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 150) {
            config.target.x = Math.min(width - 60, config.target.x + 100);
        }
        
        return config.target;
    },
    
    // ============================================
    // Coin reward calculation
    // ============================================
    getReward(level, streakBonus = 0) {
        const base = 10;
        const levelBonus = Math.floor(level / 5) * 2;
        const streak = streakBonus * 2;
        return base + levelBonus + streak;
    }
};
