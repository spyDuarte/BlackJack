import { Deck } from './Deck.js';
import { CONFIG } from './Constants.js';
import { StorageManager } from '../utils/StorageManager.js';

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

        this.ui = ui;
        this.soundManager = soundManager;
        this.deck = new Deck();

        this.initializeGameState();
        this.initializeSettings();

        // Timeouts management
        this.timeouts = [];

        this.loadGame();
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
            showStats: false
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
        if (this.ui) {
            this.ui.hideWelcomeScreen();
            this.ui.toggleLoading(true);
            setTimeout(() => {
                this.ui.toggleLoading(false);
                this.updateUI();
            }, 400);
        }
    }

    saveGame() {
        const gameState = {
            balance: this.balance,
            wins: this.wins,
            losses: this.losses,
            blackjacks: this.blackjacks,
            totalWinnings: this.totalWinnings,
            gameStarted: this.gameStarted
        };
        StorageManager.set('blackjack-premium-save', JSON.stringify(gameState));
    }

    loadGame() {
        const savedGame = StorageManager.get('blackjack-premium-save');
        if (savedGame) {
            try {
                const gameState = JSON.parse(savedGame);
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
        StorageManager.set('blackjack-premium-settings', JSON.stringify(this.settings));
    }

    loadSettings() {
        const savedSettings = StorageManager.get('blackjack-premium-settings');
        if (savedSettings) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
                if (this.soundManager) this.soundManager.setEnabled(this.settings.soundEnabled);
                if (this.ui) {
                    this.ui.setAnimationsEnabled(this.settings.animationsEnabled);
                    this.ui.setStatsVisibility(this.settings.showStats);
                }
            } catch (e) {
                console.warn('Could not parse settings');
            }
        }
    }

    updateUI() {
        if (this.ui) this.ui.render(this.getState());
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

        // Shuffle if needed
        const totalCards = this.deck.numberOfDecks * 52;
        if (this.deck.remainingCards < totalCards * CONFIG.PENETRATION_THRESHOLD) {
             if (this.ui) this.ui.showMessage('Embaralhando...', '');
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

        if (this.ui) {
            this.ui.toggleGameControls(false); // Controls hidden until turn starts
            this.ui.showMessage('Boa sorte!');
        }

        const dealerUpCard = this.dealerHand[0];
        const dealerUpVal = this.getCardNumericValue(dealerUpCard);

        if (dealerUpCard.value === 'A') {
             setTimeout(() => {
                 if (this.ui) this.ui.toggleInsuranceModal(true);
             }, 1000);
        } else if (dealerUpVal === 10) {
             this.addTimeout(() => this.checkDealerBlackjack(), 500);
        } else {
             this.addTimeout(() => this.startPlayerTurn(), 500);
        }
    }

    startPlayerTurn() {
        if (this.ui) {
            this.ui.toggleGameControls(true);
            this.ui.showMessage('Sua vez!');
        }
        this.updateUI();

        const pVal = this.calculateHandValue(this.playerHands[0].cards);
        if (pVal === 21) {
             this.addTimeout(() => this.endGame(), 500);
        }
    }

    checkDealerBlackjack() {
        const val = this.calculateHandValue(this.dealerHand);
        if (val === 21 && this.dealerHand.length === 2) {
             this.dealerRevealed = true;
             this.updateUI();
             if (this.ui) this.ui.showMessage('Dealer tem Blackjack!', 'lose');
             this.addTimeout(() => this.endGame(), 750);
        } else {
             if (this.ui) this.ui.showMessage('Dealer não tem Blackjack.', '');
             this.addTimeout(() => this.startPlayerTurn(), 500);
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
        this.addTimeout(() => this.checkDealerBlackjack(), 500);
    }

    hit() {
        if (this.gameOver) return;

        const hand = this.playerHands[this.currentHandIndex];
        hand.cards.push(this.deck.draw());
        if (this.soundManager) this.soundManager.play('card');
        this.updateUI();

        if (this.calculateHandValue(hand.cards) > 21) {
            hand.status = 'busted';
            if (this.ui) this.ui.showMessage('Estourou!', 'lose');
            this.addTimeout(() => this.nextHand(), 250);
        }
    }

    stand() {
        if (this.gameOver) return;
        const hand = this.playerHands[this.currentHandIndex];
        hand.status = 'stand';
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

        const value = this.calculateHandValue(hand.cards);

        if (value > 21) {
            hand.status = 'busted';
            if (this.ui) this.ui.showMessage('Estourou!', 'lose');
            this.addTimeout(() => this.nextHand(), 250);
        } else {
            hand.status = 'stand';
            this.addTimeout(() => this.nextHand(), 250);
        }

        this.updateUI();
    }

    split() {
        if (this.playerHands.length === 0) return;
        const currentHand = this.playerHands[this.currentHandIndex];

        // Validation logic handled in UI update usually, but safety check here
        if (currentHand.cards.length !== 2 ||
            currentHand.cards[0].value !== currentHand.cards[1].value ||
            this.balance < currentHand.bet) {
            return;
        }

        this.balance -= currentHand.bet;

        const newHand = {
            cards: [currentHand.cards.pop()],
            bet: currentHand.bet,
            status: 'playing'
        };

        currentHand.cards.push(this.deck.draw());
        newHand.cards.push(this.deck.draw());

        this.playerHands.splice(this.currentHandIndex + 1, 0, newHand);

        if (this.soundManager) this.soundManager.play('card');
        this.updateUI();
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
        this.updateUI();

        const dealerTurn = () => {
             const value = this.calculateHandValue(this.dealerHand);
             const isSoft = this.isSoftHand(this.dealerHand);

             if (value < 17 || (value === 17 && isSoft)) {
                 this.dealerHand.push(this.deck.draw());
                 if (this.soundManager) this.soundManager.play('card');
                 this.updateUI();
                 this.addTimeout(dealerTurn, 500);
             } else {
                 this.addTimeout(() => this.endGame(), 250);
             }
        };

        this.addTimeout(dealerTurn, 500);
    }

    endGame() {
        this.gameOver = true;
        this.dealerRevealed = true;
        const dealerValue = this.calculateHandValue(this.dealerHand);
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
            const playerValue = this.calculateHandValue(hand.cards);
            let handWin = 0;
            let result = '';

            if (hand.status === 'surrender') {
                result = 'surrender';
                this.losses++;
            } else if (hand.status === 'busted') {
                result = 'lose';
                this.losses++;
            } else if (dealerValue > 21) {
                result = 'win';
                handWin = hand.bet * 2;
                this.wins++;
            } else if (playerValue > dealerValue) {
                result = 'win';
                handWin = hand.bet * 2;
                this.wins++;
            } else if (dealerValue > playerValue) {
                result = 'lose';
                this.losses++;
            } else {
                result = 'tie';
                handWin = hand.bet;
            }

            if (this.playerHands.length === 1 && playerValue === 21 && hand.cards.length === 2 && result === 'win') {
                 // Blackjack Payout
                 handWin = Math.floor(hand.bet * CONFIG.PAYOUT.BLACKJACK);
                 this.blackjacks++;
            }

            totalWin += handWin;
            if (result === 'win') anyWin = true;
            if (result !== 'lose') allLost = false;
        });

        this.balance += totalWin;
        this.totalWinnings += totalWin; // Tracking gross winnings per session? Original logic was confusing, simplifying to add win.

        // Determine message
        let message = '';
        let messageClass = '';
        if (this.playerHands.length === 1) {
             const hand = this.playerHands[0];
             const pVal = this.calculateHandValue(hand.cards);
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
            }, 2000);
        }

        if (this.settings.autoSave) this.saveGame();
    }

    resetGame() {
        this.balance = CONFIG.INITIAL_BALANCE;
        this.wins = 0;
        this.losses = 0;
        this.blackjacks = 0;
        this.totalWinnings = 0;
        this.newGame();
        if (this.ui) this.ui.showMessage('Jogo reiniciado!', 'win');
        this.saveGame();
    }

    newGame() {
        this.playerHands = [];
        this.currentHandIndex = 0;
        this.dealerHand = [];
        // this.currentBet resets? Original said this.currentBet = 0.
        this.currentBet = 50;
        this.gameOver = false;
        this.dealerRevealed = false;

        if (this.ui) {
            this.ui.toggleGameControls(false);
            this.ui.showMessage('Escolha sua aposta!');
        }
        this.updateUI();
    }

    // Helpers

    getCardNumericValue(card) {
        if (card.value === 'A') {
            return 11;
        } else if (['J', 'Q', 'K'].includes(card.value)) {
            return 10;
        } else {
            return parseInt(card.value);
        }
    }

    getHandStats(hand) {
        let value = 0;
        let aces = 0;

        for (let card of hand) {
            if (!card) continue;
            const cardValue = this.getCardNumericValue(card);
            value += cardValue;
            if (cardValue === 11) aces++;
        }

        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return { value, isSoft: aces > 0, aces };
    }

    calculateHandValue(hand) {
        return this.getHandStats(hand).value;
    }

    isSoftHand(hand) {
        return this.getHandStats(hand).isSoft;
    }

    // Settings Update
    updateSetting(key, value) {
        if (key in this.settings) {
            this.settings[key] = value;
            if (key === 'soundEnabled' && this.soundManager) {
                this.soundManager.setEnabled(value);
            }
            if (this.ui) {
                if (key === 'animationsEnabled') this.ui.setAnimationsEnabled(value);
                if (key === 'showStats') this.ui.setStatsVisibility(value);
            }
            this.saveSettings();
        }
    }
}
