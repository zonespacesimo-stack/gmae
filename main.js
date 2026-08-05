/**
 * main.js - Game Entry Point
 * Phaser 3 configuration, scene registration, and boot sequence
 */

(function() {
    var loadingFill = document.getElementById('loading-fill');
    var loadingScreen = document.getElementById('loading-screen');
    
    // Animate loading bar
    var progress = 0;
    var loadInterval = setInterval(function() {
        progress += 25;
        if (loadingFill) loadingFill.style.width = Math.min(progress, 100) + '%';
        if (progress >= 100) {
            clearInterval(loadInterval);
            onLoadComplete();
        }
    }, 50);
    
    function onLoadComplete() {
        // Hide loading screen
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.pointerEvents = 'none';
            setTimeout(function() {
                loadingScreen.style.display = 'none';
            }, 500);
        }
        
        // Initialize Phaser
        initPhaser();
        
        // Initialize UI after a brief moment
        setTimeout(function() {
            if (window.UI) {
                window.UI.init();
            }
        }, 100);
    }
    
    function initPhaser() {
        if (typeof Phaser === 'undefined') {
            console.error('Phaser not loaded!');
            // Still show UI even without Phaser
            return;
        }
        
        var config = {
            type: Phaser.AUTO,
            parent: 'game-container',
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: '#0a0a1a',
            transparent: false,
            physics: {
                default: 'matter',
                matter: {
                    gravity: { x: 0, y: 0.8 },
                    debug: false,
                    enableSleeping: false
                }
            },
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            scene: [],
            render: {
                antialias: true,
                pixelArt: false,
                roundPixels: false
            },
            fps: {
                target: 60,
                forceSetTimeOut: false
            },
            input: {
                activePointers: 1
            }
        };
        
        window.game = new Phaser.Game(config);
        window.game.scene.add('GameScene', window.GameScene, false);
    }
    
    // Track session duration
    window.addEventListener('beforeunload', function() {
        if (window.GameData) {
            var duration = Math.floor((Date.now() - window.GameData.sessionStart) / 1000);
            if (window.Analytics) window.Analytics.sessionDuration(duration);
            window.GameData.save();
        }
    });
    
    // Handle resize
    window.addEventListener('resize', function() {
        if (window.game) {
            window.game.scale.resize(window.innerWidth, window.innerHeight);
        }
    });
    
    // Prevent context menu
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
})();
