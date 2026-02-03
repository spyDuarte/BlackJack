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
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.cards = [];

        for (let suit of suits) {
            for (let value of values) {
                this.cards.push({ suit, value });
            }
        }
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
            settingsBtn: this.safeGetElement('settings-btn'),
            settingsModal: this.safeGetElement('settings-modal'),
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

    createParticles(x, y, count = 10) {
        if (!this.animationsEnabled) return;

        try {
            for (let i = 0; i < count; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle star';
                particle.style.left = (x + (Math.random() - 0.5) * 100) + 'px';
                particle.style.top = y + 'px';
                document.body.appendChild(particle);

                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.remove();
                    }
                }, 3000);
            }
        } catch (e) {
            // Ignore
        }
    }

    showWinAnimation() {
        if (!this.animationsEnabled) return;

        try {
            const winText = document.createElement('div');
            winText.className = 'win-animation';
            winText.textContent = 'VITÓRIA!';
            document.body.appendChild(winText);

            setTimeout(() => {
                if (winText.parentNode) {
                    winText.remove();
                }
            }, 2000);

            // Create particles
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    this.createParticles(
                        Math.random() * window.innerWidth,
                        Math.random() * window.innerHeight,
                        15
                    );
                }, i * 200);
            }
        } catch (e) {
            // Ignore
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
            const steps = 20;
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
            }, 30);
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
                cardEl.style.animationDelay = `${index * 0.1}s`;
            }
            container.appendChild(cardEl);
        });
    }

    toggleSettingsModal(show) {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.style.display = show ? 'block' : 'none';
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

    initializeGameState() {
        this.playerHand = [];
        this.dealerHand = [];
        this.balance = 1000;
        this.currentBet = 0;
        this.wins = 0;
        this.losses = 0;
        this.blackjacks = 0;
        this.totalWinnings = 0;
        this.gameOver = false;
        this.dealerRevealed = false;
        this.gameStarted = false;
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
        if (el.newGameBtn) el.newGameBtn.addEventListener('click', () => this.newGame());

        if (el.betDecrease) el.betDecrease.addEventListener('click', () => this.adjustBet(-10));
        if (el.betIncrease) el.betIncrease.addEventListener('click', () => this.adjustBet(10));

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
        }, 800);
    }

    resetGame() {
        if (confirm('Tem certeza que deseja resetar o jogo? Todos os dados serão perdidos.')) {
            this.initializeGameState();
            this.newGame();
            this.updateDisplay();
            StorageManager.remove('blackjack-premium-save');
            this.ui.showMessage('Jogo resetado!');
            this.ui.toggleSettingsModal(false);
        }
    }

    calculateHandValue(hand) {
        let value = 0;
        let aces = 0;

        for (let card of hand) {
            if (!card) continue; // Safety check for undefined cards

            if (card.value === 'A') {
                value += 11;
                aces++;
            } else if (['J', 'Q', 'K'].includes(card.value)) {
                value += 10;
            } else {
                value += parseInt(card.value);
            }
        }

        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    updateDisplay() {
        this.ui.updateBalance(this.balance);
        this.ui.updateCurrentBet(this.currentBet);
        this.ui.updateWins(this.wins);
        this.ui.updateLosses(this.losses);

        this.ui.renderHand(this.ui.elements.dealerCards, this.dealerHand, true, this.dealerRevealed);
        this.ui.renderHand(this.ui.elements.playerCards, this.playerHand, false, false);

        // Check for empty dealer hand to avoid error
        const dealerValue = (this.dealerHand && this.dealerHand.length > 0) ?
            this.calculateHandValue(this.dealerRevealed ? this.dealerHand : [this.dealerHand[0]]) : 0;

        const playerValue = this.calculateHandValue(this.playerHand);

        this.ui.updateDealerScore(this.dealerRevealed ? dealerValue : '?');
        this.ui.updatePlayerScore(playerValue);

        this.ui.updateStats(this.wins, this.losses, this.totalWinnings, this.blackjacks);

        if (this.settings.autoSave && this.gameStarted) {
            this.saveGame();
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

        this.deck.reset();
        this.deck.shuffle();

        this.playerHand = [this.deck.draw(), this.deck.draw()];
        this.dealerHand = [this.deck.draw(), this.deck.draw()];

        this.ui.toggleGameControls(true);
        this.ui.showMessage('Boa sorte!');
        this.soundManager.play('card');

        this.updateDisplay();

        if (this.calculateHandValue(this.playerHand) === 21) {
            setTimeout(() => this.endGame(), 1000);
        }

        if (this.ui.elements.doubleBtn) {
            this.ui.elements.doubleBtn.disabled = this.balance < this.currentBet;
        }
    }

    hit() {
        if (this.gameOver) return;

        this.playerHand.push(this.deck.draw());
        this.soundManager.play('card');
        this.updateDisplay();

        if (this.calculateHandValue(this.playerHand) > 21) {
            setTimeout(() => this.endGame(), 500);
        }

        if (this.ui.elements.doubleBtn) {
            this.ui.elements.doubleBtn.disabled = true;
        }
    }

    stand() {
        if (this.gameOver) return;

        this.dealerRevealed = true;
        this.soundManager.play('card');

        const dealerDraw = setInterval(() => {
            if (this.calculateHandValue(this.dealerHand) < 17) {
                this.dealerHand.push(this.deck.draw());
                this.soundManager.play('card');
                this.updateDisplay();
            } else {
                clearInterval(dealerDraw);
                setTimeout(() => this.endGame(), 500);
            }
        }, 600);
    }

    double() {
        if (this.gameOver || this.balance < this.currentBet) return;

        this.balance -= this.currentBet;
        this.currentBet *= 2;
        this.hit();

        if (!this.gameOver) {
            setTimeout(() => this.stand(), 500);
        }
    }

    endGame() {
        this.gameOver = true;
        this.dealerRevealed = true;

        const playerValue = this.calculateHandValue(this.playerHand);
        const dealerValue = this.calculateHandValue(this.dealerHand);

        let message = '';
        let messageClass = '';
        let winAmount = 0;

        if (playerValue > 21) {
            message = 'Você estourou! Dealer vence!';
            messageClass = 'lose';
            this.losses++;
            this.soundManager.play('lose');
        } else if (dealerValue > 21) {
            message = 'Dealer estourou! Você venceu!';
            messageClass = 'win';
            winAmount = this.currentBet * 2;
            this.wins++;
            this.soundManager.play('win');
            this.ui.showWinAnimation();
        } else if (playerValue > dealerValue) {
            message = 'Você venceu!';
            messageClass = 'win';
            winAmount = this.currentBet * 2;
            this.wins++;
            this.soundManager.play('win');
            this.ui.showWinAnimation();
        } else if (dealerValue > playerValue) {
            message = 'Dealer vence!';
            messageClass = 'lose';
            this.losses++;
            this.soundManager.play('lose');
        } else {
            message = 'Empate!';
            messageClass = 'tie';
            winAmount = this.currentBet;
        }

        if (playerValue === 21 && this.playerHand.length === 2 && messageClass === 'win') {
            message = 'BLACKJACK! Você venceu!';
            winAmount = Math.floor(this.currentBet * 2.5);
            this.blackjacks++;
        }

        this.balance += winAmount;
        this.totalWinnings += (winAmount - this.currentBet);

        this.ui.showMessage(message, messageClass);
        this.updateDisplay();

        if (this.ui.elements.hitBtn) this.ui.elements.hitBtn.disabled = true;
        if (this.ui.elements.standBtn) this.ui.elements.standBtn.disabled = true;
        if (this.ui.elements.doubleBtn) this.ui.elements.doubleBtn.disabled = true;
        this.ui.showNewGameButton();

        if (this.balance < 10) {
            setTimeout(() => {
                this.resetGame();
            }, 2000);
        }
    }

    newGame() {
        this.playerHand = [];
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
