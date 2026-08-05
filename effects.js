/**
 * effects.js - Visual Effects System
 * Particles, camera shake, trails, slow-mo, screen flash, glow
 */

window.Effects = {
    scene: null,
    trailGraphics: null,
    trailPoints: [],
    
    init(scene) {
        this.scene = scene;
        this.trailPoints = [];
        this.trailGraphics = scene.add.graphics();
        this.trailGraphics.setDepth(5);
    },
    
    // ============================================
    // Camera Shake
    // ============================================
    shake(intensity = 0.005, duration = 150) {
        if (!this.scene) return;
        this.scene.cameras.main.shake(duration, intensity);
    },
    
    // ============================================
    // Hit Freeze (brief pause for impact)
    // ============================================
    hitFreeze(duration = 50) {
        if (!this.scene) return;
        this.scene.time.timeScale = 0;
        this.scene.time.delayedCall(duration, () => {
            this.scene.time.timeScale = 1;
        });
        // Also freeze physics briefly
        this.scene.matter.world.engine.timing.timeScale = 0;
        setTimeout(() => {
            if (this.scene && this.scene.matter) {
                this.scene.matter.world.engine.timing.timeScale = 1;
            }
        }, duration);
    },
    
    // ============================================
    // Slow Motion
    // ============================================
    slowMotion(scale = 0.3, duration = 600) {
        if (!this.scene) return;
        this.scene.matter.world.engine.timing.timeScale = scale;
        this.scene.time.delayedCall(duration * scale, () => {
            if (this.scene && this.scene.matter) {
                this.scene.matter.world.engine.timing.timeScale = 1;
            }
        });
    },
    
    // ============================================
    // Screen Flash
    // ============================================
    screenFlash(color = 0xffffff, duration = 200) {
        if (!this.scene) return;
        this.scene.cameras.main.flash(duration, 
            (color >> 16) & 0xff, 
            (color >> 8) & 0xff, 
            color & 0xff, 
            true
        );
    },
    
    // ============================================
    // Particle Explosion
    // ============================================
    explode(x, y, color = 0xff6b35, count = 20) {
        if (!this.scene || !GameData.data.settings.particles) return;
        
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = 150 + Math.random() * 200;
            const size = 3 + Math.random() * 5;
            
            const particle = this.scene.add.circle(x, y, size, color);
            particle.setDepth(20);
            particle.setAlpha(1);
            
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed - 50,
                alpha: 0,
                scaleX: 0,
                scaleY: 0,
                duration: 500 + Math.random() * 300,
                ease: 'Cubic.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    },
    
    // ============================================
    // Ring Burst (for level complete)
    // ============================================
    ringBurst(x, y, color = 0x4ecdc4) {
        if (!this.scene) return;
        
        const ring = this.scene.add.circle(x, y, 10, null);
        ring.setStrokeStyle(3, color);
        ring.setDepth(25);
        
        this.scene.tweens.add({
            targets: ring,
            radius: 120,
            alpha: 0,
            lineWidth: 0.5,
            duration: 600,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                ring.setStrokeStyle(ring.lineWidth || 3, color, ring.alpha);
                ring.setRadius(ring.radius || 10);
            },
            onComplete: () => ring.destroy()
        });
    },
    
    // ============================================
    // Ball Trail
    // ============================================
    addTrailPoint(x, y) {
        if (!GameData.data.settings.particles) return;
        this.trailPoints.push({ x, y, alpha: 1, time: Date.now() });
        if (this.trailPoints.length > 30) {
            this.trailPoints.shift();
        }
    },
    
    updateTrail(ballColor = 0xff6b35) {
        if (!this.trailGraphics) return;
        this.trailGraphics.clear();
        
        if (!GameData.data.settings.particles) return;
        
        const now = Date.now();
        this.trailPoints = this.trailPoints.filter(p => now - p.time < 400);
        
        for (let i = 0; i < this.trailPoints.length; i++) {
            const p = this.trailPoints[i];
            const age = (now - p.time) / 400;
            const alpha = (1 - age) * 0.6;
            const size = (1 - age) * 6;
            
            this.trailGraphics.fillStyle(ballColor, alpha);
            this.trailGraphics.fillCircle(p.x, p.y, size);
        }
    },
    
    clearTrail() {
        this.trailPoints = [];
        if (this.trailGraphics) this.trailGraphics.clear();
    },
    
    // ============================================
    // Glow Effect (drawn around objects)
    // ============================================
    drawGlow(graphics, x, y, radius, color, alpha = 0.3) {
        for (let i = 3; i > 0; i--) {
            graphics.fillStyle(color, alpha / i);
            graphics.fillCircle(x, y, radius + i * 4);
        }
    },
    
    // ============================================
    // Victory Celebration
    // ============================================
    celebrate(x, y) {
        this.screenFlash(0x4ecdc4, 150);
        this.shake(0.008, 200);
        this.hitFreeze(50);
        this.explode(x, y, 0x4ecdc4, 30);
        this.explode(x, y, 0xffd700, 15);
        this.ringBurst(x, y, 0x4ecdc4);
        Haptics.success();
    },
    
    // ============================================
    // Near Miss Effect
    // ============================================
    nearMiss(x, y) {
        this.slowMotion(0.2, 400);
        this.shake(0.003, 100);
        
        // Brief glow pulse
        const glow = this.scene.add.circle(x, y, 30, 0xff6b35, 0.3);
        glow.setDepth(15);
        this.scene.tweens.add({
            targets: glow,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 300,
            onComplete: () => glow.destroy()
        });
    },
    
    // ============================================
    // Miss Effect
    // ============================================
    missEffect(x, y) {
        this.shake(0.003, 80);
        this.explode(x, y, 0xff4757, 8);
        Haptics.light();
    },
    
    // ============================================
    // Cleanup
    // ============================================
    destroy() {
        this.trailPoints = [];
        if (this.trailGraphics) {
            this.trailGraphics.destroy();
            this.trailGraphics = null;
        }
        this.scene = null;
    }
};
