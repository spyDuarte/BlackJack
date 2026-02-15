import { BlackjackEngine } from './BlackjackEngine.js';
import { ARCHITECTURE_FLAGS, CONFIG, RULES, getActiveRuleProfile } from './Constants.js';
import { debounce } from '../utils/debounce.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { supabase } from '../supabaseClient.js';
import { AuthService } from './services/AuthService.js';
import { PersistenceService } from './services/PersistenceService.js';
import { RoundController } from './services/RoundController.js';
import { HandHistory } from '../utils/HandHistory.js';
import { evaluatePlayerAction } from '../utils/BasicStrategy.js';
import { computeAdvancedStats } from '../utils/AdvancedStats.js';
import { validateImportedGameData, mapImportErrorToUiMessage } from '../utils/importValidation.js';

export class GameManager {
    static instance = null;

    static getInstance(ui, soundManager) {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager(ui, soundManager);
        }
        return GameManager.instance;
    }

    constructor(ui, soundManager) {
        if (GameManager.instance) return GameManager.instance;

        this.events = new EventEmitter();
        this.ui = ui;
        this.soundManager = soundManager;

        this.engine = new BlackjackEngine();
        this.username = null;
        this.userId = null; // Store User UID

        this.initializeGameState();
        this.initializeSettings();

        // Timeouts management
        this.timeouts = [];

        this.authService = new AuthService(this, supabase);
        this.persistenceService = new PersistenceService(this, supabase);
        this.roundController = new RoundController(this);

        this.saveGame = debounce(this._saveGameImmediate.bind(this), 1000);
        this.authService.setupAuthListener();
    }

    onUserSignIn(session) {
        if (ARCHITECTURE_FLAGS.enableAuthService) {
            this.authService.onUserSignIn(session);
        }
    }

    onUserSignOut() {
        if (ARCHITECTURE_FLAGS.enableAuthService) {
            this.authService.onUserSignOut();
        }
    }

    // Proxy properties to engine for backward compatibility and test support
    get playerHands() { return this.engine.playerHands; }
    set playerHands(v) { this.engine.playerHands = v; }

    get dealerHand() { return this.engine.dealerHand; }
    set dealerHand(v) { this.engine.dealerHand = v; }

    get currentHandIndex() { return this.engine.currentHandIndex; }
    set currentHandIndex(v) { this.engine.currentHandIndex = v; }

    get dealerRevealed() { return this.engine.dealerRevealed; }
    set dealerRevealed(v) { this.engine.dealerRevealed = v; }

    get gameStarted() { return this.engine.gameStarted; }
    set gameStarted(v) { this.engine.gameStarted = v; }

    get gameOver() { return this.engine.gameOver; }
    set gameOver(v) { this.engine.gameOver = v; }

    get insuranceTaken() { return this.engine.insuranceTaken; }
    set insuranceTaken(v) { this.engine.insuranceTaken = v; }

    get deck() { return this.engine.deck; }
    set deck(v) { this.engine.deck = v; }

    async logout() {
        if (ARCHITECTURE_FLAGS.enableAuthService) {
            return this.authService.logout();
        }
    }

    getStorageKey(key) {
        return `${key}-${this.userId || 'guest'}`;
    }

    addTimeout(fn, delay) {
        const id = setTimeout(fn, delay);
        this.timeouts.push(id);
        return id;
    }

    clearTimeouts() {
        this.timeouts.forEach(id => clearTimeout(id));
        this.timeouts = [];
    }

    initializeGameState() {
        this.balance = CONFIG.INITIAL_BALANCE;
        this.currentBet = 50;
        this.wins = 0;
        this.losses = 0;
        this.blackjacks = 0;
        this.totalWinnings = 0;

        // Advanced stats tracking
        this.totalAmountWagered = 0;
        this.sessionBestBalance = CONFIG.INITIAL_BALANCE;
        this.sessionWorstBalance = CONFIG.INITIAL_BALANCE;

        // Hand history
        this.handHistory = new HandHistory(
            CONFIG.HAND_HISTORY_MAX_ENTRIES,
            (message, level = 'error') => {
                if (this.ui) this.ui.showToast(message, level);
            }
        );
        this.handCounter = 0;

        // Training mode state
        this.trainingMode = false;
        this.currentHandActions = [];

        this.engine.resetState();
        this.timeouts = [];
    }

    initializeSettings() {
        this.settings = {
            soundEnabled: true,
            animationsEnabled: true,
            autoSave: true,
            showStats: false,
            volume: 0.5,
            theme: 'dark',
            trainingMode: false,
        };
    }

    getState() {
        const engineState = this.engine.getState();
        return {
            balance: this.balance,
            currentBet: this.currentBet,
            wins: this.wins,
            losses: this.losses,
            blackjacks: this.blackjacks,
            totalWinnings: this.totalWinnings,
            playerHands: engineState.playerHands,
            currentHandIndex: engineState.currentHandIndex,
            dealerHand: engineState.dealerHand,
            dealerRevealed: engineState.dealerRevealed,
            gameOver: engineState.gameOver,
            gameStarted: engineState.gameStarted,
            settings: this.settings,
            activeRuleProfile: RULES.ACTIVE_PROFILE,
            trainingMode: this.trainingMode,
            handHistoryCount: this.handHistory.entries.length,
        };
    }

    startApp() {
        this.events.emit('app:start');
        if (this.ui) {
            this.ui.hideWelcomeScreen();
            this.ui.toggleLoading(true);
            this.addTimeout(() => {
                this.ui.toggleLoading(false);
                this.updateUI();
            }, CONFIG.DELAYS.LOADING);
        }
    }

    _saveGameImmediate() {
        if (ARCHITECTURE_FLAGS.enablePersistenceService) {
            return this.persistenceService._saveGameImmediate();
        }
    }

    async saveStatsToSupabase() {
        if (ARCHITECTURE_FLAGS.enablePersistenceService) {
            return this.persistenceService.saveStatsToSupabase();
        }
    }

    migrateData(gameState) {
        if (ARCHITECTURE_FLAGS.enablePersistenceService) {
            return this.persistenceService.migrateData(gameState);
        }
        return gameState;
    }

    async loadGame() {
        if (ARCHITECTURE_FLAGS.enablePersistenceService) {
            return this.persistenceService.loadGame();
        }
    }

    async loadStatsFromSupabase(localTimestamp) {
        if (ARCHITECTURE_FLAGS.enablePersistenceService) {
            return this.persistenceService.loadStatsFromSupabase(localTimestamp);
        }
    }

    saveSettings() {
        if (ARCHITECTURE_FLAGS.enablePersistenceService) {
            return this.persistenceService.saveSettings();
        }
    }

    loadSettings() {
        if (ARCHITECTURE_FLAGS.enablePersistenceService) {
            return this.persistenceService.loadSettings();
        }
    }

    updateUI() {
        if (this.ui) {
            this.ui.render(this.getState());
            const state = this.engine.getState();
            this.ui.updateShoeIndicator(state.remainingCards, state.totalCards);
        }
    }

    // Game Actions

    adjustBet(amount) {
        const newBet = Math.max(CONFIG.MIN_BET, Math.min(this.balance, this.currentBet + amount));
        this.currentBet = newBet;
        if (this.soundManager) this.soundManager.play('chip');
        this.updateUI();
    }

    setBet(amount) {
        if (amount < CONFIG.MIN_BET || amount > this.balance) return;
        this.currentBet = amount;
        if (this.soundManager) this.soundManager.play('chip');
        this.updateUI();
    }

    multiplyBet(factor) {
        const newBet = Math.max(CONFIG.MIN_BET, Math.min(this.balance, Math.floor(this.currentBet * factor)));
        this.currentBet = newBet;
        if (this.soundManager) this.soundManager.play('chip');
        this.updateUI();
    }

    maxBet() {
        this.currentBet = this.balance;
        if (this.soundManager) this.soundManager.play('chip');
        this.updateUI();
    }

    startGame() {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.startGame();
        }
    }

    startPlayerTurn() {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.startPlayerTurn();
        }
    }

    checkDealerBlackjack() {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.checkDealerBlackjack();
        }
    }

    respondToInsurance(accept) {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.respondToInsurance(accept);
        }
    }

    hit() {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.hit();
        }
    }

    stand() {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.stand();
        }
    }

    canDouble(handIndex = this.engine.currentHandIndex) {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.canDouble(handIndex);
        }
        return false;
    }

    double() {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.double();
        }
    }

    split() {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.split();
        }
    }

    surrender() {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.surrender();
        }
    }

    nextHand() {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.nextHand();
        }
    }

    playDealer() {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.playDealer();
        }
    }

    endGame() {
        if (ARCHITECTURE_FLAGS.enableRoundController) {
            return this.roundController.endGame();
        }
    }

    // ---- Training and advanced stats methods ----

    /**
     * Enables or disables training mode.
     * @param {boolean} enabled
     */
    toggleTrainingMode(enabled) {
        this.trainingMode = !!enabled;
        this.settings.trainingMode = this.trainingMode;
    }

    /**
     * Returns advanced statistics computed from hand history.
     * @returns {Object}
     */
    getAdvancedStats() {
        return computeAdvancedStats(this.handHistory.getHistory(), {
            wins: this.wins,
            losses: this.losses,
            blackjacks: this.blackjacks,
            totalWinnings: this.totalWinnings,
            balance: this.balance,
            totalAmountWagered: this.totalAmountWagered,
            sessionBestBalance: this.sessionBestBalance,
            sessionWorstBalance: this.sessionWorstBalance,
        });
    }

    /**
     * Evaluates the current player action against basic strategy and emits training:feedback.
     * Called internally before executing each action in training mode.
     * @param {string} action
     */
    _evaluateTrainingAction(action) {
        const hand = this.engine.playerHands[this.engine.currentHandIndex];
        if (!hand || hand.status !== 'playing') return;
        const dealerUpCard = this.engine.dealerHand[0];
        if (!dealerUpCard) return;
        const profile = getActiveRuleProfile();
        const canSplit = this.engine.playerHands.length <= CONFIG.MAX_SPLITS && hand.cards.length === 2;
        const evaluation = evaluatePlayerAction(action, hand.cards, dealerUpCard, profile, canSplit);
        this.events.emit('training:feedback', { evaluation, action });
    }

    // resetGame, newGame, exportData, importData, updateSetting match original structure but use engine

    resetGame() {
        this.clearTimeouts();
        this.balance = CONFIG.INITIAL_BALANCE;
        this.wins = 0;
        this.losses = 0;
        this.blackjacks = 0;
        this.totalWinnings = 0;
        this.totalAmountWagered = 0;
        this.sessionBestBalance = CONFIG.INITIAL_BALANCE;
        this.sessionWorstBalance = CONFIG.INITIAL_BALANCE;
        this.handHistory = new HandHistory(
            CONFIG.HAND_HISTORY_MAX_ENTRIES,
            (message, level = 'error') => {
                if (this.ui) this.ui.showToast(message, level);
            }
        );
        this.handCounter = 0;
        // Reset the shoe (deck)
        if (this.engine && this.engine.deck) {
            this.engine.deck.reset();
        }
        this.newGame();
        if (this.ui) {
            this.ui.showMessage('Jogo reiniciado!', 'win');
            this.ui.showToast('Jogo reiniciado com sucesso', 'success');
        }
        this.saveGame();
    }

    newGame() {
        this.clearTimeouts();
        this.engine.resetState();
        if (this.currentBet > this.balance) {
            this.currentBet = Math.max(CONFIG.MIN_BET, this.balance);
        }

        if (this.ui) {
            this.ui.toggleGameControls(false);
            this.ui.showMessage('Escolha sua aposta!');
        }
        this.updateUI();
    }

    rebetAndDeal() {
        this.clearTimeouts();
        this.engine.resetState();
        if (this.currentBet > this.balance) {
            this.currentBet = Math.max(CONFIG.MIN_BET, this.balance);
        }
        // Immediately start game with current bet
        this.startGame();
    }

    exportData() {
        if (!this.userId) return;
        const data = {
            username: this.username,
            version: CONFIG.STORAGE_VERSION,
            exportedAt: new Date().toISOString(),
            gameState: {
                balance: this.balance,
                wins: this.wins,
                losses: this.losses,
                blackjacks: this.blackjacks,
                totalWinnings: this.totalWinnings
            },
            settings: this.settings,
            activeRuleProfile: RULES.ACTIVE_PROFILE
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blackjack-${this.username}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(file) {
        const MAX_IMPORT_SIZE = 1024 * 100; // 100KB limit
        if (file.size > MAX_IMPORT_SIZE) {
            if (this.ui) this.ui.showError('Arquivo muito grande. Máximo 100KB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsedData = JSON.parse(e.target.result);
                const data = validateImportedGameData(parsedData);
                const gs = data.gameState;

                this.balance = gs.balance;
                this.wins = gs.wins ?? 0;
                this.losses = gs.losses ?? 0;
                this.blackjacks = gs.blackjacks ?? 0;
                this.totalWinnings = gs.totalWinnings ?? 0;
                this.totalAmountWagered = gs.totalAmountWagered ?? 0;
                this.sessionBestBalance = gs.sessionBestBalance ?? this.balance;
                this.sessionWorstBalance = gs.sessionWorstBalance ?? this.balance;
                this.handCounter = gs.handCounter ?? 0;

                this.settings = { ...this.settings, ...data.settings };
                if (this.soundManager) {
                    this.soundManager.setEnabled(this.settings.soundEnabled);
                    this.soundManager.setVolume(this.settings.volume);
                }
                if (this.ui) {
                    this.ui.setAnimationsEnabled(this.settings.animationsEnabled);
                    this.ui.setStatsVisibility(this.settings.showStats);
                    this.ui.setVolume(this.settings.volume);
                    this.ui.setTheme(this.settings.theme);
                }
                this.trainingMode = !!this.settings.trainingMode;

                this.newGame();
                this.saveGame();
                if (this.ui) this.ui.showMessage('Dados importados!', 'win');
            } catch (error) {
                if (this.ui) this.ui.showError(mapImportErrorToUiMessage(error));
            }
        };
        reader.readAsText(file);
    }

    updateSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value;
            if (key === 'soundEnabled' && this.soundManager) {
                this.soundManager.setEnabled(value);
            }
            if (key === 'volume' && this.soundManager) {
                this.soundManager.setVolume(value);
            }
            if (this.ui) {
                if (key === 'animationsEnabled') this.ui.setAnimationsEnabled(value);
                if (key === 'showStats') this.ui.setStatsVisibility(value);
                if (key === 'theme') this.ui.setTheme(value);
            }
            if (key === 'trainingMode') this.trainingMode = !!value;
            this.saveSettings();
        }
    }
}
