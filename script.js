const CONFIG = {
    DECKS: 6,
    PENETRATION_THRESHOLD: 0.2, // 20% remaining
    INITIAL_BALANCE: 1000,
    MIN_BET: 10,
    ANIMATION_SPEED: 500,
    PAYOUT: {
        BLACKJACK: 2.5, // 3:2 payout on original bet (1.5 + 1) -> 2.5x total return logic
        REGULAR: 2.0,
        INSURANCE: 3.0
    }
};

// Storage Manager
class StorageManager {
    static set(key, value) {
        try {
            if (typeof Storage !== 'undefined') {
                localStorage.setItem(key, value);
                return true;
            }
        } catch (e) {
            console.warn('LocalStorage not available:', e.message);
        }
        return false;
    }

    static get(key) {
        try {
            if (typeof Storage !== 'undefined') {
                return localStorage.getItem(key);
            }
        } catch (e) {
            console.warn('LocalStorage not available:', e.message);
        }
        return null;
    }

    static remove(key) {
        try {
            if (typeof Storage !== 'undefined') {
                localStorage.removeItem(key);
                return true;
            }
        } catch (e) {
            console.warn('LocalStorage not available:', e.message);
        }
        return false;
    }
}

// Sound Manager
class SoundManager {
    constructor(enabled = true) {
        this.enabled = enabled;
        this.audioContext = null;
        this.sounds = {
            card: { frequency: 800, duration: 0.1 },
            win: { frequency: 523.25, duration: 0.3 },
            lose: { frequency: 220, duration: 0.5 },
            chip: { frequency: 1000, duration: 0.05 },
            button: { frequency: 600, duration: 0.08 }
        };
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    play(type) {
        if (!this.enabled) return;

        try {
            if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
                return;
            }

            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            const sound = this.sounds[type] || this.sounds.button;
            oscillator.frequency.value = sound.frequency;
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + sound.duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + sound.duration);
        } catch (error) {
            // Sound not supported or error
        }
    }
}

// Deck Class
class Deck {
    constructor(numberOfDecks = CONFIG.DECKS) {
        this.numberOfDecks = numberOfDecks;
        this.cards = [];
        this.reset();
        this.shuffle();
    }

    reset() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.cards = [];

        for (let i = 0; i < this.numberOfDecks; i++) {
            for (let suit of suits) {
                for (let value of values) {
                    this.cards.push({ suit, value });
                }
            }
        }
    }

    get remainingCards() {
        return this.cards.length;
    }

    shuffle() {
        // Fisher-Yates shuffle algorithm
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        return this.cards.pop();
    }
}

// UI Manager
class UIManager {
    constructor() {
        this.elements = {};
        this.animationsEnabled = true;
    }

    initialize() {
        // Cache DOM elements
        this.elements = {
            balance: this.safeGetElement('balance'),
            currentBet: this.safeGetElement('current-bet'),
            wins: this.safeGetElement('wins'),
            losses: this.safeGetElement('losses'),
            dealerCards: this.safeGetElement('dealer-cards'),
            playerCards: this.safeGetElement('player-cards'),
            dealerScore: this.safeGetElement('dealer-score'),
            playerScore: this.safeGetElement('player-score'),
            message: this.safeGetElement('message'),
            betControls: this.safeGetElement('bet-controls'),
            gameControls: this.safeGetElement('game-controls'),
            betInput: this.safeGetElement('bet-input'),
            betBtn: this.safeGetElement('bet-btn'),
            hitBtn: this.safeGetElement('hit-btn'),
            standBtn: this.safeGetElement('stand-btn'),
            doubleBtn: this.safeGetElement('double-btn'),
            newGameBtn: this.safeGetElement('new-game-btn'),
            betDecrease: this.safeGetElement('bet-decrease'),
            betIncrease: this.safeGetElement('bet-increase'),
            betDoubleValue: this.safeGetElement('bet-double-value'),
            splitBtn: this.safeGetElement('split-btn'),
            surrenderBtn: this.safeGetElement('surrender-btn'),
            settingsBtn: this.safeGetElement('settings-btn'),
            settingsModal: this.safeGetElement('settings-modal'),
            insuranceModal: this.safeGetElement('insurance-modal'),
            insuranceYesBtn: this.safeGetElement('insurance-yes-btn'),
            insuranceNoBtn: this.safeGetElement('insurance-no-btn'),
            statsContainer: this.safeGetElement('stats-container'),
            loading: document.querySelector('.loading'),
            welcomeScreen: document.getElementById('welcome-screen'),
            errorNotification: document.getElementById('error-notification'),
            errorMessage: document.getElementById('error-message'),
            closeError: document.querySelector('.close-error'),
            // Statistics
            totalGames: this.safeGetElement('total-games'),
            winRate: this.safeGetElement('win-rate'),
            totalWinnings: this.safeGetElement('total-winnings'),
            blackjacks: this.safeGetElement('blackjacks')
        };
    }

