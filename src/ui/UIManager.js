import * as HandUtils from '../utils/HandUtils.js';
import { CONFIG } from '../core/Constants.js';

export class UIManager {
    constructor() {
        this.elements = {};
        this.animationsEnabled = true;
        this.game = null;
    }

    initialize(game) {
        this.game = game;
        this.cacheElements();
        this.bindEvents();
        this.toggleLoading(false);
    }

    cacheElements() {
        this.elements = {
            balance: document.getElementById('balance'),
            currentBet: document.getElementById('current-bet'),
            wins: document.getElementById('wins'),
            losses: document.getElementById('losses'),
            dealerCards: document.getElementById('dealer-cards'),
            playerCards: document.getElementById('player-cards'),
            dealerScore: document.getElementById('dealer-score'),
            playerScore: document.getElementById('player-score'),
            message: document.getElementById('message'),
            betControls: document.getElementById('bet-controls'),
            gameControls: document.getElementById('game-controls'),
            betInput: document.getElementById('bet-input'),
            betBtn: document.getElementById('bet-btn'),
            hitBtn: document.getElementById('hit-btn'),
            standBtn: document.getElementById('stand-btn'),
            doubleBtn: document.getElementById('double-btn'),
            newGameBtn: document.getElementById('new-game-btn'),
            betDecrease: document.getElementById('bet-decrease'),
            betIncrease: document.getElementById('bet-increase'),
            betDoubleValue: document.getElementById('bet-double-value'),
            betMaxValue: document.getElementById('bet-max-value'),
            splitBtn: document.getElementById('split-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            insuranceModal: document.getElementById('insurance-modal'),
            insuranceYesBtn: document.getElementById('insurance-yes-btn'),
            insuranceNoBtn: document.getElementById('insurance-no-btn'),
            surrenderBtn: document.getElementById('surrender-btn'),
            statsContainer: document.getElementById('stats-container'),
            loading: document.querySelector('.loading'),
            welcomeScreen: document.getElementById('welcome-screen'),
            errorNotification: document.getElementById('error-notification'),
            errorMessage: document.getElementById('error-message'),
            closeError: document.querySelector('.close-error'),
            totalGames: document.getElementById('total-games'),
            winRate: document.getElementById('win-rate'),
            totalWinnings: document.getElementById('total-winnings'),
            blackjacks: document.getElementById('blackjacks'),
            startBtn: document.getElementById('start-game-btn'),
            btnReset: document.getElementById('btn-reset-game'),
            closeSettings: document.querySelector('.close'),
            loginScreen: document.getElementById('login-screen'),
            loginUsername: document.getElementById('login-username'),
            loginBtn: document.getElementById('login-btn'),
            loginError: document.getElementById('login-error'),
            volumeSlider: document.getElementById('volume-slider'),
            volumeValue: document.getElementById('volume-value'),
            themeDark: document.getElementById('theme-dark'),
            themeLight: document.getElementById('theme-light'),
            exportBtn: document.getElementById('btn-export-data'),
            importInput: document.getElementById('btn-import-data')
        };
    }

    bindEvents() {
        const el = this.elements;
        const game = this.game;

        if (el.loginBtn) el.loginBtn.addEventListener('click', () => this.handleLogin());
        if (el.loginUsername) {
            el.loginUsername.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        }

        if (el.startBtn) el.startBtn.addEventListener('click', () => game.startApp());
        if (el.btnReset) el.btnReset.addEventListener('click', () => game.resetGame());

        if (el.betBtn) el.betBtn.addEventListener('click', () => game.startGame());
        if (el.hitBtn) el.hitBtn.addEventListener('click', () => game.hit());
        if (el.standBtn) el.standBtn.addEventListener('click', () => game.stand());
        if (el.doubleBtn) el.doubleBtn.addEventListener('click', () => game.double());
        if (el.splitBtn) el.splitBtn.addEventListener('click', () => game.split());
        if (el.surrenderBtn) el.surrenderBtn.addEventListener('click', () => game.surrender());

        if (el.insuranceYesBtn) el.insuranceYesBtn.addEventListener('click', () => game.respondToInsurance(true));
        if (el.insuranceNoBtn) el.insuranceNoBtn.addEventListener('click', () => game.respondToInsurance(false));
        if (el.newGameBtn) el.newGameBtn.addEventListener('click', () => game.newGame());

        if (el.betDecrease) el.betDecrease.addEventListener('click', () => game.adjustBet(-10));
        if (el.betIncrease) el.betIncrease.addEventListener('click', () => game.adjustBet(10));
        if (el.betDoubleValue) el.betDoubleValue.addEventListener('click', () => game.multiplyBet(2));
        if (el.betMaxValue) el.betMaxValue.addEventListener('click', () => game.maxBet());

        if (el.betInput) {
            el.betInput.addEventListener('change', (e) => game.setBet(parseInt(e.target.value)));
            el.betInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') game.startGame();
            });
        }

