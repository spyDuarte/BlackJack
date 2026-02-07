import { UIManager } from './ui/UIManager.js';
import { GameManager } from './core/GameManager.js';
import { SoundManager } from './utils/SoundManager.js';
import * as HandUtils from './utils/HandUtils.js';

let gameInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    try {
        const soundManager = new SoundManager();
        const ui = new UIManager();

        // Singleton pattern used here as requested
        gameInstance = GameManager.getInstance(ui, soundManager);

        // Initialize UI with Game instance (to bind events)
        ui.initialize(gameInstance);

        // Wire EventEmitter events to UI
        gameInstance.events.on('deck:shuffle', () => ui.showShuffleAnimation());

        // Expose for E2E testing only in development (location.hostname check)
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            window.__game = gameInstance;
            window.__HandUtils = HandUtils;
        }
    } catch (e) {
        console.error('Critical initialization error:', e);
    }
});

window.addEventListener('error', function(e) {
    console.warn('JavaScript Error:', e.error);
    // Try to recover UI if possible
    if (gameInstance && gameInstance.ui) {
        gameInstance.ui.showError('Erro detectado. O jogo continuará funcionando.');
    }
});