    setAnimationsEnabled(enabled) {
        this.animationsEnabled = enabled;
    }

    safeGetElement(id) {
        try {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`Element with id '${id}' not found`);
            }
            return element;
        } catch (e) {
            console.warn(`Error getting element '${id}':`, e.message);
            return null;
        }
    }

    showError(message) {
        if (this.elements.errorNotification && this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorNotification.classList.add('show');
            setTimeout(() => this.hideError(), 5000);
        }
    }

    hideError() {
        if (this.elements.errorNotification) {
            this.elements.errorNotification.classList.remove('show');
        }
    }

    showMessage(text, type = '') {
        if (this.elements.message) {
            this.elements.message.textContent = text;
            this.elements.message.className = `message ${type}`;
        }
    }

    createCardElement(card, hidden = false) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';

        if (hidden) {
            cardEl.classList.add('card-back');
        } else {
            const isRed = card.suit === '♥' || card.suit === '♦';
            cardEl.classList.add(isRed ? 'red' : 'black');
            cardEl.innerHTML = `
                <div class="suit">${card.suit}</div>
                <div class="suit-bottom">${card.suit}</div>
                <div class="value">${card.value}</div>
            `;
        }

        return cardEl;
    }

    createConfetti() {
        if (!this.animationsEnabled) return;

        const colors = ['#FFD700', '#FFA500', '#2ecc71', '#3498db', '#e74c3c', '#ffffff'];
        const confettiCount = 50;

        try {
            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';

                // Random properties
                const bg = colors[Math.floor(Math.random() * colors.length)];
                const left = Math.random() * 100 + 'vw';
                const animDuration = (Math.random() * 0.75 + 0.75) + 's'; // 1.5-3s
                const animDelay = (Math.random() * 0.25) + 's';
                const fallX = (Math.random() * 200 - 100) + 'px';

                confetti.style.backgroundColor = bg;
                confetti.style.left = left;
                confetti.style.animationDuration = animDuration;
                confetti.style.animationDelay = animDelay;
                confetti.style.setProperty('--fall-x', fallX);

                // Random size
                const size = (Math.random() * 8 + 5) + 'px';
                confetti.style.width = size;
                confetti.style.height = size;

                document.body.appendChild(confetti);

                // Cleanup
                setTimeout(() => {
                    if (confetti.parentNode) confetti.remove();
                }, 4000);
            }
        } catch (e) {
            console.warn('Confetti error:', e);
        }
    }

    showWinAnimation(amount = 0) {
        if (!this.animationsEnabled) return;

        try {
            // Trigger confetti bursts
            this.createConfetti();

            // Second burst
            setTimeout(() => this.createConfetti(), 250);

            // Third burst for good measure
            setTimeout(() => this.createConfetti(), 500);

        } catch (e) {
            console.warn('Win animation error:', e);
        }
    }

    updateBalance(value) { this.animateValue(this.elements.balance, value, true); }
    updateCurrentBet(value) { this.animateValue(this.elements.currentBet, value, true); }
    updateWins(value) { this.animateValue(this.elements.wins, value); }
    updateLosses(value) { this.animateValue(this.elements.losses, value); }

    updateDealerScore(value) { this.animateScore(this.elements.dealerScore, value); }
    updatePlayerScore(value) { this.animateScore(this.elements.playerScore, value); }

    updateStats(wins, losses, totalWinnings, blackjacks) {
        const totalGames = wins + losses;
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

        if (this.elements.totalGames) this.elements.totalGames.textContent = totalGames;
        if (this.elements.winRate) this.elements.winRate.textContent = `${winRate}%`;
        if (this.elements.totalWinnings) this.elements.totalWinnings.textContent = `$${totalWinnings}`;
        if (this.elements.blackjacks) this.elements.blackjacks.textContent = blackjacks;
    }

    animateValue(element, value, isCurrency = false) {
        if (!element) return;

        // Simple update if animations disabled (though animateValue logic is lightweight)
        // Keeping original logic
        try {
            const current = parseInt(element.textContent.replace(/\D/g, '')) || 0;
            const steps = 10;
            const increment = (value - current) / steps;
            let step = 0;

            const interval = setInterval(() => {
                step++;
                const newValue = Math.round(current + increment * step);
                element.textContent = isCurrency ? `$${newValue}` : newValue;

                if (step >= steps) {
                    clearInterval(interval);
                    element.textContent = isCurrency ? `$${value}` : value;
                }
            }, 20);
        } catch (e) {
            element.textContent = isCurrency ? `$${value}` : value;
        }
    }

    animateScore(element, value) {
        if (!element) return;
        if (this.animationsEnabled) {
            element.style.transform = 'scale(1.2)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 300);
        }
        element.textContent = value;
    }

    renderHand(container, hand, isDealer, revealDealer) {
        if (!container) return;
        container.innerHTML = '';

        hand.forEach((card, index) => {
            const isHidden = isDealer && index === 1 && !revealDealer;
            const cardEl = this.createCardElement(card, isHidden);
            if (this.animationsEnabled) {
                cardEl.style.animationDelay = `${index * 0.05}s`;
            }
            container.appendChild(cardEl);
        });
    }

    renderPlayerHands(hands, currentHandIndex) {
        const container = this.elements.playerCards;
        if (!container) return;

        container.innerHTML = '';

        if (hands.length === 1) {
             this.renderHand(container, hands[0].cards, false, false);
             return;
        }

        hands.forEach((hand, index) => {
            const handWrapper = document.createElement('div');
            handWrapper.className = 'hand-container';
            if (index === currentHandIndex) {
                handWrapper.classList.add('active-hand');
            }

            const infoDiv = document.createElement('div');
            infoDiv.className = 'hand-info';
            infoDiv.textContent = `$${hand.bet}`;
            handWrapper.appendChild(infoDiv);

            const cardsContainer = document.createElement('div');
            cardsContainer.style.display = 'flex';
            cardsContainer.style.gap = '10px';
            cardsContainer.style.justifyContent = 'center';
            cardsContainer.style.flexWrap = 'wrap';

            this.renderHand(cardsContainer, hand.cards, false, false);
            handWrapper.appendChild(cardsContainer);

            container.appendChild(handWrapper);
        });
    }

    toggleSplitBtn(show, enabled = true) {
        if (this.elements.splitBtn) {
            this.elements.splitBtn.style.display = show ? 'inline-block' : 'none';
            this.elements.splitBtn.disabled = !enabled;
        }
    }

    toggleSettingsModal(show) {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.style.display = show ? 'block' : 'none';
        }
    }

    toggleInsuranceModal(show) {
        if (this.elements.insuranceModal) {
            this.elements.insuranceModal.style.display = show ? 'block' : 'none';
        }
    }

    toggleSurrenderBtn(show, enabled = true) {
        if (this.elements.surrenderBtn) {
            this.elements.surrenderBtn.style.display = show ? 'inline-block' : 'none';
            this.elements.surrenderBtn.disabled = !enabled;
        }
    }

    toggleGameControls(inGame) {
        if (this.elements.betControls) this.elements.betControls.style.display = inGame ? 'none' : 'flex';
        if (this.elements.gameControls) this.elements.gameControls.style.display = inGame ? 'flex' : 'none';
        if (this.elements.newGameBtn) this.elements.newGameBtn.style.display = inGame ? 'none' : 'none'; // Initially none
    }

    showNewGameButton() {
        if (this.elements.newGameBtn) this.elements.newGameBtn.style.display = 'inline-block';
    }

    setStatsVisibility(visible) {
        if (this.elements.statsContainer) {
            this.elements.statsContainer.style.display = visible ? 'block' : 'none';
        }
    }

    hideWelcomeScreen() {
        if (this.elements.welcomeScreen) {
            this.elements.welcomeScreen.classList.add('hidden');
            setTimeout(() => {
                this.elements.welcomeScreen.style.display = 'none';
            }, 500);
        }
    }

    toggleLoading(show) {
        if (this.elements.loading) {
            this.elements.loading.style.display = show ? 'block' : 'none';
        }
    }
}

