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
            startBtn: document.querySelector('.start-btn'),
            btnReset: document.getElementById('btn-reset-game'),
            closeSettings: document.querySelector('.close')
        };
    }

    bindEvents() {
        const el = this.elements;
        const game = this.game;

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
        chips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const value = parseInt(e.target.dataset.value);
                game.setBet(value);
                e.target.style.transform = 'scale(1.3)';
                setTimeout(() => { e.target.style.transform = ''; }, 200);
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

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        if (el.closeError) el.closeError.addEventListener('click', () => this.hideError());
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
        if (!this.elements.gameControls || this.elements.gameControls.style.display === 'none') return;

        switch(e.key.toLowerCase()) {
            case 'h': this.game.hit(); break;
            case 's': this.game.stand(); break;
            case 'd': this.game.double(); break;
            case 'p': this.game.split(); break;
            case 'escape': this.toggleSettingsModal(false); break;
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
            this.calculateHandValue(state.dealerRevealed ? state.dealerHand : [state.dealerHand[0]]) : 0;

        let playerValue = 0;
        if (state.playerHands && state.playerHands.length > 0 && state.playerHands[state.currentHandIndex]) {
             playerValue = this.calculateHandValue(state.playerHands[state.currentHandIndex].cards);
        }

        if (this.elements.dealerScore) this.elements.dealerScore.textContent = state.dealerRevealed ? dealerValue : '?';
        if (this.elements.playerScore) this.elements.playerScore.textContent = playerValue;

        this.updateStats(state.wins, state.losses, state.totalWinnings, state.blackjacks);

        // Update Buttons
        if (state.playerHands.length > 0 && !state.gameOver) {
            const currentHand = state.playerHands[state.currentHandIndex];
            const canSplit = currentHand.cards.length === 2 &&
                             currentHand.cards[0].value === currentHand.cards[1].value &&
                             state.balance >= currentHand.bet;
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
                    if (this.animationsEnabled) newCardEl.style.animationDelay = `${index * 0.05}s`;
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
                    cardEl.style.animationDelay = `${index * 0.05}s`;
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

        const inner = document.createElement('div');
        inner.className = 'card-inner';

        const front = document.createElement('div');
        const isRed = card.suit === '♥' || card.suit === '♦';
        front.className = `card-face card-front ${isRed ? 'red' : 'black'}`;
        front.innerHTML = `
            <div class="suit">${card.suit}</div>
            <div class="suit-bottom">${card.suit}</div>
            <div class="value">${card.value}</div>
        `;

        const back = document.createElement('div');
        back.className = 'card-face card-back';

        inner.appendChild(front);
        inner.appendChild(back);
        cardEl.appendChild(inner);

        return cardEl;
    }

    renderPlayerHands(hands, currentHandIndex) {
        const container = this.elements.playerCards;
        if (!container) return;
        container.innerHTML = '';

        if (!hands || hands.length === 0) return;

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

    showWinAnimation(amount) {
        if (!this.animationsEnabled) return;
        this.createConfetti();
        setTimeout(() => this.createConfetti(), 250);
        setTimeout(() => this.createConfetti(), 500);
    }

    createConfetti() {
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
            setTimeout(() => { if (confetti.parentNode) confetti.remove(); }, 4000);
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

    // Helpers copied from Logic to support score rendering
    getCardNumericValue(card) {
        if (card.value === 'A') {
            return 11;
        } else if (['J', 'Q', 'K'].includes(card.value)) {
            return 10;
        } else {
            return parseInt(card.value);
        }
    }

    calculateHandValue(hand) {
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
        return value;
    }
}
