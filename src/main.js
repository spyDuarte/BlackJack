import { UIManager } from './ui/UIManager.js';
import { GameManager } from './core/GameManager.js';
import { SoundManager } from './utils/SoundManager.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        const soundManager = new SoundManager();
        const ui = new UIManager();

        // Singleton pattern used here as requested
        const game = GameManager.getInstance(ui, soundManager);

        // Initialize UI with Game instance (to bind events)
        ui.initialize(game);

        // Expose to window for debugging/legacy support if needed
        window.game = game;

        console.log('Blackjack Premium loaded successfully (ES Modules)!');
    } catch (e) {
        console.error('Critical initialization error:', e);
    }
});

window.addEventListener('error', function(e) {
    console.warn('JavaScript Error:', e.error);
    // Try to recover UI if possible
    if (window.game && window.game.ui) {
        window.game.ui.showError('Erro detectado. O jogo continuará funcionando.');
    }
});