        const chips = document.querySelectorAll('.chip');
        const handleChip = (e) => {
            const value = parseInt(e.target.dataset.value);
            game.setBet(value);
            e.target.style.transform = 'scale(1.3)';
            setTimeout(() => { e.target.style.transform = ''; }, 200);
        };
        chips.forEach(chip => {
            chip.addEventListener('click', handleChip);
            chip.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleChip(e);
                }
            });
        });

        if (el.settingsBtn) el.settingsBtn.addEventListener('click', () => this.toggleSettingsModal(true));
        if (el.closeSettings) el.closeSettings.addEventListener('click', () => this.toggleSettingsModal(false));

        window.addEventListener('click', (e) => {
            if (e.target === el.settingsModal) this.toggleSettingsModal(false);
        });

        this.bindCheckbox('sound-enabled', (checked) => game.updateSetting('soundEnabled', checked));
        this.bindCheckbox('animations-enabled', (checked) => game.updateSetting('animationsEnabled', checked));
        this.bindCheckbox('auto-save', (checked) => game.updateSetting('autoSave', checked));
        this.bindCheckbox('show-stats', (checked) => game.updateSetting('showStats', checked));

        if (el.volumeSlider) {
            el.volumeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                if (el.volumeValue) el.volumeValue.textContent = `${value}%`;
                game.updateSetting('volume', value / 100);
            });
        }

        // Theme toggle
        if (el.themeDark) el.themeDark.addEventListener('click', () => this.setTheme('dark'));
        if (el.themeLight) el.themeLight.addEventListener('click', () => this.setTheme('light'));

        // Export/Import
        if (el.exportBtn) el.exportBtn.addEventListener('click', () => game.exportData());
        if (el.importInput) {
            el.importInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) game.importData(file);
                e.target.value = '';
            });
        }

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        if (el.closeError) el.closeError.addEventListener('click', () => this.hideError());
    }

    sanitizeUsername(raw) {
        // Allow only alphanumeric characters, underscores and hyphens
        return raw.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F]/g, '').slice(0, 20);
    }

    handleLogin() {
        const rawUsername = this.elements.loginUsername.value.trim();
        if (!rawUsername) {
            this.showLoginError('Por favor, digite um nome de usuário.');
            return;
        }

        const username = this.sanitizeUsername(rawUsername);
        if (username.length < 3) {
            this.showLoginError('Nome de usuário deve ter pelo menos 3 caracteres (apenas letras, números e _).');
            return;
        }

        this.game.login(username);

        if (this.elements.loginScreen) {
            this.elements.loginScreen.classList.add('hidden');
            setTimeout(() => {
                this.elements.loginScreen.style.display = 'none';
                if (this.elements.welcomeScreen) {
                    this.elements.welcomeScreen.style.display = 'flex';
                    this.elements.welcomeScreen.classList.remove('hidden');
                }
            }, 500);
        }
    }

    showLoginError(msg) {
        if (this.elements.loginError) {
            this.elements.loginError.textContent = msg;
            this.elements.loginUsername.classList.add('error');
            setTimeout(() => this.elements.loginUsername.classList.remove('error'), 500);
        }
    }

    bindCheckbox(id, callback) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', (e) => {
                callback(e.target.checked);
            });
        }
    }

    handleKeyboard(e) {
        if (e.key === 'Escape') {
            this.toggleSettingsModal(false);
            return;
        }

        if (!this.elements.gameControls || this.elements.gameControls.style.display === 'none') return;

        const keyMap = {
            'h': { action: () => this.game.hit(), btn: this.elements.hitBtn },
            's': { action: () => this.game.stand(), btn: this.elements.standBtn },
            'd': { action: () => this.game.double(), btn: this.elements.doubleBtn },
            'p': { action: () => this.game.split(), btn: this.elements.splitBtn },
            'r': { action: () => this.game.surrender(), btn: this.elements.surrenderBtn }
        };

        const entry = keyMap[e.key.toLowerCase()];
        if (entry) {
            entry.action();
            if (entry.btn && !entry.btn.disabled && entry.btn.style.display !== 'none') {
                entry.btn.classList.add('kbd-active');
                setTimeout(() => entry.btn.classList.remove('kbd-active'), 150);
            }
        }
    }

    render(state) {
        if (!state) return;

        if (this.elements.balance) this.animateValue(this.elements.balance, state.balance, '$');
        if (this.elements.currentBet) this.animateValue(this.elements.currentBet, state.currentBet, '$');
        if (this.elements.wins) this.animateValue(this.elements.wins, state.wins);
        if (this.elements.losses) this.animateValue(this.elements.losses, state.losses);
        if (this.elements.betInput) this.elements.betInput.value = state.currentBet;

        this.renderHand(this.elements.dealerCards, state.dealerHand, true, state.dealerRevealed);
        this.renderPlayerHands(state.playerHands, state.currentHandIndex);

        // Scores
        const dealerValue = (state.dealerHand && state.dealerHand.length > 0) ?
            HandUtils.calculateHandValue(state.dealerRevealed ? state.dealerHand : [state.dealerHand[0]]) : 0;

        let playerValue = 0;
        if (state.playerHands && state.playerHands.length > 0 && state.playerHands[state.currentHandIndex]) {
             playerValue = HandUtils.calculateHandValue(state.playerHands[state.currentHandIndex].cards);
        }

        if (this.elements.dealerScore) this.elements.dealerScore.textContent = state.dealerRevealed ? dealerValue : '?';
        if (this.elements.playerScore) this.elements.playerScore.textContent = playerValue;

        this.updateStats(state.wins, state.losses, state.totalWinnings, state.blackjacks);

        // Update Buttons
        if (state.playerHands.length > 0 && !state.gameOver) {
            const currentHand = state.playerHands[state.currentHandIndex];
            const canSplit = currentHand.cards.length === 2 &&
                             currentHand.cards[0].value === currentHand.cards[1].value &&
                             state.balance >= currentHand.bet &&
                             state.playerHands.length <= CONFIG.MAX_SPLITS;
            if (this.elements.splitBtn) {
                 this.elements.splitBtn.style.display = canSplit ? 'inline-block' : 'none';
                 this.elements.splitBtn.disabled = !canSplit;
            }

            const canSurrender = currentHand.cards.length === 2 && state.playerHands.length === 1 && currentHand.status === 'playing';
            if (this.elements.surrenderBtn) {
                this.elements.surrenderBtn.style.display = canSurrender ? 'inline-block' : 'none';
                this.elements.surrenderBtn.disabled = !canSurrender;
            }

            if (this.elements.doubleBtn) {
                const canDouble = currentHand.status === 'playing' && state.balance >= currentHand.bet && currentHand.cards.length === 2;
                this.elements.doubleBtn.disabled = !canDouble;
            }
        } else {
            if (this.elements.splitBtn) this.elements.splitBtn.style.display = 'none';
        }
    }

    renderHand(container, hand, isDealer, revealDealer) {
        if (!container) return;

        if (!hand || hand.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Sync hand cards with DOM elements to support transitions
        hand.forEach((card, index) => {
            const isHidden = isDealer && index === 1 && !revealDealer;
            let cardEl = container.children[index];

            if (cardEl) {
                // Check if card content matches (to detect new vs same card)
                const currentVal = cardEl.querySelector('.value')?.textContent;
                const currentSuit = cardEl.querySelector('.suit')?.textContent;

                if (currentVal !== card.value || currentSuit !== card.suit) {
                    // Mismatch: Replace element to trigger deal animation
                    const newCardEl = this.createCardElement(card, isHidden);
                    if (this.animationsEnabled) newCardEl.style.animationDelay = `${index * 0.12}s`;
                    container.replaceChild(newCardEl, cardEl);
                } else {
                    // Match: Just handle flip
                    if (isHidden) {
                        cardEl.classList.add('flipped');
                    } else {
                        cardEl.classList.remove('flipped');
                    }
                }
            } else {
                // New card
                cardEl = this.createCardElement(card, isHidden);
                if (this.animationsEnabled) {
                    cardEl.style.animationDelay = `${index * 0.12}s`;
                }
                container.appendChild(cardEl);
            }
        });

        // Remove excess cards
        while (container.children.length > hand.length) {
            container.removeChild(container.lastChild);
        }
    }

    createCardElement(card, hidden = false) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        if (hidden) cardEl.classList.add('flipped');

        const suitNames = { '♠': 'Espadas', '♥': 'Copas', '♦': 'Ouros', '♣': 'Paus' };
        const suitName = suitNames[card.suit] || card.suit;
        cardEl.setAttribute('aria-label', hidden ? 'Carta virada' : `${card.value} de ${suitName}`);

        const inner = document.createElement('div');
        inner.className = 'card-inner';

        const front = document.createElement('div');
        const isRed = card.suit === '♥' || card.suit === '♦';
        front.className = `card-face card-front ${isRed ? 'red' : 'black'}`;
        const suitTop = document.createElement('div');
        suitTop.className = 'suit';
        suitTop.textContent = card.suit;

        const suitBottom = document.createElement('div');
        suitBottom.className = 'suit-bottom';
        suitBottom.textContent = card.suit;

        const valueEl = document.createElement('div');
        valueEl.className = 'value';
        valueEl.textContent = card.value;

        front.appendChild(suitTop);
        front.appendChild(suitBottom);
        front.appendChild(valueEl);

        const back = document.createElement('div');
        back.className = 'card-face card-back';
        back.setAttribute('aria-hidden', 'true');

        inner.appendChild(front);
        inner.appendChild(back);
        cardEl.appendChild(inner);

        return cardEl;
    }

    renderPlayerHands(hands, currentHandIndex) {
        const container = this.elements.playerCards;
        if (!container) return;

        if (!hands || hands.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Single hand: render directly into container (no wrappers)
        if (hands.length === 1) {
            // Remove any hand-container wrappers from previous split state
            if (container.firstChild && container.firstChild.classList &&
                container.firstChild.classList.contains('hand-container')) {
                container.innerHTML = '';
            }
            this.renderHand(container, hands[0].cards, false, false);
            return;
        }

        // Multiple hands: use incremental DOM updates
        hands.forEach((hand, index) => {
            let handWrapper = container.children[index];

            if (!handWrapper || !handWrapper.classList.contains('hand-container')) {
                // Create new wrapper if missing or wrong type
                handWrapper = document.createElement('div');
                handWrapper.className = 'hand-container';

                const infoDiv = document.createElement('div');
                infoDiv.className = 'hand-info';
                handWrapper.appendChild(infoDiv);

                const cardsContainer = document.createElement('div');
                cardsContainer.className = 'hand-cards-inner';
                cardsContainer.style.display = 'flex';
                cardsContainer.style.gap = '10px';
                cardsContainer.style.justifyContent = 'center';
                cardsContainer.style.flexWrap = 'wrap';
                handWrapper.appendChild(cardsContainer);

                if (container.children[index]) {
                    container.replaceChild(handWrapper, container.children[index]);
                } else {
                    container.appendChild(handWrapper);
                }
            }

            // Update active state
            handWrapper.classList.toggle('active-hand', index === currentHandIndex);

            // Update bet info
            const infoDiv = handWrapper.querySelector('.hand-info');
            if (infoDiv) infoDiv.textContent = `$${hand.bet}`;

            // Update cards incrementally
            const cardsContainer = handWrapper.querySelector('.hand-cards-inner') || handWrapper.lastElementChild;
            this.renderHand(cardsContainer, hand.cards, false, false);
        });

        // Remove excess wrappers
        while (container.children.length > hands.length) {
            container.removeChild(container.lastChild);
        }
    }

    toggleGameControls(show) {
        if (this.elements.betControls) this.elements.betControls.style.display = show ? 'none' : 'flex';
        if (this.elements.gameControls) this.elements.gameControls.style.display = show ? 'flex' : 'none';
        if (this.elements.newGameBtn) this.elements.newGameBtn.style.display = 'none';
    }

    showNewGameButton() {
        if (this.elements.newGameBtn) this.elements.newGameBtn.style.display = 'inline-block';
    }

    showMessage(text, type) {
        if (this.elements.message) {
            this.elements.message.textContent = text;
            this.elements.message.className = `message ${type}`;
        }
    }

    toggleLoading(show) {
        if (this.elements.loading) this.elements.loading.style.display = show ? 'block' : 'none';
    }

    hideWelcomeScreen() {
        if (this.elements.welcomeScreen) {
            this.elements.welcomeScreen.classList.add('hidden');
            setTimeout(() => { this.elements.welcomeScreen.style.display = 'none'; }, 500);
        }
    }

    toggleSettingsModal(show) {
        if (this.elements.settingsModal) this.elements.settingsModal.style.display = show ? 'block' : 'none';
    }

    toggleInsuranceModal(show) {
        if (this.elements.insuranceModal) this.elements.insuranceModal.style.display = show ? 'block' : 'none';
    }

    setAnimationsEnabled(enabled) { this.animationsEnabled = enabled; }
    setStatsVisibility(visible) {
        if (this.elements.statsContainer) this.elements.statsContainer.style.display = visible ? 'block' : 'none';
    }
    setVolume(value) {
        const percent = Math.round(value * 100);
        if (this.elements.volumeSlider) this.elements.volumeSlider.value = percent;
        if (this.elements.volumeValue) this.elements.volumeValue.textContent = `${percent}%`;
    }
    setTheme(theme) {
        document.body.classList.add('theme-transition');
        if (theme === 'light') {
            document.body.classList.add('theme-light');
        } else {
            document.body.classList.remove('theme-light');
        }
        if (this.elements.themeDark) this.elements.themeDark.classList.toggle('active', theme !== 'light');
        if (this.elements.themeLight) this.elements.themeLight.classList.toggle('active', theme === 'light');
        if (this.game) this.game.updateSetting('theme', theme);
        setTimeout(() => document.body.classList.remove('theme-transition'), 350);
    }

    showWinAnimation(amount) {
        if (!this.animationsEnabled) return;
        this.clearConfetti();
        this.createConfetti();
        setTimeout(() => this.createConfetti(), 250);
        setTimeout(() => this.createConfetti(), 500);
    }

    clearConfetti() {
        if (this._activeConfetti) {
            this._activeConfetti.forEach(el => { if (el.parentNode) el.remove(); });
        }
        this._activeConfetti = [];
    }

    createConfetti() {
        if (!this._activeConfetti) this._activeConfetti = [];
        const colors = ['#FFD700', '#FFA500', '#2ecc71', '#3498db', '#e74c3c', '#ffffff'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            const bg = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100 + 'vw';
            const animDuration = (Math.random() * 0.75 + 0.75) + 's';
            const fallX = (Math.random() * 200 - 100) + 'px';
            confetti.style.backgroundColor = bg;
            confetti.style.left = left;
            confetti.style.animationDuration = animDuration;
            confetti.style.setProperty('--fall-x', fallX);
            document.body.appendChild(confetti);
            this._activeConfetti.push(confetti);
            setTimeout(() => {
                if (confetti.parentNode) confetti.remove();
                const idx = this._activeConfetti.indexOf(confetti);
                if (idx > -1) this._activeConfetti.splice(idx, 1);
            }, 4000);
        }
    }

    showError(msg) {
        if (this.elements.errorMessage) this.elements.errorMessage.textContent = msg;
        if (this.elements.errorNotification) this.elements.errorNotification.classList.add('show');
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        if (this.elements.errorNotification) this.elements.errorNotification.classList.remove('show');
    }

    updateStats(wins, losses, totalWinnings, blackjacks) {
         const totalGames = wins + losses;
         const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
         if(this.elements.totalGames) this.animateValue(this.elements.totalGames, totalGames);
         if(this.elements.winRate) this.animateValue(this.elements.winRate, winRate, '', '%');
         if(this.elements.totalWinnings) this.animateValue(this.elements.totalWinnings, totalWinnings, '$');
         if(this.elements.blackjacks) this.animateValue(this.elements.blackjacks, blackjacks);
    }

    animateValue(element, target, prefix = '', suffix = '') {
        if (!element) return;

        // Cancel existing animation if any
        if (element.dataset.animId) {
            cancelAnimationFrame(parseInt(element.dataset.animId));
            delete element.dataset.animId;
        }

        // If animations disabled, update instantly
        if (!this.animationsEnabled) {
            element.textContent = `${prefix}${target}${suffix}`;
            return;
        }

        const currentText = element.textContent.replace(/[^0-9.-]/g, '');
        let start = parseInt(currentText);
        if (isNaN(start)) start = 0;

        if (start === target) {
             element.textContent = `${prefix}${target}${suffix}`;
             return;
        }

        const duration = 500;
        const startTime = performance.now();

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            const value = Math.round(start + ((target - start) * ease));
            element.textContent = `${prefix}${value}${suffix}`;

            if (progress < 1) {
                element.dataset.animId = requestAnimationFrame(step);
            } else {
                element.textContent = `${prefix}${target}${suffix}`;
                delete element.dataset.animId;
            }
        };

        element.dataset.animId = requestAnimationFrame(step);
    }
}
