/**
 * data.js - Persistence, Progression, Analytics & Monetization
 * Handles all game state, saves, achievements, daily rewards, and analytics hooks
 */

// ============================================
// Analytics (provider-agnostic hooks)
// ============================================
window.Analytics = {
    track(event, data = {}) {
        const payload = { event, data, timestamp: Date.now() };
        // Future: send to analytics provider
        console.debug('[Analytics]', payload);
    },
    gameStart(mode) { this.track('game_start', { mode }); },
    levelCompleted(level, mode) { this.track('level_completed', { level, mode }); },
    levelFailed(level, mode, attempts) { this.track('level_failed', { level, mode, attempts }); },
    sessionDuration(seconds) { this.track('session_duration', { seconds }); },
    highestLevel(level) { this.track('highest_level', { level }); },
    adViewed(type) { this.track('ad_viewed', { type }); },
};

// ============================================
// Monetization (placeholder functions)
// ============================================
window.Monetization = {
    failCount: 0,
    
    showInterstitialAd() {
        console.log('[Ad] Interstitial ad would show here');
        Analytics.adViewed('interstitial');
        return new Promise(resolve => setTimeout(resolve, 100));
    },
    
    showRewardedAd() {
        console.log('[Ad] Rewarded ad would show here');
        Analytics.adViewed('rewarded');
        return new Promise(resolve => {
            setTimeout(() => resolve(true), 100);
        });
    },
    
    onLevelFail() {
        this.failCount++;
        if (this.failCount >= 5) {
            this.failCount = 0;
            this.showInterstitialAd();
        }
    }
};

// ============================================
// Save/Load System
// ============================================
const SAVE_KEY = 'oneshot_save_v1';

const DEFAULT_SAVE = {
    coins: 0,
    highestLevel: 0,
    totalShots: 0,
    totalHits: 0,
    totalMisses: 0,
    gamesPlayed: 0,
    timePlayed: 0,
    currentStreak: 0,
    bestStreak: 0,
    selectedBall: 'default',
    selectedCannon: 'default',
    ownedBalls: ['default'],
    ownedCannons: ['default'],
    achievements: [],
    dailyRewardDay: 0,
    dailyRewardDate: null,
    dailyStreak: 0,
    dailyChallengeDate: null,
    dailyChallengeScore: 0,
    classicLevel: 1,
    endlessHighScore: 0,
    settings: {
        sound: true,
        vibration: true,
        particles: true,
    },
    missions: [],
    missionsDate: null,
};

