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

        // Exposed for E2E testing only (not as window.game to discourage console manipulation)
        window.__game = gameInstance;
        window.__HandUtils = HandUtils;

        console.log('Blackjack Premium loaded successfully (ES Modules)!');
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
