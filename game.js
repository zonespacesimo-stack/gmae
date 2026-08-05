/**
 * game.js - Core Gameplay Scene
 * Handles aiming, shooting, physics, collisions, and level flow
 */

window.GameScene = class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.ball = null;
        this.cannon = null;
        this.target = null;
        this.aimLine = null;
        this.trajectoryDots = [];
        this.obstacles = [];
        this.movingObjects = [];
        this.portals = [];
        this.isAiming = false;
        this.isShooting = false;
        this.levelComplete = false;
        this.aimStart = { x: 0, y: 0 };
        this.currentLevel = 1;
        this.gameMode = 'classic';
        this.levelConfig = null;
        this.canShoot = true;
        this.ballColor = 0xff6b35;
        this.cannonColor = 0x4a4a6a;
        this.gameWidth = 800;
        this.gameHeight = 600;
    }
    
    init(data) {
        this.gameMode = data.mode || 'classic';
        this.currentLevel = data.level || 1;
        if (this.gameMode === 'classic') {
            this.currentLevel = GameData.data.classicLevel || 1;
        }
    }
    
    create() {
        this.gameWidth = this.scale.width;
        this.gameHeight = this.scale.height;
        
        // Get skin colors
        this.ballColor = Phaser.Display.Color.HexStringToColor(GameData.getCurrentBallColor()).color;
        this.cannonColor = Phaser.Display.Color.HexStringToColor(GameData.getCurrentCannonColor()).color;
        
        // Background
        this.createBackground();
        
        // Initialize effects
        Effects.init(this);
        
        // Generate level
        this.loadLevel();
        
        // Input handling
        this.setupInput();
        
        // Show HUD
        window.UI.showHUD(this.currentLevel, this.gameMode);
        
        // Analytics
        Analytics.gameStart(this.gameMode);
        GameData.data.gamesPlayed++;
        GameData.updateMission('play3', GameData.data.gamesPlayed);
        GameData.save();
        
        // Listen for pause
        this.events.on('pause', () => {});
        this.events.on('resume', () => {});
    }
    
    createBackground() {
        // Dark gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x12122a, 0x12122a, 1);
        bg.fillRect(0, 0, this.gameWidth, this.gameHeight);
        bg.setDepth(0);
        
        // Subtle grid
        const grid = this.add.graphics();
        grid.lineStyle(1, 0xffffff, 0.03);
        const gridSize = 40;
        for (let x = 0; x < this.gameWidth; x += gridSize) {
            grid.lineBetween(x, 0, x, this.gameHeight);
        }
        for (let y = 0; y < this.gameHeight; y += gridSize) {
            grid.lineBetween(0, y, this.gameWidth, y);
        }
        grid.setDepth(0);
    }
    
    loadLevel() {
        // Clear previous level objects
        this.clearLevel();
        
        // Generate level config
        let rng = null;
        if (this.gameMode === 'daily') {
            const seed = GameData.getDailySeed() * 1000 + this.currentLevel;
            rng = new SeededRandom(seed);
        }
        
        this.levelConfig = LevelGenerator.generate(
            this.currentLevel, rng, this.gameWidth, this.gameHeight
        );
        
        // Create game objects
        this.createCannon();
        this.createTarget();
        this.createObstacles();
        this.createBoundaryWalls();
        
        // Reset state
        this.isShooting = false;
        this.levelComplete = false;
        this.canShoot = true;
        Effects.clearTrail();
        
        // Level entrance animation
        this.cameras.main.setAlpha(0);
        this.tweens.add({
            targets: this.cameras.main,
            alpha: 1,
            duration: 200,
            ease: 'Cubic.easeOut'
        });
    }
    
    clearLevel() {
        // Remove collision listener
        this.matter.world.off('collisionstart', this.handleCollision, this);
        
        if (this.ball) { this.matter.world.remove(this.ball); this.ball = null; }
        if (this.ballVisual) { this.ballVisual.destroy(); this.ballVisual = null; }
        if (this.cannon) { this.cannon.destroy(); this.cannon = null; }
        if (this.cannonBase) { this.cannonBase.destroy(); this.cannonBase = null; }
        if (this.target) { this.matter.world.remove(this.target); this.target = null; }
        if (this.targetVisual) { this.targetVisual.destroy(); this.targetVisual = null; }
        if (this.targetInner) { this.targetInner.destroy(); this.targetInner = null; }
        if (this.targetGlow) { this.targetGlow.destroy(); this.targetGlow = null; }
        if (this.aimLine) { this.aimLine.destroy(); this.aimLine = null; }
        
        this.trajectoryDots.forEach(d => d.destroy());
        this.trajectoryDots = [];
        
        this.obstacles.forEach(o => {
            if (o.body) { try { this.matter.world.remove(o.body); } catch(e) {} }
            if (o.graphics) { o.graphics.destroy(); }
            if (o.glow) { o.glow.destroy(); }
        });
        this.obstacles = [];
        
        // Clean up portal exit visuals
        this.portals.forEach(p => {
            if (p.exitVisual) { p.exitVisual.destroy(); }
        });
        this.movingObjects = [];
        this.portals = [];
        
        // Clear all remaining matter bodies
        const allBodies = this.matter.world.getAllBodies();
        allBodies.forEach(body => {
            this.matter.world.remove(body);
        });
    }
    
    createCannon() {
        const cfg = this.levelConfig.cannon;
        
        // Cannon base (circle)
        this.cannonBase = this.add.circle(cfg.x, cfg.y, 20, this.cannonColor);
        this.cannonBase.setDepth(10);
        this.cannonBase.setStrokeStyle(2, 0xffffff, 0.2);
        
        // Cannon barrel (rectangle that rotates)
        this.cannon = this.add.rectangle(cfg.x, cfg.y, 40, 12, this.cannonColor);
        this.cannon.setDepth(11);
        this.cannon.setOrigin(0, 0.5);
        this.cannon.setAngle(cfg.angle);
        
        // Aim line graphics
        this.aimLine = this.add.graphics();
        this.aimLine.setDepth(8);
    }
    
    createTarget() {
        const cfg = this.levelConfig.target;
        
        // Target glow
        this.targetGlow = this.add.circle(cfg.x, cfg.y, cfg.radius + 8, 0x4ecdc4, 0.15);
        this.targetGlow.setDepth(9);
        
        // Pulsing animation
        this.tweens.add({
            targets: this.targetGlow,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0.05,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Target body (Matter.js)
        this.target = this.matter.add.circle(cfg.x, cfg.y, cfg.radius, {
            isStatic: true,
            isSensor: true,
            label: 'target',
            circleRadius: cfg.radius
        });
        
        // Target visual
        this.targetVisual = this.add.circle(cfg.x, cfg.y, cfg.radius, 0x4ecdc4);
        this.targetVisual.setDepth(10);
        this.targetVisual.setStrokeStyle(2, 0xffffff, 0.3);
        
        // Inner ring
        this.targetInner = this.add.circle(cfg.x, cfg.y, cfg.radius * 0.4, 0x2eaa9e);
        this.targetInner.setDepth(11);
        
        // Moving target
        if (cfg.moving) {
            this.movingObjects.push({
                bodies: [this.target],
                visuals: [this.targetVisual, this.targetGlow, this.targetInner],
                baseX: cfg.x,
                baseY: cfg.y,
                ...cfg.moving,
                time: 0
            });
        }
    }
    
    createObstacles() {
        const cfgs = this.levelConfig.obstacles;
        
        cfgs.forEach(cfg => {
            switch (cfg.type) {
                case 'wall':
                    this.createWallObstacle(cfg);
                    break;
                case 'moving_wall':
                    this.createMovingWall(cfg);
                    break;
                case 'rotating':
                    this.createRotatingObstacle(cfg);
                    break;
                case 'bumper':
                    this.createBumper(cfg);
                    break;
                case 'portal':
                    this.createPortal(cfg);
                    break;
            }
        });
    }
    
    createWallObstacle(cfg) {
        const body = this.matter.add.rectangle(cfg.x, cfg.y, cfg.width, cfg.height, {
            isStatic: true,
            angle: Phaser.Math.DegToRad(cfg.angle || 0),
            label: 'obstacle',
            restitution: 0.5
        });
        
        const graphics = this.add.rectangle(cfg.x, cfg.y, cfg.width, cfg.height, 0x3a3a5a);
        graphics.setAngle(cfg.angle || 0);
        graphics.setDepth(8);
        graphics.setStrokeStyle(1, 0xffffff, 0.1);
        
        this.obstacles.push({ body, graphics, type: 'wall' });
    }
    
    createMovingWall(cfg) {
        const body = this.matter.add.rectangle(cfg.x, cfg.y, cfg.width, cfg.height, {
            isStatic: true,
            label: 'obstacle',
            restitution: 0.5
        });
        
        const graphics = this.add.rectangle(cfg.x, cfg.y, cfg.width, cfg.height, 0x5a3a6a);
        graphics.setDepth(8);
        graphics.setStrokeStyle(1, 0xa855f7, 0.3);
        
        this.obstacles.push({ body, graphics, type: 'moving_wall' });
        this.movingObjects.push({
            bodies: [body],
            visuals: [graphics],
            baseX: cfg.x,
            baseY: cfg.y,
            speed: cfg.speed,
            range: cfg.range,
            direction: cfg.direction,
            time: Math.random() * Math.PI * 2
        });
    }
    
    createRotatingObstacle(cfg) {
        const body = this.matter.add.rectangle(cfg.x, cfg.y, cfg.length, cfg.height, {
            isStatic: true,
            label: 'obstacle',
            restitution: 0.5
        });
        
        const graphics = this.add.rectangle(cfg.x, cfg.y, cfg.length, cfg.height, 0x6a3a3a);
        graphics.setDepth(8);
        graphics.setStrokeStyle(1, 0xff4757, 0.3);
        
        this.obstacles.push({ body, graphics, type: 'rotating', cfg });
    }
    
    createBumper(cfg) {
        const body = this.matter.add.circle(cfg.x, cfg.y, cfg.radius, {
            isStatic: true,
            label: 'bumper',
            restitution: cfg.bounciness,
            circleRadius: cfg.radius
        });
        
        const graphics = this.add.circle(cfg.x, cfg.y, cfg.radius, 0xffd700, 0.8);
        graphics.setDepth(8);
        graphics.setStrokeStyle(2, 0xffaa00, 0.5);
        
        this.obstacles.push({ body, graphics, type: 'bumper' });
    }
    
    createPortal(cfg) {
        // Entry portal
        const entry = this.matter.add.circle(cfg.x, cfg.y, cfg.radius, {
            isStatic: true,
            isSensor: true,
            label: 'portal_entry',
            circleRadius: cfg.radius
        });
        
        const entryVisual = this.add.circle(cfg.x, cfg.y, cfg.radius, 0xa855f7, 0.6);
        entryVisual.setDepth(8);
        entryVisual.setStrokeStyle(2, 0xd4a5ff, 0.5);
        
        // Exit portal
        const exit = this.add.circle(cfg.x2, cfg.y2, cfg.radius, 0x4ecdc4, 0.6);
        exit.setDepth(8);
        exit.setStrokeStyle(2, 0x7eddd6, 0.5);
        
        // Pulsing
        this.tweens.add({
            targets: [entryVisual, exit],
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        this.obstacles.push({ body: entry, graphics: entryVisual, type: 'portal' });
        this.portals.push({ entry, exitX: cfg.x2, exitY: cfg.y2, entryVisual, exitVisual: exit, used: false });
    }
    
    createBoundaryWalls() {
        const walls = this.levelConfig.walls;
        walls.forEach(w => {
            this.matter.add.rectangle(w.x, w.y, w.width, w.height, {
                isStatic: true,
                label: 'boundary',
                restitution: 0.3
            });
        });
    }
    
    setupInput() {
        this.input.on('pointerdown', (pointer) => {
            if (!this.canShoot || this.isShooting || this.levelComplete) return;
            this.isAiming = true;
            this.aimStart.x = pointer.x;
            this.aimStart.y = pointer.y;
            Haptics.light();
        });
        
        this.input.on('pointermove', (pointer) => {
            if (!this.isAiming) return;
            this.updateAim(pointer);
        });
        
        this.input.on('pointerup', (pointer) => {
            if (!this.isAiming) return;
            this.isAiming = false;
            this.shoot(pointer);
        });
    }
    
    updateAim(pointer) {
        const cfg = this.levelConfig.cannon;
        const dx = this.aimStart.x - pointer.x;
        const dy = this.aimStart.y - pointer.y;
        const power = Math.min(Math.sqrt(dx * dx + dy * dy), 200);
        const angle = Math.atan2(dy, dx);
        
        // Rotate cannon
        this.cannon.setAngle(Phaser.Math.RadToDeg(angle));
        
        // Draw aim line
        this.aimLine.clear();
        
        if (power > 10) {
            // Trajectory preview (dotted line)
            const speed = power * 0.08;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const gravity = 0.001; // Matter.js default gravity
            
            this.aimLine.lineStyle(2, this.ballColor, 0.4);
            
            let px = cfg.x;
            let py = cfg.y;
            let pvx = vx;
            let pvy = vy;
            
            for (let i = 0; i < 40; i++) {
                const nx = px + pvx * 16;
                const ny = py + pvy * 16;
                pvy += gravity * 16 * 60; // Approximate gravity
                
                if (i % 3 === 0) {
                    const alpha = 0.4 * (1 - i / 40);
                    const size = 3 * (1 - i / 60);
                    this.aimLine.fillStyle(this.ballColor, alpha);
                    this.aimLine.fillCircle(nx, ny, size);
                }
                
                px = nx;
                py = ny;
                pvx = pvx;
                
                // Stop if out of bounds
                if (nx < 0 || nx > this.gameWidth || ny < 0 || ny > this.gameHeight) break;
            }
            
            // Power indicator
            const powerRatio = power / 200;
            const barWidth = 40;
            const barX = cfg.x - barWidth / 2;
            const barY = cfg.y + 30;
            this.aimLine.fillStyle(0x333355, 0.5);
            this.aimLine.fillRoundedRect(barX, barY, barWidth, 5, 2);
            this.aimLine.fillStyle(this.ballColor, 0.8);
            this.aimLine.fillRoundedRect(barX, barY, barWidth * powerRatio, 5, 2);
        }
    }
    
    shoot(pointer) {
        const cfg = this.levelConfig.cannon;
        const dx = this.aimStart.x - pointer.x;
        const dy = this.aimStart.y - pointer.y;
        const power = Math.min(Math.sqrt(dx * dx + dy * dy), 200);
        
        if (power < 15) {
            this.aimLine.clear();
            return; // Too weak, cancel
        }
        
        const angle = Math.atan2(dy, dx);
        const speed = power * 0.08;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        // Create ball
        this.ball = this.matter.add.circle(cfg.x, cfg.y, 10, {
            restitution: 0.6,
            friction: 0.01,
            frictionAir: 0.001,
            density: 0.002,
            label: 'ball'
        });
        
        // Ball visual
        this.ballVisual = this.add.circle(cfg.x, cfg.y, 10, this.ballColor);
        this.ballVisual.setDepth(15);
        this.ballVisual.setStrokeStyle(1, 0xffffff, 0.3);
        
        // Apply velocity
        this.matter.body.setVelocity(this.ball, { x: vx, y: vy });
        
        this.isShooting = true;
        this.canShoot = false;
        this.aimLine.clear();
        
        // Camera follow briefly
        Haptics.medium();
        
        // Collision detection
        this.matter.world.on('collisionstart', this.handleCollision, this);
        
        // Timeout - if ball doesn't hit target in 5 seconds, fail
        this.time.delayedCall(5000, () => {
            if (!this.levelComplete && this.isShooting) {
                this.onMiss();
            }
        });
    }
    
    handleCollision(event) {
        const pairs = event.pairs;
        
        for (const pair of pairs) {
            const labels = [pair.bodyA.label, pair.bodyB.label];
            
            if (labels.includes('ball') && labels.includes('target')) {
                this.onHit();
                return;
            }
            
            if (labels.includes('ball') && labels.includes('bumper')) {
                // Bumper bounce effect
                const bumperBody = pair.bodyA.label === 'bumper' ? pair.bodyA : pair.bodyB;
                Effects.explode(bumperBody.position.x, bumperBody.position.y, 0xffd700, 6);
                Haptics.light();
            }
            
            if (labels.includes('ball') && labels.includes('portal_entry')) {
                this.handlePortal();
            }
            
            if (labels.includes('ball') && labels.includes('boundary')) {
                // Ball hit boundary - miss
                if (this.isShooting && !this.levelComplete) {
                    this.time.delayedCall(100, () => {
                        if (!this.levelComplete) this.onMiss();
                    });
                }
            }
        }
    }
    
    handlePortal() {
        for (const portal of this.portals) {
            if (!portal.used && this.ball) {
                portal.used = true;
                // Teleport ball to exit
                this.matter.body.setPosition(this.ball, { x: portal.exitX, y: portal.exitY });
                Effects.explode(portal.exitX, portal.exitY, 0xa855f7, 10);
                Haptics.light();
                break;
            }
        }
    }
    
    onHit() {
        if (this.levelComplete) return;
        this.levelComplete = true;
        this.isShooting = false;
        
        const targetPos = this.levelConfig.target;
        
        // Effects
        Effects.celebrate(targetPos.x, targetPos.y);
        
        // Record
        GameData.recordShot(true);
        GameData.setHighestLevel(this.currentLevel);
        GameData.updateMission('hit5', GameData.data.totalHits);
        GameData.updateMission('streak3', GameData.data.currentStreak);
        
        // Coins
        const reward = LevelGenerator.getReward(this.currentLevel, GameData.data.currentStreak);
        GameData.addCoins(reward);
        
        // Analytics
        Analytics.levelCompleted(this.currentLevel, this.gameMode);
        
        // Update classic progress
        if (this.gameMode === 'classic') {
            GameData.data.classicLevel = this.currentLevel + 1;
            GameData.save();
        }
        
        if (this.gameMode === 'daily') {
            GameData.setDailyChallengeScore(this.currentLevel);
        }
        
        // Show level complete UI
        this.time.delayedCall(800, () => {
            window.UI.showLevelComplete(this.currentLevel, reward);
        });
        
        // Remove collision listener
        this.matter.world.off('collisionstart', this.handleCollision, this);
    }
    
    onMiss() {
        if (this.levelComplete) return;
        this.isShooting = false;
        
        // Miss effect
        if (this.ball) {
            const pos = this.ball.position;
            Effects.missEffect(pos.x, pos.y);
        }
        
        // Check near miss
        if (this.ball && this.target) {
            const dx = this.ball.position.x - this.target.position.x;
            const dy = this.ball.position.y - this.target.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const targetRadius = this.levelConfig.target.radius;
            
            if (dist < targetRadius * 2.5) {
                Effects.nearMiss(this.target.position.x, this.target.position.y);
            }
        }
        
        // Record
        GameData.recordShot(false);
        Monetization.onLevelFail();
        Analytics.levelFailed(this.currentLevel, this.gameMode, GameData.data.totalMisses);
        
        // Remove collision listener
        this.matter.world.off('collisionstart', this.handleCollision, this);
        
        // Instant restart (< 0.5s)
        this.time.delayedCall(300, () => {
            this.restartLevel();
        });
    }
    
    restartLevel() {
        this.loadLevel();
    }
    
    nextLevel() {
        this.currentLevel++;
        this.loadLevel();
        window.UI.updateHUDLevel(this.currentLevel);
    }
    
    update(time, delta) {
        // Update ball visual position
        if (this.ball && this.ballVisual) {
            this.ballVisual.setPosition(this.ball.position.x, this.ball.position.y);
            
            // Trail
            if (this.isShooting) {
                Effects.addTrailPoint(this.ball.position.x, this.ball.position.y);
            }
            
            // Check if ball went out of bounds
            const pos = this.ball.position;
            if (pos.x < -50 || pos.x > this.gameWidth + 50 || 
                pos.y < -50 || pos.y > this.gameHeight + 50) {
                if (!this.levelComplete) this.onMiss();
            }
        }
        
        // Update trail
        Effects.updateTrail(this.ballColor);
        
        // Update moving objects
        this.updateMovingObjects(time);
        
        // Update rotating obstacles
        this.updateRotatingObstacles(time);
    }
    
    updateMovingObjects(time) {
        for (const obj of this.movingObjects) {
            obj.time += 0.016; // ~60fps delta
            const offset = Math.sin(obj.time * obj.speed) * obj.range;
            
            let newX = obj.baseX;
            let newY = obj.baseY;
            
            if (obj.direction === 'horizontal') {
                newX = obj.baseX + offset;
            } else {
                newY = obj.baseY + offset;
            }
            
            // Update physics bodies
            for (const body of obj.bodies) {
                this.matter.body.setPosition(body, { x: newX, y: newY });
            }
            
            // Update visuals
            for (const visual of obj.visuals) {
                visual.setPosition(newX, newY);
            }
        }
    }
    
    updateRotatingObstacles(time) {
        for (const obs of this.obstacles) {
            if (obs.type === 'rotating' && obs.cfg) {
                const angle = (time * 0.001 * obs.cfg.speed) % (Math.PI * 2);
                this.matter.body.setAngle(obs.body, angle);
                obs.graphics.setAngle(Phaser.Math.RadToDeg(angle));
            }
        }
    }
    
    shutdown() {
        Effects.destroy();
        this.matter.world.off('collisionstart', this.handleCollision, this);
    }
};