window.GameData = {
    data: null,
    sessionStart: Date.now(),
    
    load() {
        try {
            const saved = localStorage.getItem(SAVE_KEY);
            this.data = saved ? { ...DEFAULT_SAVE, ...JSON.parse(saved) } : { ...DEFAULT_SAVE };
        } catch (e) {
            this.data = { ...DEFAULT_SAVE };
        }
        this.checkDailyMissions();
        return this.data;
    },
    
    save() {
        try {
            this.data.timePlayed += Math.floor((Date.now() - this.sessionStart) / 1000);
            this.sessionStart = Date.now();
            localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.warn('Save failed:', e);
        }
    },
    
    addCoins(amount) {
        this.data.coins += amount;
        this.save();
        return this.data.coins;
    },
    
    spendCoins(amount) {
        if (this.data.coins >= amount) {
            this.data.coins -= amount;
            this.save();
            return true;
        }
        return false;
    },
    
    recordShot(hit) {
        this.data.totalShots++;
        if (hit) {
            this.data.totalHits++;
            this.data.currentStreak++;
            if (this.data.currentStreak > this.data.bestStreak) {
                this.data.bestStreak = this.data.currentStreak;
            }
        } else {
            this.data.totalMisses++;
            this.data.currentStreak = 0;
        }
        this.save();
        this.checkAchievements();
    },
    
    setHighestLevel(level) {
        if (level > this.data.highestLevel) {
            this.data.highestLevel = level;
            Analytics.highestLevel(level);
            this.save();
        }
    },
    
    getAccuracy() {
        if (this.data.totalShots === 0) return 0;
        return Math.round((this.data.totalHits / this.data.totalShots) * 100);
    },
    
    // ============================================
    // Skins
    // ============================================
    getBallSkins() {
        return [
            { id: 'default', name: 'Classic', color: '#ff6b35', price: 0 },
            { id: 'ice', name: 'Ice', color: '#4ecdc4', price: 100 },
            { id: 'fire', name: 'Fire', color: '#ff4757', price: 150 },
            { id: 'gold', name: 'Gold', color: '#ffd700', price: 200 },
            { id: 'purple', name: 'Cosmic', color: '#a855f7', price: 250 },
            { id: 'neon', name: 'Neon', color: '#00ff88', price: 300 },
            { id: 'pink', name: 'Bubblegum', color: '#ff69b4', price: 200 },
            { id: 'white', name: 'Ghost', color: '#ffffff', price: 350 },
            { id: 'rainbow', name: 'Rainbow', color: '#ff6b35', price: 500, rainbow: true },
        ];
    },
    
    getCannonSkins() {
        return [
            { id: 'default', name: 'Classic', color: '#4a4a6a', price: 0 },
            { id: 'steel', name: 'Steel', color: '#708090', price: 100 },
            { id: 'golden', name: 'Golden', color: '#daa520', price: 200 },
            { id: 'dark', name: 'Shadow', color: '#1a1a2e', price: 150 },
            { id: 'crystal', name: 'Crystal', color: '#87ceeb', price: 250 },
            { id: 'lava', name: 'Lava', color: '#8b0000', price: 300 },
        ];
    },
    
    unlockBall(id) {
        const skin = this.getBallSkins().find(s => s.id === id);
        if (!skin || this.data.ownedBalls.includes(id)) return false;
        if (this.spendCoins(skin.price)) {
            this.data.ownedBalls.push(id);
            this.save();
            return true;
        }
        return false;
    },
    
    unlockCannon(id) {
        const skin = this.getCannonSkins().find(s => s.id === id);
        if (!skin || this.data.ownedCannons.includes(id)) return false;
        if (this.spendCoins(skin.price)) {
            this.data.ownedCannons.push(id);
            this.save();
            return true;
        }
        return false;
    },
    
    selectBall(id) {
        if (this.data.ownedBalls.includes(id)) {
            this.data.selectedBall = id;
            this.save();
            return true;
        }
        return false;
    },
    
    selectCannon(id) {
        if (this.data.ownedCannons.includes(id)) {
            this.data.selectedCannon = id;
            this.save();
            return true;
        }
        return false;
    },
    
    getCurrentBallColor() {
        const skin = this.getBallSkins().find(s => s.id === this.data.selectedBall);
        return skin ? skin.color : '#ff6b35';
    },
    
    getCurrentCannonColor() {
        const skin = this.getCannonSkins().find(s => s.id === this.data.selectedCannon);
        return skin ? skin.color : '#4a4a6a';
    },
    
    // ============================================
    // Daily Rewards
    // ============================================
    checkDailyReward() {
        const today = new Date().toDateString();
        if (this.data.dailyRewardDate === today) return null;
        
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (this.data.dailyRewardDate === yesterday) {
            this.data.dailyStreak++;
        } else if (this.data.dailyRewardDate !== null) {
            this.data.dailyStreak = 1;
        } else {
            this.data.dailyStreak = 1;
        }
        
        const reward = 25 + (this.data.dailyStreak - 1) * 10;
        return { amount: reward, streak: this.data.dailyStreak };
    },
    
    claimDailyReward() {
        const reward = this.checkDailyReward();
        if (reward) {
            this.data.dailyRewardDate = new Date().toDateString();
            this.addCoins(reward.amount);
            return reward;
        }
        return null;
    },
    
    // ============================================
    // Daily Missions
    // ============================================
    checkDailyMissions() {
        const today = new Date().toDateString();
        if (this.data.missionsDate !== today) {
            this.data.missions = [
                { id: 'hit5', desc: 'Hit 5 targets', target: 5, progress: 0, reward: 30, done: false },
                { id: 'streak3', desc: 'Get a 3-hit streak', target: 3, progress: 0, reward: 50, done: false },
                { id: 'play3', desc: 'Play 3 games', target: 3, progress: 0, reward: 20, done: false },
            ];
            this.data.missionsDate = today;
            this.save();
        }
    },
    
    updateMission(id, value) {
        const mission = this.data.missions.find(m => m.id === id);
        if (mission && !mission.done) {
            mission.progress = Math.min(value, mission.target);
            if (mission.progress >= mission.target) {
                mission.done = true;
                this.addCoins(mission.reward);
            }
            this.save();
        }
    },
    
    // ============================================
    // Achievements
    // ============================================
    getAchievementDefs() {
        return [
            { id: 'first_hit', name: 'First Blood', desc: 'Hit your first target', icon: '🎯', check: () => this.data.totalHits >= 1 },
            { id: 'hits_10', name: 'Sharpshooter', desc: 'Hit 10 targets', icon: '🔫', check: () => this.data.totalHits >= 10 },
            { id: 'hits_50', name: 'Marksman', desc: 'Hit 50 targets', icon: '🏹', check: () => this.data.totalHits >= 50 },
            { id: 'hits_100', name: 'Sniper', desc: 'Hit 100 targets', icon: '🎖️', check: () => this.data.totalHits >= 100 },
            { id: 'streak_5', name: 'On Fire', desc: '5 hits in a row', icon: '🔥', check: () => this.data.bestStreak >= 5 },
            { id: 'streak_10', name: 'Unstoppable', desc: '10 hits in a row', icon: '⚡', check: () => this.data.bestStreak >= 10 },
            { id: 'streak_20', name: 'Legendary', desc: '20 hits in a row', icon: '👑', check: () => this.data.bestStreak >= 20 },
            { id: 'level_10', name: 'Getting Started', desc: 'Reach level 10', icon: '📈', check: () => this.data.highestLevel >= 10 },
            { id: 'level_25', name: 'Dedicated', desc: 'Reach level 25', icon: '💪', check: () => this.data.highestLevel >= 25 },
            { id: 'level_50', name: 'Master', desc: 'Reach level 50', icon: '🏆', check: () => this.data.highestLevel >= 50 },
            { id: 'coins_500', name: 'Collector', desc: 'Earn 500 coins total', icon: '💰', check: () => this.data.coins >= 500 },
            { id: 'skin_1', name: 'Fashionista', desc: 'Unlock a skin', icon: '🎨', check: () => this.data.ownedBalls.length > 1 || this.data.ownedCannons.length > 1 },
        ];
    },
    
    checkAchievements() {
        const defs = this.getAchievementDefs();
        let newUnlocks = [];
        defs.forEach(def => {
            if (!this.data.achievements.includes(def.id) && def.check()) {
                this.data.achievements.push(def.id);
                newUnlocks.push(def);
            }
        });
        if (newUnlocks.length > 0) this.save();
        return newUnlocks;
    },
    
    // ============================================
    // Daily Challenge
    // ============================================
    getDailySeed() {
        const today = new Date();
        return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    },
    
    setDailyChallengeScore(score) {
        const today = new Date().toDateString();
        if (this.data.dailyChallengeDate !== today || score > this.data.dailyChallengeScore) {
            this.data.dailyChallengeDate = today;
            this.data.dailyChallengeScore = score;
            this.save();
        }
    },
};

// ============================================
// Haptic Feedback
// ============================================
window.Haptics = {
    enabled: true,
    
    light() {
        if (!this.enabled) return;
        if (navigator.vibrate) navigator.vibrate(10);
    },
    
    medium() {
        if (!this.enabled) return;
        if (navigator.vibrate) navigator.vibrate(25);
    },
    
    heavy() {
        if (!this.enabled) return;
        if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
    },
    
    success() {
        if (!this.enabled) return;
        if (navigator.vibrate) navigator.vibrate([10, 50, 20, 50, 30]);
    }
};

// ============================================
// Seeded Random (for Daily Challenge)
// ============================================
window.SeededRandom = class {
    constructor(seed) {
        this.seed = seed;
    }
    
    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
    
    range(min, max) {
        return min + this.next() * (max - min);
    }
    
    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }
};

// Initialize on load
GameData.load();