// Blackjack Game Controller
class BlackjackGame {
    constructor() {
        try {
            this.ui = new UIManager();
            this.ui.initialize();

            this.soundManager = new SoundManager();
            this.deck = new Deck();

            this.initializeGameState();
            this.initializeSettings();

            this.bindEvents();
            this.loadGame();
            this.updateDisplay();
        } catch (e) {
            console.error('Error in BlackjackGame constructor:', e);
            this.ui.showError('Erro na inicialização do jogo');
        }
    }


    addTimeout(fn, delay) {
        const id = window.setTimeout(fn, delay);
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
        this.currentBet = 0;
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

    bindEvents() {
        // UI Events
        const el = this.ui.elements;

        if (el.betBtn) el.betBtn.addEventListener('click', () => this.startGame());
        if (el.hitBtn) el.hitBtn.addEventListener('click', () => this.hit());
        if (el.standBtn) el.standBtn.addEventListener('click', () => this.stand());
        if (el.doubleBtn) el.doubleBtn.addEventListener('click', () => this.double());
                if (el.splitBtn) el.splitBtn.addEventListener('click', () => this.split());
        if (el.surrenderBtn) el.surrenderBtn.addEventListener('click', () => this.surrender());
        if (el.insuranceYesBtn) el.insuranceYesBtn.addEventListener('click', () => this.respondToInsurance(true));
        if (el.insuranceNoBtn) el.insuranceNoBtn.addEventListener('click', () => this.respondToInsurance(false));
        if (el.newGameBtn) el.newGameBtn.addEventListener('click', () => this.newGame());

        if (el.betDecrease) el.betDecrease.addEventListener('click', () => this.adjustBet(-10));
        if (el.betIncrease) el.betIncrease.addEventListener('click', () => this.adjustBet(10));
        if (el.betDoubleValue) el.betDoubleValue.addEventListener('click', () => this.multiplyBet(2));

        if (el.betInput) {
            el.betInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.startGame();
            });
        }

