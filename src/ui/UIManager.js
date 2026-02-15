import * as HandUtils from '../utils/HandUtils.js';
import { ARCHITECTURE_FLAGS, CONFIG } from '../core/Constants.js';
import { debounce } from '../utils/debounce.js';
import { supabase } from '../supabaseClient.js';
import { Renderer } from './modules/Renderer.js';
import { UIBindings } from './modules/UIBindings.js';
import { Feedback } from './modules/Feedback.js';

export class UIManager {
    constructor() {
        this.elements = {};
        this.animationsEnabled = true;
        this.game = null;
        this.isRegisterMode = false;
        this.renderer = new Renderer(this);
        this.uiBindings = new UIBindings(this);
        this.feedback = new Feedback(this);
    }

    initialize(game) {
        this.game = game;
        this.cacheElements();
        this.bindEvents();
        this.toggleLoading(false);
        this.updateAuthUI();
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
            userBtn: document.getElementById('user-btn'),
            settingsModal: document.getElementById('settings-modal'),
            insuranceModal: document.getElementById('insurance-modal'),
            insuranceYesBtn: document.getElementById('insurance-yes-btn'),
            insuranceNoBtn: document.getElementById('insurance-no-btn'),
            surrenderBtn: document.getElementById('surrender-btn'),
            rebetBtn: document.getElementById('rebet-btn'),
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
            loginEmail: document.getElementById('login-email'),
            loginPassword: document.getElementById('login-password'),
            loginBtn: document.getElementById('login-btn'),
            loginError: document.getElementById('login-error'),

            // Menu/Auth Elements
            userInfo: document.getElementById('user-info'),
            guestControls: document.getElementById('guest-controls'),
            userControls: document.getElementById('user-controls'),
            menuLoginBtn: document.getElementById('menu-login-btn'),
            menuRegisterBtn: document.getElementById('menu-register-btn'),
            menuLogoutBtn: document.getElementById('menu-logout-btn'),

            // Register Screen
            registerScreen: document.getElementById('register-screen'),
            registerUsername: document.getElementById('register-username'),
            registerEmail: document.getElementById('register-email'),
            registerPassword: document.getElementById('register-password'),
            registerConfirmPassword: document.getElementById('register-confirm-password'),
            registerBtn: document.getElementById('register-btn'),
            registerError: document.getElementById('register-error'),
            togglePassword: document.getElementById('toggle-password'),
            passwordStrength: document.getElementById('password-strength'),
            strengthBar: document.getElementById('strength-bar'),
            strengthLabel: document.getElementById('strength-label'),
            usernameHint: document.getElementById('username-hint'),

            // Auth Controls
            goToRegister: document.getElementById('go-to-register'),
            goToLogin: document.getElementById('go-to-login'),

            volumeSlider: document.getElementById('volume-slider'),
            volumeValue: document.getElementById('volume-value'),
            themeDark: document.getElementById('theme-dark'),
            themeLight: document.getElementById('theme-light'),
            exportBtn: document.getElementById('btn-export-data'),
            importInput: document.getElementById('btn-import-data'),
            toastContainer: document.getElementById('toast-container'),
            shoeBar: document.getElementById('shoe-bar'),
            shoeLabel: document.getElementById('shoe-label'),
            activeRuleProfile: document.getElementById('active-rule-profile'),

            // Modal tabs
            tabBtnSettings: document.getElementById('tab-btn-settings'),
            tabBtnAccount: document.getElementById('tab-btn-account'),
            tabSettings: document.getElementById('tab-settings'),
            tabAccount: document.getElementById('tab-account'),

            // Account tab elements
            accountLoggedIn: document.getElementById('account-logged-in'),
            accountLoggedOut: document.getElementById('account-logged-out'),
            loginSection: document.getElementById('login-section'),
            registerSection: document.getElementById('register-section'),

            // New feature elements
            hintBtn: document.getElementById('hint-btn'),
            trainingFeedback: document.getElementById('training-feedback'),
            trainingModeToggle: document.getElementById('training-mode-toggle'),
            historyPanel: document.getElementById('history-panel'),
            historyToggle: document.getElementById('history-toggle'),
            historyList: document.getElementById('history-list'),
            statsModalBtn: document.getElementById('stats-modal-btn'),
            statsModal: document.getElementById('stats-modal'),
            statsAdvancedGrid: document.getElementById('stats-advanced-grid'),
            statsChartWinrate: document.getElementById('stats-chart-winrate'),
            statsChartStreak: document.getElementById('stats-chart-streak'),
            statsModalClose: document.querySelector('.stats-modal-close'),
        };
    }

    bindEvents() {
        if (ARCHITECTURE_FLAGS.enableUIBindingsModule) {
            this.uiBindings.bindEvents();
            return;
        }
        this._bindEventsCore();
    }

    _bindEventsCore() {
        const el = this.elements;
        const game = this.game;

        // Modal tab switching
        if (el.tabBtnSettings) {
            el.tabBtnSettings.addEventListener('click', () => this._switchTab('settings'));
        }
        if (el.tabBtnAccount) {
            el.tabBtnAccount.addEventListener('click', () => this._switchTab('account'));
        }

        // Auth events (forms are now inside the modal account tab)
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuthAction('login');
            });
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuthAction('register');
            });
        }

        if (el.goToRegister) {
            el.goToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthMode(true);
            });
        }

        if (el.goToLogin) {
            el.goToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthMode(false);
            });
        }

        // Password strength feedback on register form
        if (el.registerPassword) {
            el.registerPassword.addEventListener('input', () => this.updatePasswordStrength());
        }
        if (el.togglePassword) {
            el.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }
        if (el.registerUsername) {
            el.registerUsername.addEventListener('input', (e) => {
                e.target.value = this.sanitizeUsername(e.target.value);
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
        if (el.rebetBtn) el.rebetBtn.addEventListener('click', () => game.rebetAndDeal());

        if (el.betDecrease) el.betDecrease.addEventListener('click', () => game.adjustBet(-CONFIG.MIN_BET));
        if (el.betIncrease) el.betIncrease.addEventListener('click', () => game.adjustBet(CONFIG.MIN_BET));
        if (el.betDoubleValue) el.betDoubleValue.addEventListener('click', () => game.multiplyBet(2));
        if (el.betMaxValue) el.betMaxValue.addEventListener('click', () => game.maxBet());

        if (el.betInput) {
            el.betInput.addEventListener('change', (e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= CONFIG.MIN_BET && value <= game.balance) {
                    game.setBet(value);
                } else {
                    e.target.value = game.currentBet;
                }
            });
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

        if (el.userBtn) el.userBtn.addEventListener('click', () => {
            this.updateAuthUI();
            this.toggleSettingsModal(true);
        });
        if (el.closeSettings) el.closeSettings.addEventListener('click', () => this.toggleSettingsModal(false));

        // Logout button (inside account tab)
        if (el.menuLogoutBtn) el.menuLogoutBtn.addEventListener('click', () => {
            this.toggleSettingsModal(false);
            game.logout();
        });

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

        // Debounced resize handler for layout recalculations
        window.addEventListener('resize', debounce(() => {
            if (this.game) this.game.updateUI();
        }, 250));

        if (el.closeError) el.closeError.addEventListener('click', () => this.hideError());

        // Hint button
        if (el.hintBtn) el.hintBtn.addEventListener('click', () => this._showHint());

        // Training mode toggle
        if (el.trainingModeToggle) {
            el.trainingModeToggle.addEventListener('change', (e) => {
                if (this.game) this.game.toggleTrainingMode(e.target.checked);
            });
        }

        // History panel toggle
        if (el.historyToggle) {
            el.historyToggle.addEventListener('click', () => this._toggleHistory());
        }

        // Advanced stats modal
        if (el.statsModalBtn) {
            el.statsModalBtn.addEventListener('click', () => this._openStatsModal());
        }
        if (el.statsModalClose) {
            el.statsModalClose.addEventListener('click', () => this._closeStatsModal());
        }
        if (el.statsModal) {
            el.statsModal.addEventListener('click', (e) => {
                if (e.target === el.statsModal) this._closeStatsModal();
            });
        }
    }

    sanitizeUsername(raw) {
        // Allow only alphanumeric characters, underscores and hyphens
        return raw.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F]/g, '').slice(0, 20);
    }

    toggleAuthMode(isRegister) {
        this.isRegisterMode = isRegister;
        const el = this.elements;

        if (el.loginSection) el.loginSection.style.display = isRegister ? 'none' : 'block';
        if (el.registerSection) el.registerSection.style.display = isRegister ? 'block' : 'none';

        this.clearAuthErrors();
    }

    clearAuthErrors() {
        const el = this.elements;
        [el.loginError, el.registerError].forEach((errorEl) => {
            if (errorEl) errorEl.textContent = '';
        });

        [el.loginEmail, el.registerEmail].forEach((inputEl) => {
            if (inputEl) inputEl.classList.remove('error');
        });
    }

    async handleAuthAction(mode = null) {
        const el = this.elements;
        const isRegisterMode = mode ? mode === 'register' : this.isRegisterMode;
        this.isRegisterMode = isRegisterMode;

        const email = isRegisterMode ? el.registerEmail.value.trim() : el.loginEmail.value.trim();
        const password = isRegisterMode ? el.registerPassword.value : el.loginPassword.value;

        if (isRegisterMode) {
            const username = el.registerUsername ? el.registerUsername.value.trim() : '';
            const confirmPassword = el.registerConfirmPassword ? el.registerConfirmPassword.value : '';

            if (!username || !email || !password || !confirmPassword) {
                this.showLoginError('Por favor, preencha todos os campos.');
                return;
            }

            if (username.length < 3) {
                this.showLoginError('O nome de usuário deve ter pelo menos 3 caracteres.');
                return;
            }

            if (password.length < 6) {
                this.showLoginError('A senha deve ter pelo menos 6 caracteres.');
                return;
            }

            if (password !== confirmPassword) {
                this.showLoginError('As senhas não coincidem.');
                return;
            }
        } else {
            if (!email || !password) {
                this.showLoginError('Por favor, preencha todos os campos.');
                return;
            }

            if (password.length < 6) {
                this.showLoginError('A senha deve ter pelo menos 6 caracteres.');
                return;
            }
        }

        this.clearAuthErrors();
        this.setAuthLoading(true);

        try {
            let error;
            if (isRegisterMode) {
                const username = this.sanitizeUsername(el.registerUsername.value.trim());
                const { data, error: err } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            username: username,
                        },
                    },
                });
                error = err;
                if (!error && data.user && !data.session) {
                    this.showLoginError('Verifique seu e-mail para confirmar o cadastro!');
                    this.setAuthLoading(false);
                    return;
                }
            } else {
                const { data, error: err } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                error = err;

                // Failsafe: if listener doesn't trigger, manually trigger sign-in logic
                if (!error && data.session && !this.game.userId) {
                     this.game.onUserSignIn(data.session);
                }
            }

            if (error) throw error;
            // Login handled by onAuthStateChange in GameManager
        } catch (error) {
            console.error("Auth error:", error);
            let msg = error.message || 'Erro ao autenticar.';
            if (msg.includes('Invalid login credentials')) {
                msg = 'E-mail ou senha inválidos.';
            } else if (msg.includes('User already registered')) {
                msg = 'E-mail já está cadastrado.';
            } else if (msg.includes('Password should be at least')) {
                msg = 'A senha deve ter pelo menos 6 caracteres.';
            } else if (msg.includes('Email not confirmed')) {
                msg = 'Confirme seu e-mail antes de entrar.';
            }
            this.showLoginError(msg);
            this.setAuthLoading(false);
        }
    }

    setAuthLoading(loading) {
        const btn = this.isRegisterMode ? this.elements.registerBtn : this.elements.loginBtn;
        if (btn) {
            btn.disabled = loading;
            btn.textContent = loading ? 'Aguarde...' : (this.isRegisterMode ? 'Cadastrar' : 'Entrar');
        }
    }

    showLoginError(msg) {
        const errorEl = this.isRegisterMode ? this.elements.registerError : this.elements.loginError;
        const inputEl = this.isRegisterMode ? this.elements.registerEmail : this.elements.loginEmail;

        if (errorEl) {
            errorEl.textContent = msg;
            if (inputEl && msg) {
                inputEl.classList.add('error');
                setTimeout(() => inputEl.classList.remove('error'), 500);
            }
        }
    }

    togglePasswordVisibility() {
        const el = this.elements;
        if (!el.registerPassword) return;
        const isPassword = el.registerPassword.type === 'password';
        el.registerPassword.type = isPassword ? 'text' : 'password';
        if (el.togglePassword) {
            el.togglePassword.textContent = isPassword ? '🙈' : '👁️';
            el.togglePassword.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
        }
    }

    updatePasswordStrength() {
        const el = this.elements;
        const password = el.registerPassword ? el.registerPassword.value : '';

        if (!el.strengthBar || !el.strengthLabel) return;

        if (!password) {
            el.strengthBar.style.width = '0%';
            el.strengthBar.className = 'strength-bar';
            el.strengthLabel.textContent = '';
            return;
        }

        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const levels = [
            { label: 'Muito fraca', cls: 'strength-weak', width: '20%' },
            { label: 'Fraca', cls: 'strength-weak', width: '40%' },
            { label: 'Média', cls: 'strength-medium', width: '60%' },
            { label: 'Forte', cls: 'strength-strong', width: '80%' },
            { label: 'Muito forte', cls: 'strength-very-strong', width: '100%' },
        ];

        const level = levels[Math.min(score, levels.length - 1)];
        el.strengthBar.style.width = level.width;
        el.strengthBar.className = `strength-bar ${level.cls}`;
        el.strengthLabel.textContent = level.label;
        el.strengthLabel.className = `strength-label ${level.cls}`;
    }

    onLoginSuccess() {
        this.updateAuthUI();
        // Switch back to settings tab so the user can close and play
        this._switchTab('settings');
    }

    updateAuthUI() {
        const el = this.elements;
        const isLoggedIn = !!this.game.userId;

        if (el.accountLoggedIn) el.accountLoggedIn.style.display = isLoggedIn ? 'block' : 'none';
        if (el.accountLoggedOut) el.accountLoggedOut.style.display = isLoggedIn ? 'none' : 'block';

        if (el.userInfo) {
            el.userInfo.textContent = isLoggedIn
                ? `👤 ${this.game.username || 'Jogador'}`
                : '';
        }

        // Badge on the header user-btn to indicate logged-in state
        if (el.userBtn) {
            el.userBtn.classList.toggle('logged-in', isLoggedIn);
            el.userBtn.title = isLoggedIn
                ? `Conta: ${this.game.username || 'Jogador'}`
                : 'Menu (visitante)';
        }
    }

    _switchTab(tabName) {
        const el = this.elements;
        const isSettings = tabName === 'settings';

        if (el.tabSettings) el.tabSettings.style.display = isSettings ? 'block' : 'none';
        if (el.tabAccount) el.tabAccount.style.display = isSettings ? 'none' : 'block';

        if (el.tabBtnSettings) {
            el.tabBtnSettings.classList.toggle('active', isSettings);
            el.tabBtnSettings.setAttribute('aria-selected', String(isSettings));
        }
        if (el.tabBtnAccount) {
            el.tabBtnAccount.classList.toggle('active', !isSettings);
            el.tabBtnAccount.setAttribute('aria-selected', String(!isSettings));
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

    syncCheckbox(id, value) {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    }

    handleKeyboard(e) {
        // Ignore keypresses inside input fields
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

        if (e.key === 'Escape') {
            this.toggleSettingsModal(false);
            return;
        }

        const el = this.elements;
        const gameControlsVisible = el.gameControls && el.gameControls.style.display === 'flex';

        // Post-round shortcuts (when game controls are hidden)
        if (!gameControlsVisible) {
            if ((e.key === 'Enter' || e.key === ' ') && el.rebetBtn && el.rebetBtn.style.display !== 'none') {
                e.preventDefault();
                el.rebetBtn.classList.add('kbd-active');
                setTimeout(() => el.rebetBtn.classList.remove('kbd-active'), 150);
                this.game.rebetAndDeal();
                return;
            }
            if ((e.key === 'n' || e.key === 'N') && el.newGameBtn && el.newGameBtn.style.display !== 'none') {
                el.newGameBtn.classList.add('kbd-active');
                setTimeout(() => el.newGameBtn.classList.remove('kbd-active'), 150);
                this.game.newGame();
                return;
            }
            return;
        }

        // Hint shortcut: '?' during player turn
        if (e.key === '?') {
            this._showHint();
            return;
        }

        const keyMap = {
            'h': { action: () => this.game.hit(), btn: el.hitBtn },
            's': { action: () => this.game.stand(), btn: el.standBtn },
            'd': { action: () => this.game.double(), btn: el.doubleBtn },
            'p': { action: () => this.game.split(), btn: el.splitBtn },
            'r': { action: () => this.game.surrender(), btn: el.surrenderBtn }
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
        if (ARCHITECTURE_FLAGS.enableRendererModule) {
            this.renderer.render(state);
            return;
        }
        this._renderCore(state);
    }

    _renderCore(state) {
        if (!state) return;

        if (this.elements.balance) this.animateValue(this.elements.balance, state.balance, '$');
        if (this.elements.currentBet) this.animateValue(this.elements.currentBet, state.currentBet, '$');
        if (this.elements.wins) this.animateValue(this.elements.wins, state.wins);
        if (this.elements.losses) this.animateValue(this.elements.losses, state.losses);
        if (this.elements.betInput) this.elements.betInput.value = state.currentBet;
        if (this.elements.activeRuleProfile && state.activeRuleProfile) {
            this.elements.activeRuleProfile.textContent = `Perfil de regras: ${state.activeRuleProfile}`;
        }

        this.renderHand(this.elements.dealerCards, state.dealerHand, true, state.dealerRevealed);
        this.renderPlayerHands(state.playerHands, state.currentHandIndex);

        // Scores
        const dealerValue = (state.dealerHand && state.dealerHand.length > 0) ?
            HandUtils.calculateHandValue(state.dealerRevealed ? state.dealerHand : [state.dealerHand[0]]) : 0;

        let playerValue = 0;
        if (state.playerHands && state.playerHands.length > 0 && state.playerHands[state.currentHandIndex]) {
             playerValue = HandUtils.calculateHandValue(state.playerHands[state.currentHandIndex].cards);
        }

        if (this.elements.dealerScore) {
            const newVal = state.dealerRevealed ? dealerValue : '?';
            if (this.elements.dealerScore.textContent !== String(newVal)) {
                this.elements.dealerScore.textContent = newVal;
                this.elements.dealerScore.classList.remove('pulse');
                void this.elements.dealerScore.offsetWidth;
                this.elements.dealerScore.classList.add('pulse');
            }
        }

        if (this.elements.playerScore) {
            if (this.elements.playerScore.textContent !== String(playerValue)) {
                this.elements.playerScore.textContent = playerValue;
                this.elements.playerScore.classList.remove('pulse');
                void this.elements.playerScore.offsetWidth;
                this.elements.playerScore.classList.add('pulse');
            }
        }

        this.updateStats(state.wins, state.losses, state.totalWinnings, state.blackjacks);

        // Update Buttons
        if (state.playerHands.length > 0 && !state.gameOver) {
            const currentHand = state.playerHands[state.currentHandIndex];
            const canSplit = currentHand.cards.length === 2 &&
                             HandUtils.getCardNumericValue(currentHand.cards[0]) === HandUtils.getCardNumericValue(currentHand.cards[1]) &&
                             state.balance >= currentHand.bet &&
                             state.playerHands.length < CONFIG.MAX_SPLITS;
            if (this.elements.splitBtn) {
                 this.elements.splitBtn.style.display = canSplit ? 'inline-block' : 'none';
                 this.elements.splitBtn.disabled = !canSplit;
            }

            if (this.elements.surrenderBtn) {
                const canSurrender = state.playerHands.length === 1 &&
                    currentHand.cards.length === 2 &&
                    currentHand.status === 'playing';
                this.elements.surrenderBtn.style.display = canSurrender ? 'inline-block' : 'none';
                this.elements.surrenderBtn.disabled = !canSurrender;
            }

            if (this.elements.doubleBtn) {
                const canDouble = this.game ? this.game.canDouble(state.currentHandIndex) : false;
                this.elements.doubleBtn.disabled = !canDouble;
            }
        } else {
            if (this.elements.splitBtn) this.elements.splitBtn.style.display = 'none';
        }

        // Highlight selected chip
        const chips = document.querySelectorAll('.chip');
        chips.forEach(chip => {
            const val = parseInt(chip.dataset.value);
            if (val === state.currentBet) {
                chip.classList.add('selected');
            } else {
                chip.classList.remove('selected');
            }
        });

        // Hint button visibility (only during player's active turn)
        const isPlayerTurn = state.gameStarted && !state.gameOver &&
            state.playerHands && state.playerHands.length > 0 &&
            state.playerHands[state.currentHandIndex]?.status === 'playing';
        if (this.elements.hintBtn) {
            this.elements.hintBtn.style.display = isPlayerTurn ? 'inline-block' : 'none';
        }

        // Sync training mode toggle with game state
        if (this.elements.trainingModeToggle && state.trainingMode !== undefined) {
            this.elements.trainingModeToggle.checked = state.trainingMode;
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
        cardEl.setAttribute('role', 'img');
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
        if (this.elements.rebetBtn) this.elements.rebetBtn.style.display = 'none';
    }

    showNewGameButton() {
        if (this.elements.newGameBtn) this.elements.newGameBtn.style.display = 'inline-block';

        // Show rebet button if player has enough balance for current bet
        if (this.elements.rebetBtn && this.game && this.game.balance >= this.game.currentBet) {
             this.elements.rebetBtn.style.display = 'inline-block';
        }
    }

    showMessage(text, type) {
        if (ARCHITECTURE_FLAGS.enableFeedbackModule) {
            this.feedback.showMessage(text, type);
            return;
        }
        this._showMessageCore(text, type);
    }

    _showMessageCore(text, type) {
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

    showWinAnimation(_amount) {
        if (!this.animationsEnabled) return;
        this.drawConfetti();
    }

    setupConfettiCanvas() {
        let canvas = document.getElementById('confetti-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'confetti-canvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '9999';
            document.body.appendChild(canvas);

            window.addEventListener('resize', () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            });
        }
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        return canvas;
    }

    drawConfetti() {
        if (this.confettiAnimationId) {
            cancelAnimationFrame(this.confettiAnimationId);
        }

        const canvas = this.setupConfettiCanvas();
        const ctx = canvas.getContext('2d');
        const particles = [];
        const particleCount = 150;
        const colors = ['#FFD700', '#FFA500', '#2ecc71', '#3498db', '#e74c3c', '#ffffff'];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                vx: Math.random() * 4 - 2,
                vy: Math.random() * 5 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 4 - 2
            });
        }

        const update = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let activeParticles = 0;

            particles.forEach(p => {
                p.y += p.vy;
                p.x += p.vx;
                p.rotation += p.rotationSpeed;
                p.vy += 0.05; // gravity

                if (p.y < canvas.height) {
                    activeParticles++;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    ctx.restore();
                }
            });

            if (activeParticles > 0) {
                this.confettiAnimationId = requestAnimationFrame(update);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                cancelAnimationFrame(this.confettiAnimationId);
                this.confettiAnimationId = null;
            }
        };

        update();
    }

    // ── Gameplay feedback helpers ──────────────────────────────────────

    showBustAnimation() {
        if (!this.animationsEnabled) return;
        const container = this.elements.playerCards;
        if (!container) return;
        container.classList.remove('bust-shake');
        void container.offsetWidth; // reflow to restart animation
        container.classList.add('bust-shake');
        setTimeout(() => container.classList.remove('bust-shake'), 600);
    }

    annotateHandResults(results) {
        const container = this.elements.playerCards;
        if (!container || !results) return;
        const wrappers = container.querySelectorAll('.hand-container');
        if (wrappers.length === 0) return; // single hand — no annotation needed
        const labels = { win: '✅ Ganhou!', lose: '❌ Perdeu', tie: '🤝 Empate', surrender: '🏳️ Desistiu' };
        const classes = { win: 'hand-result-win', lose: 'hand-result-lose', tie: 'hand-result-tie', surrender: 'hand-result-tie' };
        wrappers.forEach((wrapper, i) => {
            if (!results[i]) return;
            const infoDiv = wrapper.querySelector('.hand-info');
            if (!infoDiv) return;
            infoDiv.textContent = labels[results[i].result] || '';
            infoDiv.className = `hand-info ${classes[results[i].result] || ''}`;
        });
    }

    // ─────────────────────────────────────────────────────────────────

    showError(msg) {
        if (ARCHITECTURE_FLAGS.enableFeedbackModule) {
            this.feedback.showError(msg);
            return;
        }
        this._showErrorCore(msg);
    }

    _showErrorCore(msg) {
        if (this.elements.errorMessage) this.elements.errorMessage.textContent = msg;
        if (this.elements.errorNotification) this.elements.errorNotification.classList.add('show');
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        if (ARCHITECTURE_FLAGS.enableFeedbackModule) {
            this.feedback.hideError();
            return;
        }
        this._hideErrorCore();
    }

    _hideErrorCore() {
        if (this.elements.errorNotification) this.elements.errorNotification.classList.remove('show');
    }

    showToast(message, type = 'info', duration = 3000) {
        if (ARCHITECTURE_FLAGS.enableFeedbackModule) {
            this.feedback.showToast(message, type, duration);
            return;
        }
        this._showToastCore(message, type, duration);
    }

    _showToastCore(message, type = 'info', duration = 3000) {
        const container = this.elements.toastContainer;
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.animationDuration = `0.3s, 0.3s`;
        toast.style.animationDelay = `0s, ${(duration - 300) / 1000}s`;

        container.appendChild(toast);

        // Limit to 5 visible toasts
        while (container.children.length > 5) {
            container.removeChild(container.firstChild);
        }

        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, duration);
    }

    showShuffleAnimation() {
        if (!this.animationsEnabled) return;
        const gameArea = document.querySelector('.game-area');
        if (!gameArea) return;

        const overlay = document.createElement('div');
        overlay.className = 'shuffle-overlay';
        const cardsWrap = document.createElement('div');
        cardsWrap.className = 'shuffle-cards';
        for (let i = 0; i < 3; i++) {
            const card = document.createElement('div');
            card.className = 'shuffle-card';
            cardsWrap.appendChild(card);
        }
        overlay.appendChild(cardsWrap);
        gameArea.style.position = 'relative';
        gameArea.appendChild(overlay);

        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 1300);
    }

    updateShoeIndicator(remainingCards, totalCards) {
        if (!this.elements.shoeBar || !this.elements.shoeLabel) return;
        const pct = totalCards > 0 ? Math.round((remainingCards / totalCards) * 100) : 100;
        this.elements.shoeBar.style.setProperty('--shoe-pct', `${pct}%`);
        this.elements.shoeLabel.textContent = `${pct}%`;

        this.elements.shoeBar.classList.remove('high', 'medium', 'low');
        if (pct > 50) {
            this.elements.shoeBar.classList.add('high');
        } else if (pct > 20) {
            this.elements.shoeBar.classList.add('medium');
        } else {
            this.elements.shoeBar.classList.add('low');
        }
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

    // ── New feature methods ──

    /**
     * Shows the basic strategy hint for the current hand as a toast.
     */
    _showHint() {
        if (!this.game) return;
        const hint = this.game.getHint();
        if (!hint) {
            this.showToast('Dica indisponível agora.', 'info', 2000);
            return;
        }
        const labels = {
            hit: 'Pedir Carta',
            stand: 'Parar',
            double: 'Dobrar',
            split: 'Dividir',
            surrender: 'Desistir',
        };
        const action = labels[hint.action] || hint.action;
        this.showToast(`💡 Dica: ${action} — ${hint.explanation}`, 'info', 4500);
    }

    /**
     * Shows training mode feedback after a player action.
     * @param {Object} evaluation - From BasicStrategy.evaluatePlayerAction().
     */
    showTrainingFeedback(evaluation) {
        const el = this.elements.trainingFeedback;
        if (!el) return;
        el.className = 'training-feedback';
        if (evaluation.isOptimal) {
            el.classList.add('correct');
            el.textContent = '✅ Correto! ' + evaluation.explanation;
        } else if (evaluation.isSuboptimal) {
            el.classList.add('suboptimal');
            el.textContent = `⚠️ Quase: ${evaluation.recommendedLabel} seria melhor. ${evaluation.explanation}`;
        } else {
            el.classList.add('wrong');
            el.textContent = `❌ Melhor: ${evaluation.recommendedLabel} — ${evaluation.explanation}`;
        }
        el.style.display = 'block';
        clearTimeout(this._feedbackTimeout);
        this._feedbackTimeout = setTimeout(() => {
            el.style.display = 'none';
        }, 3500);
    }

    /**
     * Renders the hand history panel.
     * @param {Array<Object>} hands - Recent hand history entries (newest first).
     */
    renderHistoryPanel(hands) {
        const list = this.elements.historyList;
        if (!list) return;

        list.innerHTML = '';
        if (!hands || hands.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'text-align:center; padding:12px; color:var(--text-secondary); font-size:0.85em;';
            empty.textContent = 'Nenhuma mão jogada ainda.';
            list.appendChild(empty);
            return;
        }

        hands.forEach(entry => {
            const item = document.createElement('div');
            const resultClassMap = {
                win: 'history-win',
                lose: 'history-lose',
                tie: 'history-tie',
                surrender: 'history-surrender',
            };
            item.className = `history-item ${resultClassMap[entry.result] || ''}`.trim();
            item.setAttribute('role', 'listitem');

            const cardsArr = entry.playerCards?.[0] || [];
            const cardStr = cardsArr.map(c => `${c.value}${c.suit}`).join(' ');
            const dealerStr = entry.dealerUpCard ? `${entry.dealerUpCard.value}${entry.dealerUpCard.suit}` : '?';
            const net = entry.netChange;
            const netStr = net >= 0 ? `+$${net}` : `-$${Math.abs(net)}`;
            const resultLabels = { win: 'Vitória', lose: 'Derrota', tie: 'Empate', surrender: 'Desistiu' };

            const handNumEl = document.createElement('span');
            handNumEl.className = 'history-hand-num';
            handNumEl.textContent = `#${entry.handNumber}`;

            const cardsEl = document.createElement('span');
            cardsEl.className = 'history-cards';
            cardsEl.textContent = `${cardStr} vs ${dealerStr}`;

            const resultEl = document.createElement('span');
            resultEl.className = 'history-result';
            resultEl.textContent = resultLabels[entry.result] || String(entry.result ?? '');

            const netEl = document.createElement('span');
            netEl.className = `history-net ${net >= 0 ? 'positive' : 'negative'}`;
            netEl.textContent = netStr;

            item.append(handNumEl, cardsEl, resultEl, netEl);
            list.appendChild(item);
        });
    }

    /**
     * Toggles the history list visibility.
     */
    _toggleHistory() {
        const list = this.elements.historyList;
        const btn = this.elements.historyToggle;
        if (!list) return;
        const isHidden = list.style.display === 'none';
        list.style.display = isHidden ? 'block' : 'none';
        if (btn) {
            btn.textContent = isHidden ? '▲' : '▼';
            btn.setAttribute('aria-expanded', String(isHidden));
        }
    }

    /**
     * Opens the advanced statistics modal.
     */
    _openStatsModal() {
        if (!this.game || !this.elements.statsModal) return;
        const stats = this.game.getAdvancedStats();
        this._renderAdvancedStatsGrid(stats);
        this._renderStatsCharts(stats);
        this.elements.statsModal.style.display = 'flex';
    }

    /** Closes the advanced statistics modal. */
    _closeStatsModal() {
        if (this.elements.statsModal) this.elements.statsModal.style.display = 'none';
    }

    /**
     * Renders the stats grid inside the advanced stats modal.
     * @param {Object} stats - Output of computeAdvancedStats().
     */
    _renderAdvancedStatsGrid(stats) {
        const grid = this.elements.statsAdvancedGrid;
        if (!grid) return;

        const items = [
            { label: 'Taxa de Vitória', value: stats.winRate != null ? `${stats.winRate}%` : 'N/A' },
            { label: 'ROI Líquido', value: stats.netROI != null ? `${stats.netROI}%` : 'N/A' },
            { label: 'Maior Sequência de Vitórias', value: stats.longestWinStreak ?? 0 },
            { label: 'Maior Sequência de Derrotas', value: stats.longestLossStreak ?? 0 },
            { label: 'Melhor Saldo', value: `$${stats.sessionBestBalance ?? 0}` },
            { label: 'Pior Saldo', value: `$${stats.sessionWorstBalance ?? 0}` },
            { label: 'Eficiência ao Dobrar', value: stats.doubleDownEfficiency != null ? `${stats.doubleDownEfficiency}%` : 'N/A' },
            { label: 'Eficiência ao Dividir', value: stats.splitEfficiency != null ? `${stats.splitEfficiency}%` : 'N/A' },
            { label: 'Conformidade Estratégica', value: stats.strategyComplianceRate != null ? `${stats.strategyComplianceRate}%` : 'Sem dados' },
            { label: 'Total Apostado', value: `$${stats.totalAmountWagered ?? 0}` },
        ];

        grid.innerHTML = '';
        items.forEach(item => {
            const statItem = document.createElement('div');
            statItem.className = 'stats-adv-item';

            const value = document.createElement('div');
            value.className = 'stats-adv-value';
            value.textContent = String(item.value);

            const label = document.createElement('div');
            label.className = 'stats-adv-label';
            label.textContent = item.label;

            statItem.append(value, label);
            grid.appendChild(statItem);
        });
    }

    /**
     * Renders Canvas bar charts for the stats modal.
     * @param {Object} stats
     */
    _renderStatsCharts(stats) {
        const style = window.getComputedStyle(document.body);
        const winColor = style.getPropertyValue('--win-color').trim() || '#2ecc71';
        const loseColor = style.getPropertyValue('--lose-color').trim() || '#e74c3c';
        const goldColor = style.getPropertyValue('--primary-gold').trim() || '#FFD700';
        const textColor = style.getPropertyValue('--text-secondary').trim() || 'rgba(255,255,255,0.7)';

        // Win rate bar chart
        const winCanvas = this.elements.statsChartWinrate;
        if (winCanvas) {
            const ctx = winCanvas.getContext('2d');
            const w = winCanvas.width;
            const h = winCanvas.height;
            ctx.clearRect(0, 0, w, h);

            const rate = Math.min(100, Math.max(0, stats.winRate || 0));
            const barH = h * 0.5;
            const barY = (h - barH) / 2;

            // Background bar
            ctx.fillStyle = loseColor + '44';
            ctx.beginPath();
            ctx.roundRect(10, barY, w - 20, barH, 6);
            ctx.fill();

            // Win fill
            const fillW = ((w - 20) * rate) / 100;
            if (fillW > 0) {
                ctx.fillStyle = winColor;
                ctx.beginPath();
                ctx.roundRect(10, barY, fillW, barH, 6);
                ctx.fill();
            }

            // Label
            ctx.fillStyle = textColor;
            ctx.font = '12px Poppins, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Taxa de vitória: ${rate}%`, w / 2, h - 4);
        }

        // Streak chart (win/loss streak bars)
        const streakCanvas = this.elements.statsChartStreak;
        if (streakCanvas) {
            const ctx = streakCanvas.getContext('2d');
            const w = streakCanvas.width;
            const h = streakCanvas.height;
            ctx.clearRect(0, 0, w, h);

            const maxStreak = Math.max(1, stats.longestWinStreak, stats.longestLossStreak);
            const barW = (w - 30) / 2;
            const maxBarH = h * 0.6;

            const drawBar = (x, value, color, label) => {
                const barH = (value / maxStreak) * maxBarH;
                const y = h * 0.15 + maxBarH - barH;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.roundRect(x, y, barW, barH, 4);
                ctx.fill();
                ctx.fillStyle = textColor;
                ctx.font = 'bold 13px Poppins, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(value, x + barW / 2, y - 4);
                ctx.font = '10px Poppins, sans-serif';
                ctx.fillText(label, x + barW / 2, h - 4);
            };

            drawBar(10, stats.longestWinStreak || 0, winColor, 'Vitórias');
            drawBar(20 + barW, stats.longestLossStreak || 0, loseColor, 'Derrotas');

            ctx.fillStyle = goldColor;
            ctx.font = '10px Poppins, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Maiores Sequências', w / 2, 12);
        }
    }
}
