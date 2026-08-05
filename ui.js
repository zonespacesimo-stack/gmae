/**
 * ui.js - UI Management System
 * Handles all menus, HUD, shop, stats, achievements, settings
 */

window.UI = {
    currentMenu: null,
    gameScene: null,
    
    init() {
        this.bindEvents();
        this.showMainMenu();
    },
    
    // ============================================
    // Menu Management
    // ============================================
    showOverlay() {
        document.getElementById('ui-overlay').classList.remove('hidden');
    },
    
    hideOverlay() {
        document.getElementById('ui-overlay').classList.add('hidden');
    },
    
    showMenu(menuId) {
        this.hideAllMenus();
        this.showOverlay();
        document.getElementById(menuId).classList.remove('hidden');
        this.currentMenu = menuId;
    },
    
    hideAllMenus() {
        document.querySelectorAll('.menu-screen').forEach(m => m.classList.add('hidden'));
    },
    
    // ============================================
    // Main Menu
    // ============================================
    showMainMenu() {
        this.hideHUD();
        this.showMenu('main-menu');
        document.getElementById('menu-coins').textContent = GameData.data.coins;
    },
    
    showDailyReward(reward) {
        document.getElementById('daily-reward-amount').textContent = reward.amount;
        document.getElementById('daily-streak').textContent = reward.streak;
        this.showMenu('daily-reward');
    },
    
    // ============================================
    // HUD
    // ============================================
    showHUD(level, mode) {
        const hud = document.getElementById('game-hud');
        hud.classList.remove('hidden');
        document.getElementById('hud-level-num').textContent = level;
        document.getElementById('hud-mode').textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
        document.getElementById('hud-coins').textContent = GameData.data.coins;
        this.updateStreak();
    },
    
    hideHUD() {
        document.getElementById('game-hud').classList.add('hidden');
    },
    
    updateHUDLevel(level) {
        document.getElementById('hud-level-num').textContent = level;
        document.getElementById('hud-coins').textContent = GameData.data.coins;
        this.updateStreak();
    },
    
    updateStreak() {
        const streak = GameData.data.currentStreak;
        const el = document.getElementById('hud-streak');
        if (streak >= 3) {
            el.textContent = `🔥 ${streak} streak`;
        } else {
            el.textContent = '';
        }
    },
    
    // ============================================
    // Level Complete
    // ============================================
    showLevelComplete(level, coins) {
        document.getElementById('complete-level').textContent = level;
        document.getElementById('coins-earned').textContent = coins;
        this.showMenu('level-complete');
    },
    
    // ============================================
    // Pause
    // ============================================
    showPause() {
        if (this.gameScene) {
            this.gameScene.scene.pause();
        }
        this.showMenu('pause-menu');
    },
    
    hidePause() {
        this.hideAllMenus();
        this.hideOverlay();
        if (this.gameScene) {
            this.gameScene.scene.resume();
        }
    },
    
    // ============================================
    // Settings
    // ============================================
    showSettings() {
        this.showMenu('settings-menu');
        document.getElementById('toggle-sound').checked = GameData.data.settings.sound;
        document.getElementById('toggle-vibration').checked = GameData.data.settings.vibration;
        document.getElementById('toggle-particles').checked = GameData.data.settings.particles;
    },
    
    // ============================================
    // Shop
    // ============================================
    showShop() {
        this.showMenu('shop-menu');
        document.getElementById('shop-coins').textContent = GameData.data.coins;
        this.renderShopItems('balls');
    },
    
    renderShopItems(tab) {
        const container = document.getElementById('shop-items');
        container.innerHTML = '';
        
        const items = tab === 'balls' ? GameData.getBallSkins() : GameData.getCannonSkins();
        const owned = tab === 'balls' ? GameData.data.ownedBalls : GameData.data.ownedCannons;
        const selected = tab === 'balls' ? GameData.data.selectedBall : GameData.data.selectedCannon;
        
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'shop-item';
            if (owned.includes(item.id)) div.classList.add('owned');
            if (item.id === selected) div.classList.add('selected');
            
            const preview = document.createElement('div');
            preview.className = 'item-preview';
            preview.style.background = item.color;
            if (item.rainbow) {
                preview.style.background = 'linear-gradient(135deg, #ff6b35, #ffd700, #4ecdc4, #a855f7, #ff69b4)';
            }
            div.appendChild(preview);
            
            if (!owned.includes(item.id)) {
                const price = document.createElement('span');
                price.className = 'price';
                price.textContent = `${item.price}🪙`;
                div.appendChild(price);
            }
            
            div.addEventListener('click', () => {
                if (owned.includes(item.id)) {
                    if (tab === 'balls') GameData.selectBall(item.id);
                    else GameData.selectCannon(item.id);
                    this.renderShopItems(tab);
                } else {
                    const success = tab === 'balls' ? GameData.unlockBall(item.id) : GameData.unlockCannon(item.id);
                    if (success) {
                        Haptics.success();
                        this.renderShopItems(tab);
                        document.getElementById('shop-coins').textContent = GameData.data.coins;
                    }
                }
            });
            
            container.appendChild(div);
        });
    },
    
    // ============================================
    // Stats
    // ============================================
    showStats() {
        this.showMenu('stats-menu');
        const container = document.getElementById('stats-list');
        
        const stats = [
            ['Highest Level', GameData.data.highestLevel],
            ['Total Shots', GameData.data.totalShots],
            ['Total Hits', GameData.data.totalHits],
            ['Accuracy', `${GameData.getAccuracy()}%`],
            ['Best Streak', GameData.data.bestStreak],
            ['Current Streak', GameData.data.currentStreak],
            ['Games Played', GameData.data.gamesPlayed],
            ['Total Coins Earned', GameData.data.coins],
            ['Endless High Score', GameData.data.endlessHighScore],
            ['Daily Challenge Best', GameData.data.dailyChallengeScore],
            ['Skins Unlocked', GameData.data.ownedBalls.length + GameData.data.ownedCannons.length - 2],
        ];
        
        container.innerHTML = stats.map(([label, value]) => `
            <div class="stat-row">
                <span class="stat-label">${label}</span>
                <span class="stat-value">${value}</span>
            </div>
        `).join('');
    },
    
    // ============================================
    // Achievements
    // ============================================
    showAchievements() {
        this.showMenu('achievements-menu');
        const container = document.getElementById('achievements-list');
        const defs = GameData.getAchievementDefs();
        
        container.innerHTML = defs.map(def => {
            const unlocked = GameData.data.achievements.includes(def.id);
            return `
                <div class="achievement-row ${unlocked ? 'unlocked' : ''}">
                    <div class="achievement-icon">${unlocked ? def.icon : '🔒'}</div>
                    <div class="achievement-info">
                        <div class="achievement-name">${def.name}</div>
                        <div class="achievement-desc">${def.desc}</div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    // ============================================
    // Game Start
    // ============================================
    startGame(mode) {
        this.hideAllMenus();
        this.hideOverlay();
        
        const level = mode === 'classic' ? (GameData.data.classicLevel || 1) : 1;
        
        if (window.game && window.game.scene) {
            // Stop existing game scene if running
            if (window.game.scene.isActive('GameScene')) {
                window.game.scene.stop('GameScene');
            }
            window.game.scene.start('GameScene', { mode, level });
            
            // Capture scene reference after start
            setTimeout(() => {
                const scene = window.game.scene.getScene('GameScene');
                if (scene) {
                    this.gameScene = scene;
                }
            }, 150);
        }
    },
    
    // ============================================
    // Event Bindings
    // ============================================
    bindEvents() {
        // Main menu buttons
        document.getElementById('btn-classic').addEventListener('click', () => {
            Haptics.light();
            this.startGame('classic');
        });
        
        document.getElementById('btn-endless').addEventListener('click', () => {
            Haptics.light();
            this.startGame('endless');
        });
        
        document.getElementById('btn-daily').addEventListener('click', () => {
            Haptics.light();
            this.startGame('daily');
        });
        
        // Bottom row
        document.getElementById('btn-shop').addEventListener('click', () => {
            Haptics.light();
            this.showShop();
        });
        
        document.getElementById('btn-stats').addEventListener('click', () => {
            Haptics.light();
            this.showStats();
        });
        
        document.getElementById('btn-achievements').addEventListener('click', () => {
            Haptics.light();
            this.showAchievements();
        });
        
        document.getElementById('btn-settings').addEventListener('click', () => {
            Haptics.light();
            this.showSettings();
        });
        
        // Pause menu
        document.getElementById('btn-pause').addEventListener('click', () => {
            Haptics.light();
            this.showPause();
        });
        
        document.getElementById('btn-resume').addEventListener('click', () => {
            Haptics.light();
            this.hidePause();
        });
        
        document.getElementById('btn-restart').addEventListener('click', () => {
            Haptics.light();
            this.hideAllMenus();
            this.hideOverlay();
            if (this.gameScene) {
                this.gameScene.scene.resume();
                this.gameScene.restartLevel();
            }
        });
        
        document.getElementById('btn-quit').addEventListener('click', () => {
            Haptics.light();
            if (window.game && window.game.scene.isActive('GameScene')) {
                window.game.scene.stop('GameScene');
            }
            this.showMainMenu();
        });
        
        // Settings
        document.getElementById('toggle-sound').addEventListener('change', (e) => {
            GameData.data.settings.sound = e.target.checked;
            GameData.save();
        });
        
        document.getElementById('toggle-vibration').addEventListener('change', (e) => {
            GameData.data.settings.vibration = e.target.checked;
            Haptics.enabled = e.target.checked;
            GameData.save();
        });
        
        document.getElementById('toggle-particles').addEventListener('change', (e) => {
            GameData.data.settings.particles = e.target.checked;
            GameData.save();
        });
        
        document.getElementById('btn-settings-back').addEventListener('click', () => {
            Haptics.light();
            this.showMainMenu();
        });
        
        // Shop
        document.getElementById('btn-shop-back').addEventListener('click', () => {
            Haptics.light();
            this.showMainMenu();
        });
        
        document.getElementById('btn-watch-ad').addEventListener('click', async () => {
            Haptics.light();
            const rewarded = await Monetization.showRewardedAd();
            if (rewarded) {
                GameData.addCoins(50);
                document.getElementById('shop-coins').textContent = GameData.data.coins;
            }
        });
        
        // Shop tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderShopItems(e.target.dataset.tab);
            });
        });
        
        // Stats back
        document.getElementById('btn-stats-back').addEventListener('click', () => {
            Haptics.light();
            this.showMainMenu();
        });
        
        // Achievements back
        document.getElementById('btn-achievements-back').addEventListener('click', () => {
            Haptics.light();
            this.showMainMenu();
        });
        
        // Level complete
        document.getElementById('btn-next-level').addEventListener('click', () => {
            Haptics.light();
            this.hideAllMenus();
            this.hideOverlay();
            if (this.gameScene) {
                this.gameScene.nextLevel();
            }
        });
        
        // Daily reward
        document.getElementById('btn-claim-daily').addEventListener('click', () => {
            Haptics.success();
            GameData.claimDailyReward();
            this.showMainMenu();
        });
    }
};
