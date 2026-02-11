import { BlackjackEngine } from './BlackjackEngine.js';
import { CONFIG } from './Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { debounce } from '../utils/debounce.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import * as HandUtils from '../utils/HandUtils.js';
import { supabase } from '../supabaseClient.js';

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

        this.saveGame = debounce(this._saveGameImmediate.bind(this), 1000);

        // Listen for auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
                this.onUserSignIn(session);
            } else if (event === 'SIGNED_OUT') {
                this.onUserSignOut();
            }
        });
    }

    onUserSignIn(session) {
        if (!session || !session.user) return;

        // User is signed in
        const user = session.user;
        this.userId = user.id;
        this.username = user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0];
        this.loadGame();
        this.loadSettings();
        this.updateUI();

        if (this.ui) {
            this.ui.onLoginSuccess();
            this.ui.setAuthLoading(false);
        }
    }

    onUserSignOut() {
        // User is signed out
        this.userId = null;
        this.username = null;

        if (this.ui && this.ui.elements.loginScreen && this.ui.elements.loginScreen.style.display === 'none') {
            window.location.reload();
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

    // Deprecated: login is handled by Firebase auth listener
    login(_username) {
        console.warn('Manual login called, but should use Supabase Auth');
    }

    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            if (this.ui) this.ui.showMessage('Desconectado.', 'info');
        } catch (error) {
            console.error('Logout error', error);
        }
    }

    getStorageKey(key) {
        if (!this.userId) return null;
        return `${key}-${this.userId}`;
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
            theme: 'dark'
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
            settings: this.settings
        };
    }

    startApp() {
        this.events.emit('app:start');
        if (this.ui) {
            this.ui.hideWelcomeScreen();
            this.ui.toggleLoading(true);
            setTimeout(() => {
                this.ui.toggleLoading(false);
                this.updateUI();
            }, CONFIG.DELAYS.LOADING);
        }
    }

    _saveGameImmediate() {
        if (!this.username) return;

        const gameState = {
            version: CONFIG.STORAGE_VERSION,
            balance: this.balance,
            wins: this.wins,
            losses: this.losses,
            blackjacks: this.blackjacks,
            totalWinnings: this.totalWinnings,
            gameStarted: this.engine.gameStarted,
            updatedAt: Date.now()
        };
        StorageManager.set(this.getStorageKey('blackjack-premium-save'), JSON.stringify(gameState));

        // Sync with Supabase
        if (this.userId) {
            this.saveStatsToSupabase();
        }
    }

    async saveStatsToSupabase() {
        if (!this.userId) return;

        try {
            const stats = {
                user_id: this.userId,
                balance: this.balance,
                wins: this.wins,
                losses: this.losses,
                blackjacks: this.blackjacks,
                total_winnings: this.totalWinnings,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('statistics')
                .upsert(stats, { onConflict: 'user_id' });

            if (error) {
                console.error('Error saving stats to Supabase:', error);
            }
        } catch (err) {
            console.error('Unexpected error saving stats:', err);
        }
    }

    migrateData(gameState) {
        if (!gameState.version || gameState.version < CONFIG.STORAGE_VERSION) {
            gameState.version = CONFIG.STORAGE_VERSION;
        }
        return gameState;
    }

    async loadGame() {
        if (!this.username) return;

        let localTimestamp = 0;
        const savedGame = StorageManager.get(this.getStorageKey('blackjack-premium-save'));
        if (savedGame) {
            try {
                let gameState = JSON.parse(savedGame);
                gameState = this.migrateData(gameState);
                this.balance = gameState.balance || 1000;
                this.wins = gameState.wins || 0;
                this.losses = gameState.losses || 0;
                this.blackjacks = gameState.blackjacks || 0;
                this.totalWinnings = gameState.totalWinnings || 0;
                localTimestamp = gameState.updatedAt || 0;

                // Note: We don't restore round state fully yet, just stats/balance
                if (gameState.gameStarted) {
                     // If game was interrupted, ideally we should restore it.
                     // But for now, we just reset the round state (as Engine resets on init)
                }
            } catch {
                console.warn('Could not parse game state');
            }
        }

        this.loadSettings();
        this.updateUI();

        // Sync with Supabase
        if (this.userId) {
            await this.loadStatsFromSupabase(localTimestamp);
        }
    }

    async loadStatsFromSupabase(localTimestamp) {
        if (!this.userId) return;

        try {
            const { data, error } = await supabase
                .from('statistics')
                .select('*')
                .eq('user_id', this.userId)
                .single();

            if (data) {
                const remoteTimestamp = new Date(data.updated_at).getTime();

                // If remote is newer or we have no local timestamp (fresh login/device), use remote
                if (remoteTimestamp > localTimestamp || localTimestamp === 0) {
                    this.balance = Number(data.balance);
                    this.wins = data.wins;
                    this.losses = data.losses;
                    this.blackjacks = data.blackjacks;
                    this.totalWinnings = Number(data.total_winnings);

                    this.updateUI();

                    // Update local storage to match remote without triggering another network save
                    const gameState = {
                        version: CONFIG.STORAGE_VERSION,
                        balance: this.balance,
                        wins: this.wins,
                        losses: this.losses,
                        blackjacks: this.blackjacks,
                        totalWinnings: this.totalWinnings,
                        gameStarted: this.engine.gameStarted,
                        updatedAt: Date.now()
                    };
                    StorageManager.set(this.getStorageKey('blackjack-premium-save'), JSON.stringify(gameState));
                } else if (localTimestamp > remoteTimestamp) {
                    // Local is newer, push to remote
                    this.saveStatsToSupabase();
                }
            } else if (error && error.code === 'PGRST116') {
                 // No remote stats found, create them from local state
                 this.saveStatsToSupabase();
            } else if (error) {
                console.error('Error fetching stats:', error);
            }
        } catch (err) {
            console.error('Unexpected error loading stats:', err);
        }
    }

    saveSettings() {
        if (!this.username) return;
        StorageManager.set(this.getStorageKey('blackjack-premium-settings'), JSON.stringify(this.settings));
    }

    loadSettings() {
        if (!this.username) return;

        const savedSettings = StorageManager.get(this.getStorageKey('blackjack-premium-settings'));
        if (savedSettings) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
                if (this.soundManager) {
                    this.soundManager.setEnabled(this.settings.soundEnabled);
                    this.soundManager.setVolume(this.settings.volume);
                }
                if (this.ui) {
                    this.ui.setAnimationsEnabled(this.settings.animationsEnabled);
                    this.ui.setStatsVisibility(this.settings.showStats);
                    this.ui.setVolume(this.settings.volume);
                    if (this.settings.theme) this.ui.setTheme(this.settings.theme);
                }
            } catch {
                console.warn('Could not parse settings');
            }
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
        const newBet = Math.max(10, Math.min(this.balance, this.currentBet + amount));
        this.currentBet = newBet;
        if (this.soundManager) this.soundManager.play('chip');
        this.updateUI();
    }

    setBet(amount) {
        if (amount <= this.balance) {
             this.currentBet = Math.max(10, amount);
             if (this.soundManager) this.soundManager.play('chip');
             this.updateUI();
        }
    }

    multiplyBet(factor) {
        const newBet = Math.max(10, Math.min(this.balance, Math.floor(this.currentBet * factor)));
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
        if (this.currentBet < 10 || this.currentBet > this.balance) {
            if (this.ui) this.ui.showMessage('Aposta inválida!', 'lose');
            if (this.soundManager) this.soundManager.play('lose');
            return;
        }

        this.balance -= this.currentBet;

        if (this.engine.deck.needsReshuffle) {
             this.events.emit('deck:shuffle');
             if (this.ui) {
                 this.ui.showMessage('Embaralhando...', '');
                 this.ui.showToast('Sapato reembaralhado', 'info', 2000);
             }
             // Engine handles shuffle in startGame
        }

        const { dealerHand } = this.engine.startGame(this.currentBet);

        this.updateUI();
        if (this.soundManager) this.soundManager.play('card');
        this.events.emit('game:started', this.getState());

        if (this.ui) {
            this.ui.toggleGameControls(false);
            this.ui.showMessage('Boa sorte!');
        }

        const dealerUpCard = dealerHand[0];
        const dealerUpVal = HandUtils.getCardNumericValue(dealerUpCard);

        if (dealerUpCard.value === 'A') {
             setTimeout(() => {
                 if (this.ui) this.ui.toggleInsuranceModal(true);
             }, CONFIG.DELAYS.INSURANCE_MODAL);
        } else if (dealerUpVal === 10) {
             this.addTimeout(() => this.checkDealerBlackjack(), CONFIG.DELAYS.DEAL);
        } else {
             this.addTimeout(() => this.startPlayerTurn(), CONFIG.DELAYS.DEAL);
        }
    }

    startPlayerTurn() {
        if (this.ui) {
            this.ui.toggleGameControls(true);
            this.ui.showMessage('Sua vez!');
        }
        this.updateUI();

        const pVal = HandUtils.calculateHandValue(this.engine.playerHands[0].cards);
        if (pVal === 21) {
             this.addTimeout(() => this.endGame(), CONFIG.DELAYS.TURN);
        }
    }

    checkDealerBlackjack() {
        const val = HandUtils.calculateHandValue(this.engine.dealerHand);
        if (val === 21 && this.engine.dealerHand.length === 2) {
             this.engine.dealerRevealed = true;
             this.updateUI();
             if (this.ui) this.ui.showMessage('Dealer tem Blackjack!', 'lose');
             this.addTimeout(() => this.endGame(), CONFIG.DELAYS.GAME_OVER);
        } else {
             if (this.ui) this.ui.showMessage('Dealer não tem Blackjack.', '');
             this.addTimeout(() => this.startPlayerTurn(), CONFIG.DELAYS.TURN);
        }
    }

    respondToInsurance(accept) {
        if (this.ui) this.ui.toggleInsuranceModal(false);

        if (accept) {
            const insuranceCost = Math.floor(this.currentBet / 2);
            if (this.balance >= insuranceCost) {
                this.balance -= insuranceCost;
                this.engine.insuranceTaken = true;
                if (this.ui) this.ui.showMessage('Seguro apostado.', '');
                if (this.soundManager) this.soundManager.play('chip');
            } else {
                if (this.ui) this.ui.showMessage('Saldo insuficiente para seguro.', 'lose');
            }
        } else {
            if (this.ui) this.ui.showMessage('Seguro recusado.', '');
        }

        this.updateUI();
        this.addTimeout(() => this.checkDealerBlackjack(), CONFIG.DELAYS.TURN);
    }

    hit() {
        if (this.engine.gameOver) return;

        const result = this.engine.hit(this.engine.currentHandIndex);
        if (!result) return;
        const { hand } = result;

        if (this.soundManager) this.soundManager.play('card');
        this.events.emit('player:hit', { handIndex: this.engine.currentHandIndex, hand });
        this.updateUI();

        if (hand.status === 'busted') {
            this.events.emit('hand:bust', { handIndex: this.engine.currentHandIndex });
            if (this.ui) this.ui.showMessage('Estourou!', 'lose');
            this.addTimeout(() => this.nextHand(), CONFIG.DELAYS.NEXT_HAND);
        }
    }

    stand() {
        if (this.engine.gameOver) return;
        this.engine.stand(this.engine.currentHandIndex);
        this.events.emit('player:stand', { handIndex: this.engine.currentHandIndex });
        this.nextHand();
    }

    double() {
        if (this.engine.gameOver) return;
        const hand = this.engine.playerHands[this.engine.currentHandIndex];

        if (this.balance < hand.bet) return;
        this.balance -= hand.bet;

        const result = this.engine.double(this.engine.currentHandIndex);
        if (!result) {
            this.balance += hand.bet;
            return;
        }

        if (this.soundManager) this.soundManager.play('card');

        if (result.hand.status === 'busted') {
            if (this.ui) this.ui.showMessage('Estourou!', 'lose');
        }

        this.updateUI();
        this.addTimeout(() => this.nextHand(), CONFIG.DELAYS.NEXT_HAND);
    }

    split() {
        if (this.engine.playerHands.length === 0) return;
        const currentHand = this.engine.playerHands[this.engine.currentHandIndex];

        if (this.balance < currentHand.bet || this.engine.playerHands.length > CONFIG.MAX_SPLITS) {
            return;
        }

        const initialBet = currentHand.bet;
        this.balance -= initialBet;

        const result = this.engine.split(this.engine.currentHandIndex);
        if (!result) {
            this.balance += initialBet;
            return;
        }

        if (this.soundManager) this.soundManager.play('card');
        this.events.emit('player:split', { handIndex: this.engine.currentHandIndex, isSplittingAces: result.isSplittingAces });

        if (result.isSplittingAces) {
            this.updateUI();
            this.addTimeout(() => this.nextHand(), CONFIG.DELAYS.NEXT_HAND);
        } else {
            this.updateUI();
        }
    }

    surrender() {
        if (this.engine.gameOver || this.engine.playerHands.length === 0) return;

        const result = this.engine.surrender(this.engine.currentHandIndex);
        if (!result) return;

        if (this.soundManager) this.soundManager.play('chip');

        // Payout is handled in endGame based on engine result
        // But we want immediate visual feedback in UI if possible?
        // UI uses status 'surrender'.

        if (this.ui) this.ui.showMessage('Você desistiu.', 'tie');
        this.endGame();
    }

    nextHand() {
        if (this.engine.currentHandIndex < this.engine.playerHands.length - 1) {
            this.engine.currentHandIndex++;
            this.updateUI();
        } else {
            this.playDealer();
        }
    }

    playDealer() {
        const allBusted = this.engine.playerHands.every(h => h.status === 'busted');
        if (allBusted) {
             this.endGame();
             return;
        }

        this.engine.dealerRevealed = true;
        this.events.emit('dealer:turn');
        this.updateUI();

        const dealerTurnStep = () => {
             if (this.engine.dealerShouldHit()) {
                 this.engine.dealerHit();
                 if (this.soundManager) this.soundManager.play('card');
                 this.updateUI();
                 this.addTimeout(dealerTurnStep, CONFIG.DELAYS.DEALER_TURN);
             } else {
                 this.addTimeout(() => this.endGame(), CONFIG.DELAYS.NEXT_HAND);
             }
        };

        this.addTimeout(dealerTurnStep, CONFIG.DELAYS.DEALER_TURN);
    }

    endGame() {
        this.engine.gameOver = true;
        this.engine.dealerRevealed = true;
        this.events.emit('game:ending');

        const { dealerValue, dealerBJ, results } = this.engine.evaluateResults();

        if (this.engine.insuranceTaken && dealerBJ) {
            const insuranceWin = Math.floor(this.currentBet / 2) * CONFIG.PAYOUT.INSURANCE;
            this.balance += insuranceWin;
            this.totalWinnings += (insuranceWin - Math.floor(this.currentBet / 2));
            if (this.ui) this.ui.showMessage('Seguro paga 2:1!', 'win');
        }

        let totalWin = 0;
        let anyWin = false;
        let allLost = true;

        results.forEach(({ hand, result, payout }) => {
            if (HandUtils.isNaturalBlackjack(hand.cards, this.engine.playerHands.length) && result === 'win') {
                 this.blackjacks++;
            }

            if (result === 'win') {
                this.wins++;
                anyWin = true;
            } else if (result === 'lose' || result === 'surrender') {
                this.losses++;
            }

            totalWin += payout;

            if (result !== 'lose') allLost = false;
        });

        this.balance += totalWin;

        const totalBetOnHands = this.engine.playerHands.reduce((sum, h) => sum + h.bet, 0);
        this.totalWinnings += (totalWin - totalBetOnHands);

        // Determine message
        let message = '';
        let messageClass = '';
        if (this.engine.playerHands.length === 1) {
             const hand = this.engine.playerHands[0];
             const pVal = HandUtils.calculateHandValue(hand.cards);
             if (hand.status === 'surrender') { message = 'Você desistiu.'; messageClass = 'tie'; }
             else if (hand.status === 'busted') { message = 'Você estourou! Dealer vence!'; messageClass = 'lose'; }
             else if (dealerValue > 21) { message = 'Dealer estourou! Você venceu!'; messageClass = 'win'; }
             else if (pVal > dealerValue) {
                 if (totalWin > hand.bet * 2) message = 'BLACKJACK! Você venceu!';
                 else message = 'Você venceu!';
                 messageClass = 'win';
             }
             else if (dealerValue > pVal) { message = 'Dealer vence!'; messageClass = 'lose'; }
             else { message = 'Empate!'; messageClass = 'tie'; }
        } else {
             if (totalWin > 0) {
                 message = `Ganhou $${totalWin}!`;
                 messageClass = 'win';
             } else {
                 message = 'Dealer venceu todas!';
                 messageClass = 'lose';
             }
        }

        if (anyWin) {
            if (this.soundManager) this.soundManager.play('win');
            if (this.ui) this.ui.showWinAnimation(totalWin);
        } else if (allLost) {
            if (this.soundManager) this.soundManager.play('lose');
        }

        if (this.ui) {
            this.ui.showMessage(message, messageClass);
            this.ui.showNewGameButton();
            this.ui.toggleGameControls(false);
        }

        this.updateUI();

        if (this.balance < 10) {
            setTimeout(() => {
                this.resetGame();
            }, CONFIG.DELAYS.RESET);
        }

        this.events.emit('game:over', { message, messageClass, totalWin, anyWin, allLost });
        if (this.settings.autoSave) this.saveGame();
    }

    // resetGame, newGame, exportData, importData, updateSetting match original structure but use engine

    resetGame() {
        this.balance = CONFIG.INITIAL_BALANCE;
        this.wins = 0;
        this.losses = 0;
        this.blackjacks = 0;
        this.totalWinnings = 0;
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
        this.engine.resetState();
        if (this.currentBet > this.balance) {
            this.currentBet = Math.max(10, this.balance);
        }

        if (this.ui) {
            this.ui.toggleGameControls(false);
            this.ui.showMessage('Escolha sua aposta!');
        }
        this.updateUI();
    }

    rebetAndDeal() {
        this.engine.resetState();
        if (this.currentBet > this.balance) {
            this.currentBet = Math.max(10, this.balance);
        }
        // Immediately start game with current bet
        this.startGame();
    }

    exportData() {
        if (!this.username) return;
        const data = {
            username: this.username,
            version: 1,
            exportedAt: new Date().toISOString(),
            gameState: {
                balance: this.balance,
                wins: this.wins,
                losses: this.losses,
                blackjacks: this.blackjacks,
                totalWinnings: this.totalWinnings
            },
            settings: this.settings
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
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.gameState || !data.version) {
                    if (this.ui) this.ui.showError('Arquivo inválido.');
                    return;
                }
                const gs = data.gameState;
                this.balance = gs.balance || CONFIG.INITIAL_BALANCE;
                this.wins = gs.wins || 0;
                this.losses = gs.losses || 0;
                this.blackjacks = gs.blackjacks || 0;
                this.totalWinnings = gs.totalWinnings || 0;
                if (data.settings) {
                    this.settings = { ...this.settings, ...data.settings };
                    this.loadSettings();
                }
                this.newGame();
                this.saveGame();
                if (this.ui) this.ui.showMessage('Dados importados!', 'win');
            } catch {
                if (this.ui) this.ui.showError('Erro ao importar dados.');
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
            this.saveSettings();
        }
    }
}