        // Chip selection
        const chips = document.querySelectorAll('.chip');
        chips.forEach(chip => {
            chip.addEventListener('click', (e) => this.selectChip(e));
        });

        // Settings
        if (el.settingsBtn) el.settingsBtn.addEventListener('click', () => this.ui.toggleSettingsModal(true));

        const closeBtn = document.querySelector('.close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.ui.toggleSettingsModal(false));

        window.addEventListener('click', (e) => {
            if (e.target === el.settingsModal) this.ui.toggleSettingsModal(false);
        });

        // Settings Checkboxes
        this.bindCheckbox('sound-enabled', (checked) => {
            this.settings.soundEnabled = checked;
            this.soundManager.setEnabled(checked);
        });
        this.bindCheckbox('animations-enabled', (checked) => {
            this.settings.animationsEnabled = checked;
            this.ui.setAnimationsEnabled(checked);
        });
        this.bindCheckbox('auto-save', (checked) => this.settings.autoSave = checked);
        this.bindCheckbox('show-stats', (checked) => {
            this.settings.showStats = checked;
            this.ui.setStatsVisibility(checked);
        });

        // Keyboard
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Auto-save
        window.addEventListener('beforeunload', () => {
            if (this.settings.autoSave) this.saveGame();
        });

        // Visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.settings.autoSave) {
                this.saveGame();
            }
        });

        // Error notification close
        if (el.closeError) {
             el.closeError.addEventListener('click', () => this.ui.hideError());
        }
    }

    bindCheckbox(id, callback) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', (e) => {
                callback(e.target.checked);
                this.saveSettings();
            });
        }
    }

    startApp() {
        this.ui.hideWelcomeScreen();
        this.ui.toggleLoading(true);

        setTimeout(() => {
            try {
                // Already initialized in constructor, just finishing visual transition
                this.ui.toggleLoading(false);
            } catch (e) {
                console.error('Error starting app:', e);
                this.ui.showError('Erro ao iniciar o jogo.');
            }
        }, 400);
    }

    resetGame() {
        this.clearTimeouts();
        this.initializeGameState();
        this.newGame();
        this.updateDisplay();
        StorageManager.remove('blackjack-premium-save');
        this.ui.showMessage('Jogo resetado!');
        this.ui.toggleSettingsModal(false);
    }

    getCardNumericValue(card) {
        if (card.value === 'A') {
            return 11;
        } else if (['J', 'Q', 'K'].includes(card.value)) {
            return 10;
        } else {
            return parseInt(card.value);
        }
    }

    /**
     * Calculates hand statistics including total value and soft status.
     * @param {Array} hand - Array of card objects
     * @returns {Object} { value, isSoft, aces }
     */
    getHandStats(hand) {
        let value = 0;
        let aces = 0;

        for (let card of hand) {
            if (!card) continue; // Safety check for undefined cards

            const cardValue = this.getCardNumericValue(card);
            value += cardValue;

            if (cardValue === 11) {
                aces++;
            }
        }

        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return {
            value,
            isSoft: aces > 0,
            aces
        };
    }

    calculateHandValue(hand) {
        return this.getHandStats(hand).value;
    }

    isSoftHand(hand) {
        return this.getHandStats(hand).isSoft;
    }

    updateDisplay() {
        this.ui.updateBalance(this.balance);

        let totalBet = 0;
        if (this.playerHands && this.playerHands.length > 0) {
            totalBet = this.playerHands.reduce((sum, h) => sum + h.bet, 0);
        } else {
            totalBet = this.currentBet;
        }
        this.ui.updateCurrentBet(totalBet);

        this.ui.updateWins(this.wins);
        this.ui.updateLosses(this.losses);

        this.ui.renderHand(this.ui.elements.dealerCards, this.dealerHand, true, this.dealerRevealed);
        this.ui.renderPlayerHands(this.playerHands, this.currentHandIndex);

        // Check for empty dealer hand to avoid error
        const dealerValue = (this.dealerHand && this.dealerHand.length > 0) ?
            this.calculateHandValue(this.dealerRevealed ? this.dealerHand : [this.dealerHand[0]]) : 0;

        let playerValue = 0;
        if (this.playerHands.length > 0 && this.playerHands[this.currentHandIndex]) {
             playerValue = this.calculateHandValue(this.playerHands[this.currentHandIndex].cards);
        }

        this.ui.updateDealerScore(this.dealerRevealed ? dealerValue : '?');
        this.ui.updatePlayerScore(playerValue);

        this.ui.updateStats(this.wins, this.losses, this.totalWinnings, this.blackjacks);

        // Update buttons state
        if (this.playerHands.length > 0 && !this.gameOver) {
            const currentHand = this.playerHands[this.currentHandIndex];

            // Split check
            const canSplit = currentHand.cards.length === 2 &&
                             currentHand.cards[0].value === currentHand.cards[1].value &&
                             this.balance >= currentHand.bet;
            this.ui.toggleSplitBtn(canSplit);

            // Surrender check
            const canSurrender = currentHand.cards.length === 2 &&
                                 this.playerHands.length === 1 && // Can't surrender after split usually
                                 currentHand.status === 'playing';
            this.ui.toggleSurrenderBtn(canSurrender, canSurrender);

            // Double check
            if (this.ui.elements.doubleBtn) {
                const canDouble = currentHand.status === 'playing' &&
                                  this.balance >= currentHand.bet &&
                                  currentHand.cards.length === 2;
                this.ui.elements.doubleBtn.disabled = !canDouble;
            }
        } else {
            this.ui.toggleSplitBtn(false);
        }

        if (this.settings.autoSave && this.gameStarted) {
            this.saveGame();
        }
    }

    split() {
        if (this.playerHands.length === 0) return;
        const currentHand = this.playerHands[this.currentHandIndex];

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

        // Insert new hand after current hand
        this.playerHands.splice(this.currentHandIndex + 1, 0, newHand);

        this.soundManager.play('card');
        this.updateDisplay();
    }

    nextHand() {
        if (this.currentHandIndex < this.playerHands.length - 1) {
            this.currentHandIndex++;
            this.updateDisplay();
        } else {
            this.playDealer();
        }
    }

    playDealer() {
        // Check if all hands busted
        const allBusted = this.playerHands.every(h => h.status === 'busted');
        if (allBusted) {
             this.endGame();
             return;
        }

        this.dealerRevealed = true;
        this.updateDisplay();

        const dealerTurn = () => {
             const value = this.calculateHandValue(this.dealerHand);
             const isSoft = this.isSoftHand(this.dealerHand);

             if (value < 17 || (value === 17 && isSoft)) {
                 this.dealerHand.push(this.deck.draw());
                 this.soundManager.play('card');
                 this.updateDisplay();
                 this.addTimeout(dealerTurn, 500);
             } else {
                 this.addTimeout(() => this.endGame(), 250);
             }
        };

        this.addTimeout(dealerTurn, 500);
    }


    checkDealerBlackjack() {
        const val = this.calculateHandValue(this.dealerHand);
        if (val === 21 && this.dealerHand.length === 2) {
             this.dealerRevealed = true;
             this.updateDisplay();
             this.ui.showMessage('Dealer tem Blackjack!', 'lose');
             this.addTimeout(() => this.endGame(), 750);
        } else {
             if (this.dealerHand[0].value === 'A' || this.getCardNumericValue(this.dealerHand[0]) === 10) {
                 this.ui.showMessage('Dealer não tem Blackjack.', '');
             }
             this.addTimeout(() => this.startPlayerTurn(), 500);
        }
    }

    respondToInsurance(accept) {
        this.ui.toggleInsuranceModal(false);

        if (accept) {
            const insuranceCost = Math.floor(this.currentBet / 2);
            if (this.balance >= insuranceCost) {
                this.balance -= insuranceCost;
                this.insuranceTaken = true;
                this.ui.showMessage('Seguro apostado.', '');
                this.soundManager.play('chip');
            } else {
                this.ui.showMessage('Saldo insuficiente para seguro.', 'lose');
            }
        } else {
            this.ui.showMessage('Seguro recusado.', '');
        }

        this.updateDisplay();
        this.addTimeout(() => this.checkDealerBlackjack(), 500);
    }

    surrender() {
        if (this.gameOver || this.playerHands.length === 0) return;
        const hand = this.playerHands[this.currentHandIndex];
        if (hand.cards.length !== 2) return;

        this.soundManager.play('chip');
        hand.status = 'surrender';

        // Refund half
        const refund = Math.floor(hand.bet / 2);
        this.balance += refund;

        this.ui.showMessage('Você desistiu.', 'tie');
        this.endGame();
    }

    startPlayerTurn() {
        this.ui.toggleGameControls(true);
        this.ui.showMessage('Sua vez!');

        // Enable Surrender only if first turn
        this.ui.toggleSurrenderBtn(true, true);

        this.updateDisplay();

        const pVal = this.calculateHandValue(this.playerHands[0].cards);
        if (pVal === 21) {
             this.addTimeout(() => this.endGame(), 500);
        }
    }

    startGame() {
        const betInput = this.ui.elements.betInput;
        if (!betInput) return;

        const bet = parseInt(betInput.value);

        if (bet < 10 || bet > this.balance) {
            this.ui.showMessage('Aposta inválida!', 'lose');
            this.soundManager.play('lose');
            return;
        }

        this.currentBet = bet;
        this.balance -= bet;
        this.gameOver = false;
        this.dealerRevealed = false;
        this.gameStarted = true;

        // Shuffle logic if penetration threshold reached
        const totalCards = this.deck.numberOfDecks * 52;
        if (this.deck.remainingCards < totalCards * CONFIG.PENETRATION_THRESHOLD) {
             this.ui.showMessage('Embaralhando...', '');
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

        this.updateDisplay();
        this.soundManager.play('card');
        this.ui.toggleGameControls(false);
        this.ui.showMessage('Boa sorte!');

        const dealerUpCard = this.dealerHand[0];
        const dealerUpVal = this.getCardNumericValue(dealerUpCard);

        if (dealerUpCard.value === 'A') {
             setTimeout(() => {
                 this.ui.toggleInsuranceModal(true);
             }, 1000);
        } else if (dealerUpVal === 10) {
             this.addTimeout(() => this.checkDealerBlackjack(), 500);
        } else {
             this.addTimeout(() => this.startPlayerTurn(), 500);
        }
    }

    hit() {
        if (this.gameOver) return;

        const hand = this.playerHands[this.currentHandIndex];
        hand.cards.push(this.deck.draw());
        this.soundManager.play('card');
        this.updateDisplay();

        if (this.calculateHandValue(hand.cards) > 21) {
            hand.status = 'busted';
            this.ui.showMessage('Estourou!', 'lose');
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
        this.soundManager.play('card');

        const value = this.calculateHandValue(hand.cards);

        if (value > 21) {
            hand.status = 'busted';
            this.ui.showMessage('Estourou!', 'lose');
            this.addTimeout(() => this.nextHand(), 250);
        } else {
            hand.status = 'stand';
            this.addTimeout(() => this.nextHand(), 250);
        }

        this.updateDisplay();
    }

    endGame() {
        this.gameOver = true;
        this.dealerRevealed = true;
        const dealerValue = this.calculateHandValue(this.dealerHand);
        const dealerBJ = (dealerValue === 21 && this.dealerHand.length === 2);

        // Resolve Insurance
        if (this.insuranceTaken) {
            if (dealerBJ) {
                const insuranceWin = Math.floor(this.currentBet / 2) * CONFIG.PAYOUT.INSURANCE;
                this.balance += insuranceWin;
                this.totalWinnings += (insuranceWin - Math.floor(this.currentBet / 2));
                this.ui.showMessage('Seguro paga 2:1!', 'win');
            } else {
                // Already deducted
            }
        }


        let totalWin = 0;
        let anyWin = false;
        let allLost = true;
        let initialTotalBet = 0;

        this.playerHands.forEach(hand => {
            initialTotalBet += hand.bet;
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

            // Blackjack logic (simplified for split: no 3:2 payout on split typically)
            // Only apply 3:2 on single hand original blackjack
            if (this.playerHands.length === 1 && playerValue === 21 && hand.cards.length === 2 && result === 'win') {
                 // Check if dealer also has 21 (already handled by tie logic above, but dealer blackjack beats player 21 usually)
                 // Assuming tie logic handled same-value 21.
                 // Bonus for Blackjack
                 handWin = Math.floor(hand.bet * 2.5);
                 this.blackjacks++;
            }

            totalWin += handWin;

            if (result === 'win') anyWin = true;
            if (result !== 'lose') allLost = false;
        });

        this.balance += totalWin;
        this.totalWinnings += (totalWin - initialTotalBet);

        let message = '';
        let messageClass = '';

        if (this.playerHands.length === 1) {
             const hand = this.playerHands[0];
             const pVal = this.calculateHandValue(hand.cards);

             if (hand.status === 'surrender') { message = 'Você desistiu.'; messageClass = 'tie'; } else if (hand.status === 'busted') { message = 'Você estourou! Dealer vence!'; messageClass = 'lose'; }
             else if (dealerValue > 21) { message = 'Dealer estourou! Você venceu!'; messageClass = 'win'; }
             else if (pVal > dealerValue) {
                 if (totalWin > hand.bet * 2) message = 'BLACKJACK! Você venceu!';
                 else message = 'Você venceu!';
                 messageClass = 'win';
             }
             else if (dealerValue > pVal) { message = 'Dealer vence!'; messageClass = 'lose'; }
             else { message = 'Empate!'; messageClass = 'tie'; }
        } else {
             if (totalWin > initialTotalBet) {
                 message = `Ganhou $${totalWin}!`;
                 messageClass = 'win';
             } else if (totalWin > 0) {
                 message = `Recuperou $${totalWin}.`;
                 messageClass = 'tie';
             } else {
                 message = 'Dealer venceu todas!';
                 messageClass = 'lose';
             }
        }

        if (anyWin) {
            this.soundManager.play('win');
            this.ui.showWinAnimation(totalWin);
        } else if (allLost) {
            this.soundManager.play('lose');
        }

        this.ui.showMessage(message, messageClass);
        this.updateDisplay();

        if (this.ui.elements.hitBtn) this.ui.elements.hitBtn.disabled = true;
        if (this.ui.elements.standBtn) this.ui.elements.standBtn.disabled = true;
        if (this.ui.elements.doubleBtn) this.ui.elements.doubleBtn.disabled = true;
        if (this.ui.elements.splitBtn) this.ui.elements.splitBtn.disabled = true;
        if (this.ui.elements.surrenderBtn) this.ui.elements.surrenderBtn.disabled = true;
        this.ui.showNewGameButton();

        if (this.balance < 10) {
            setTimeout(() => {
                this.resetGame();
            }, 2000);
        }
    }

    newGame() {
        this.playerHands = [];
        this.currentHandIndex = 0;
        this.dealerHand = [];
        this.currentBet = 0;
        this.gameOver = false;
        this.dealerRevealed = false;

        this.ui.toggleGameControls(false);

        if (this.ui.elements.hitBtn) this.ui.elements.hitBtn.disabled = false;
        if (this.ui.elements.standBtn) this.ui.elements.standBtn.disabled = false;
        if (this.ui.elements.doubleBtn) this.ui.elements.doubleBtn.disabled = false;

        this.ui.showMessage('Escolha sua aposta!');
        this.updateDisplay();
    }

    adjustBet(amount) {
        if (!this.ui.elements.betInput) return;

        const currentBet = parseInt(this.ui.elements.betInput.value) || 50;
        const newBet = Math.max(10, Math.min(this.balance, currentBet + amount));
        this.ui.elements.betInput.value = newBet;
        this.soundManager.play('chip');
    }
    multiplyBet(factor) {
        if (!this.ui.elements.betInput) return;

        const currentBet = parseInt(this.ui.elements.betInput.value) || 50;
        const newBet = Math.max(10, Math.min(this.balance, Math.floor(currentBet * factor)));
        this.ui.elements.betInput.value = newBet;
        this.soundManager.play('chip');
    }

    selectChip(e) {
        const value = parseInt(e.target.dataset.value);
        if (value <= this.balance && this.ui.elements.betInput) {
            this.ui.elements.betInput.value = value;
            this.soundManager.play('chip');

            e.target.style.transform = 'scale(1.3)';
            setTimeout(() => {
                e.target.style.transform = '';
            }, 200);
        }
    }

    handleKeyboard(e) {
        if (this.gameOver || !this.gameStarted ||
            !this.ui.elements.gameControls ||
            this.ui.elements.gameControls.style.display === 'none') return;

        switch(e.key.toLowerCase()) {
            case 'h':
                if (this.ui.elements.hitBtn && !this.ui.elements.hitBtn.disabled) this.hit();
                break;
            case 's':
                if (this.ui.elements.standBtn && !this.ui.elements.standBtn.disabled) this.stand();
                break;
            case 'd':
                if (this.ui.elements.doubleBtn && !this.ui.elements.doubleBtn.disabled) this.double();
                break;
                        case 'p':
                if (this.ui.elements.splitBtn && !this.ui.elements.splitBtn.disabled && this.ui.elements.splitBtn.style.display !== 'none') this.split();
                break;
            case 'l':
                if (this.ui.elements.surrenderBtn && !this.ui.elements.surrenderBtn.disabled && this.ui.elements.surrenderBtn.style.display !== 'none') this.surrender();
                break;
            case 'escape':
                this.ui.toggleSettingsModal(false);
                break;
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

                // Update UI based on loaded settings
                this.soundManager.setEnabled(this.settings.soundEnabled);
                this.ui.setAnimationsEnabled(this.settings.animationsEnabled);
                this.ui.setStatsVisibility(this.settings.showStats);

                // Update checkboxes
                this.updateCheckbox('sound-enabled', this.settings.soundEnabled);
                this.updateCheckbox('animations-enabled', this.settings.animationsEnabled);
                this.updateCheckbox('auto-save', this.settings.autoSave);
                this.updateCheckbox('show-stats', this.settings.showStats);
            } catch (e) {
                console.warn('Could not parse settings');
            }
        }
    }

    updateCheckbox(id, checked) {
        const element = document.getElementById(id);
        if (element) element.checked = checked;
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.game = new BlackjackGame();

        // Setup global start button (since we are removing inline onclick)
        const startBtn = document.querySelector('.start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (window.game) window.game.startApp();
            });
        }

        // Setup reset button in modal
        const btnReset = document.getElementById('btn-reset-game');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                 if (window.game) window.game.resetGame();
            });
        }

        console.log('Blackjack Premium loaded successfully!');
    } catch (e) {
        console.error('Critical initialization error:', e);
    }
});

// Global error handler
window.addEventListener('error', function(e) {
    console.warn('JavaScript Error:', e.error);
    if (window.game && window.game.ui) {
        window.game.ui.showError('Erro detectado. O jogo continuará funcionando.');
    }
});
