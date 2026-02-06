import { Deck } from './Deck.js';
import { CONFIG } from './Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { debounce } from '../utils/debounce.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import * as HandUtils from '../utils/HandUtils.js';

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
        this.deck = new Deck();
        this.username = null;

        this.initializeGameState();
        this.initializeSettings();

        // Timeouts management
        this.timeouts = [];

        this.saveGame = debounce(this._saveGameImmediate.bind(this), 1000);
    }

    login(username) {
        this.username = username;
        this.loadGame();
        this.loadSettings();
        this.updateUI();
    }

    getStorageKey(key) {
        if (!this.username) return null;
        return `${key}-${this.username}`;
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
        this.playerHands = [];
        this.currentHandIndex = 0;
        this.dealerHand = [];
        this.balance = CONFIG.INITIAL_BALANCE;
        this.currentBet = 50; // Default bet
        this.wins = 0;
        this.losses = 0;
        this.blackjacks = 0;
        this.totalWinnings = 0;
        this.gameOver = false;
        this.dealerRevealed = false;
        this.gameStarted = false;
        this.insuranceTaken = false;
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
        return {
            balance: this.balance,
            currentBet: this.currentBet,
            wins: this.wins,
            losses: this.losses,
            blackjacks: this.blackjacks,
            totalWinnings: this.totalWinnings,
            playerHands: this.playerHands,
            currentHandIndex: this.currentHandIndex,
            dealerHand: this.dealerHand,
            dealerRevealed: this.dealerRevealed,
            gameOver: this.gameOver,
            gameStarted: this.gameStarted,
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
            gameStarted: this.gameStarted
        };
        StorageManager.set(this.getStorageKey('blackjack-premium-save'), JSON.stringify(gameState));
    }

    migrateData(gameState) {
        // Version 1 or unversioned: no migration needed, just mark with current version
        if (!gameState.version || gameState.version < CONFIG.STORAGE_VERSION) {
            gameState.version = CONFIG.STORAGE_VERSION;
        }
        return gameState;
    }

    loadGame() {
        if (!this.username) return;

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
                this.gameStarted = gameState.gameStarted || false;
            } catch (e) {
                console.warn('Could not parse game state');
            }
        }
        this.loadSettings();
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
            } catch (e) {
                console.warn('Could not parse settings');
            }
        }
    }

    updateUI() {
        if (this.ui) {
            this.ui.render(this.getState());
            this.ui.updateShoeIndicator(this.deck.remainingCards, this.deck.totalCards);
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
        this.gameOver = false;
        this.dealerRevealed = false;
        this.gameStarted = true;

        // Cut card mechanic: reshuffle at start of round if cut card was reached
        if (this.deck.needsReshuffle) {
             this.events.emit('deck:shuffle');
             if (this.ui) {
                 this.ui.showMessage('Embaralhando...', '');
                 this.ui.showToast('Sapato reembaralhado', 'info', 2000);
             }
             this.deck.reset();
             this.deck.shuffle();
        }

        this.playerHands = [{
            cards: [this.deck.draw(), this.deck.draw()],
            bet: this.currentBet,
            status: 'playing'
        }];
        this.currentHandIndex = 0;
        this.dealerHand = [this.deck.draw(), this.deck.draw()];

        this.updateUI();
        if (this.soundManager) this.soundManager.play('card');
        this.events.emit('game:started', this.getState());

        if (this.ui) {
            this.ui.toggleGameControls(false); // Controls hidden until turn starts
            this.ui.showMessage('Boa sorte!');
        }

        const dealerUpCard = this.dealerHand[0];
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

        const pVal = HandUtils.calculateHandValue(this.playerHands[0].cards);
        if (pVal === 21) {
             this.addTimeout(() => this.endGame(), CONFIG.DELAYS.TURN);
        }
    }

    checkDealerBlackjack() {
        const val = HandUtils.calculateHandValue(this.dealerHand);
        if (val === 21 && this.dealerHand.length === 2) {
             this.dealerRevealed = true;
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
                this.insuranceTaken = true;
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
        if (this.gameOver) return;

        const hand = this.playerHands[this.currentHandIndex];
        hand.cards.push(this.deck.draw());
        if (this.soundManager) this.soundManager.play('card');
        this.events.emit('player:hit', { handIndex: this.currentHandIndex, hand });
        this.updateUI();

        if (HandUtils.calculateHandValue(hand.cards) > 21) {
            hand.status = 'busted';
            this.events.emit('hand:bust', { handIndex: this.currentHandIndex });
            if (this.ui) this.ui.showMessage('Estourou!', 'lose');
            this.addTimeout(() => this.nextHand(), CONFIG.DELAYS.NEXT_HAND);
        }
    }

    stand() {
        if (this.gameOver) return;
        const hand = this.playerHands[this.currentHandIndex];
        hand.status = 'stand';
        this.events.emit('player:stand', { handIndex: this.currentHandIndex });
        this.nextHand();
    }

    double() {
        if (this.gameOver) return;

        const hand = this.playerHands[this.currentHandIndex];
        if (this.balance < hand.bet) return;

        this.balance -= hand.bet;
        hand.bet *= 2;

        hand.cards.push(this.deck.draw());
        if (this.soundManager) this.soundManager.play('card');

        const value = HandUtils.calculateHandValue(hand.cards);

        if (value > 21) {
            hand.status = 'busted';
            if (this.ui) this.ui.showMessage('Estourou!', 'lose');
            this.addTimeout(() => this.nextHand(), CONFIG.DELAYS.NEXT_HAND);
        } else {
            hand.status = 'stand';
            this.addTimeout(() => this.nextHand(), CONFIG.DELAYS.NEXT_HAND);
        }

        this.updateUI();
    }

    split() {
        if (this.playerHands.length === 0) return;
        const currentHand = this.playerHands[this.currentHandIndex];

        // Validation: cards must be a pair, player needs balance, and max splits not reached
        if (currentHand.cards.length !== 2 ||
            currentHand.cards[0].value !== currentHand.cards[1].value ||
            this.balance < currentHand.bet ||
            this.playerHands.length > CONFIG.MAX_SPLITS) {
            return;
        }

        const isSplittingAces = currentHand.cards[0].value === 'A';

        this.balance -= currentHand.bet;

        const newHand = {
            cards: [currentHand.cards.pop()],
            bet: currentHand.bet,
            status: 'playing',
            splitFromAces: isSplittingAces
        };

        currentHand.splitFromAces = isSplittingAces;
        currentHand.cards.push(this.deck.draw());
        newHand.cards.push(this.deck.draw());

        this.playerHands.splice(this.currentHandIndex + 1, 0, newHand);

        if (this.soundManager) this.soundManager.play('card');
        this.events.emit('player:split', { handIndex: this.currentHandIndex, isSplittingAces });

        // When splitting aces, each hand gets only one card and must stand
        if (isSplittingAces) {
            currentHand.status = 'stand';
            newHand.status = 'stand';
            this.updateUI();
            this.addTimeout(() => this.nextHand(), CONFIG.DELAYS.NEXT_HAND);
        } else {
            this.updateUI();
        }
    }

    surrender() {
        if (this.gameOver || this.playerHands.length === 0) return;
        const hand = this.playerHands[this.currentHandIndex];
        if (hand.cards.length !== 2) return;

        if (this.soundManager) this.soundManager.play('chip');
        hand.status = 'surrender';

        const refund = Math.floor(hand.bet / 2);
        this.balance += refund;

        if (this.ui) this.ui.showMessage('Você desistiu.', 'tie');
        this.endGame();
    }

    nextHand() {
        if (this.currentHandIndex < this.playerHands.length - 1) {
            this.currentHandIndex++;
            this.updateUI();
        } else {
            this.playDealer();
        }
    }

    playDealer() {
        const allBusted = this.playerHands.every(h => h.status === 'busted');
        if (allBusted) {
             this.endGame();
             return;
        }

        this.dealerRevealed = true;
        this.events.emit('dealer:turn');
        this.updateUI();

        const dealerTurn = () => {
             const value = HandUtils.calculateHandValue(this.dealerHand);
             const isSoft = HandUtils.isSoftHand(this.dealerHand);

             if (value < 17 || (value === 17 && isSoft)) {
                 this.dealerHand.push(this.deck.draw());
                 if (this.soundManager) this.soundManager.play('card');
                 this.updateUI();
                 this.addTimeout(dealerTurn, CONFIG.DELAYS.DEALER_TURN);
             } else {
                 this.addTimeout(() => this.endGame(), CONFIG.DELAYS.NEXT_HAND);
             }
        };

        this.addTimeout(dealerTurn, CONFIG.DELAYS.DEALER_TURN);
    }

    evaluateHand(hand, dealerValue, dealerBJ) {
        const playerValue = HandUtils.calculateHandValue(hand.cards);
        const playerBJ = HandUtils.isNaturalBlackjack(hand.cards, this.playerHands.length);

        if (hand.status === 'surrender') return { result: 'surrender', winMultiplier: 0 };
        if (hand.status === 'busted') return { result: 'lose', winMultiplier: 0 };

        // Explicit BJ push: both player and dealer have natural Blackjack
        if (playerBJ && dealerBJ) return { result: 'tie', winMultiplier: 1 };

        if (dealerValue > 21) return { result: 'win', winMultiplier: 2 };
        if (playerValue > dealerValue) return { result: 'win', winMultiplier: 2 };
        if (dealerValue > playerValue) return { result: 'lose', winMultiplier: 0 };

        return { result: 'tie', winMultiplier: 1 };
    }

    endGame() {
        this.gameOver = true;
        this.dealerRevealed = true;
        this.events.emit('game:ending');
        const dealerValue = HandUtils.calculateHandValue(this.dealerHand);
        const dealerBJ = (dealerValue === 21 && this.dealerHand.length === 2);

        if (this.insuranceTaken && dealerBJ) {
            const insuranceWin = Math.floor(this.currentBet / 2) * CONFIG.PAYOUT.INSURANCE;
            this.balance += insuranceWin;
            this.totalWinnings += (insuranceWin - Math.floor(this.currentBet / 2));
            if (this.ui) this.ui.showMessage('Seguro paga 2:1!', 'win');
        }

        let totalWin = 0;
        let anyWin = false;
        let allLost = true;

        this.playerHands.forEach(hand => {
            const { result, winMultiplier } = this.evaluateHand(hand, dealerValue, dealerBJ);
            let handWin = hand.bet * winMultiplier;

            // Natural Blackjack payout (3:2) - only for single hand, not after split
            if (HandUtils.isNaturalBlackjack(hand.cards, this.playerHands.length) && result === 'win') {
                 handWin = Math.floor(hand.bet * CONFIG.PAYOUT.BLACKJACK);
                 this.blackjacks++;
            }

            if (result === 'win') {
                this.wins++;
                anyWin = true;
            } else if (result === 'lose' || result === 'surrender') {
                this.losses++;
            }

            totalWin += handWin;
            if (result !== 'lose') allLost = false;
        });

        this.balance += totalWin;
        const totalBetOnHands = this.playerHands.reduce((sum, h) => sum + h.bet, 0);
        this.totalWinnings += (totalWin - totalBetOnHands);

        // Determine message
        let message = '';
        let messageClass = '';
        if (this.playerHands.length === 1) {
             const hand = this.playerHands[0];
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

    resetGame() {
        this.balance = CONFIG.INITIAL_BALANCE;
        this.wins = 0;
        this.losses = 0;
        this.blackjacks = 0;
        this.totalWinnings = 0;
        this.newGame();
        if (this.ui) {
            this.ui.showMessage('Jogo reiniciado!', 'win');
            this.ui.showToast('Jogo reiniciado com sucesso', 'success');
        }
        this.saveGame();
    }

    newGame() {
        this.playerHands = [];
        this.currentHandIndex = 0;
        this.dealerHand = [];
        if (this.currentBet > this.balance) {
            this.currentBet = Math.max(10, this.balance);
        }
        this.gameOver = false;
        this.dealerRevealed = false;

        if (this.ui) {
            this.ui.toggleGameControls(false);
            this.ui.showMessage('Escolha sua aposta!');
        }
        this.updateUI();
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
            } catch (err) {
                if (this.ui) this.ui.showError('Erro ao importar dados.');
            }
        };
        reader.readAsText(file);
    }

    // Settings Update
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
