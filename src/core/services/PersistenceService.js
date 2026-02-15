import { CONFIG, STORAGE_KEYS } from '../Constants.js';
import { StorageManager } from '../../utils/StorageManager.js';

export class PersistenceService {
    constructor(game, supabaseClient) {
        this.game = game;
        this.supabase = supabaseClient;
    }

    migrateData(gameState) {
        if (!gameState.version || gameState.version < CONFIG.STORAGE_VERSION) {
            gameState.version = CONFIG.STORAGE_VERSION;
        }
        return gameState;
    }

    _saveGameImmediate() {
        const gameState = {
            version: CONFIG.STORAGE_VERSION,
            balance: this.game.balance,
            wins: this.game.wins,
            losses: this.game.losses,
            blackjacks: this.game.blackjacks,
            totalWinnings: this.game.totalWinnings,
            totalAmountWagered: this.game.totalAmountWagered,
            sessionBestBalance: this.game.sessionBestBalance,
            sessionWorstBalance: this.game.sessionWorstBalance,
            handCounter: this.game.handCounter,
            gameStarted: this.game.engine.gameStarted,
            updatedAt: Date.now()
        };

        StorageManager.set(this.game.getStorageKey(STORAGE_KEYS.GAME_SAVE), gameState);
        this.game.handHistory.saveToLocalStorage(this.game.getStorageKey(STORAGE_KEYS.HAND_HISTORY));

        if (this.game.userId) {
            this.saveStatsToSupabase();
            this.game.handHistory.saveToSupabase(this.supabase, this.game.userId).catch(console.error);
        }
    }

    async saveStatsToSupabase() {
        if (!this.game.userId) return;

        try {
            const stats = {
                user_id: this.game.userId,
                balance: this.game.balance,
                wins: this.game.wins,
                losses: this.game.losses,
                blackjacks: this.game.blackjacks,
                total_winnings: this.game.totalWinnings,
                updated_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('statistics')
                .upsert(stats, { onConflict: 'user_id' });

            if (error) {
                console.error('Error saving stats to Supabase:', error);
                if (this.game.ui) this.game.ui.showToast('Erro ao salvar progresso na nuvem.', 'error');
            }
        } catch (err) {
            console.error('Unexpected error saving stats:', err);
            if (this.game.ui) this.game.ui.showToast('Erro de conexão ao salvar.', 'error');
        }
    }

    async loadGame() {
        let localTimestamp = 0;
        const savedGame = StorageManager.get(this.game.getStorageKey(STORAGE_KEYS.GAME_SAVE));
        if (savedGame) {
            try {
                let gameState = typeof savedGame === 'object' ? savedGame : JSON.parse(savedGame);
                gameState = this.migrateData(gameState);
                this.game.balance = gameState.balance || 1000;
                this.game.wins = gameState.wins || 0;
                this.game.losses = gameState.losses || 0;
                this.game.blackjacks = gameState.blackjacks || 0;
                this.game.totalWinnings = gameState.totalWinnings || 0;
                this.game.totalAmountWagered = gameState.totalAmountWagered || 0;
                this.game.sessionBestBalance = gameState.sessionBestBalance || this.game.balance;
                this.game.sessionWorstBalance = gameState.sessionWorstBalance || this.game.balance;
                this.game.handCounter = gameState.handCounter || 0;
                localTimestamp = gameState.updatedAt || 0;
            } catch {
                console.warn('Could not parse game state');
            }
        }

        this.game.handHistory.loadFromLocalStorage(this.game.getStorageKey(STORAGE_KEYS.HAND_HISTORY));
        this.loadSettings();
        this.game.updateUI();

        if (this.game.userId) {
            this.loadStatsFromSupabase(localTimestamp).catch(console.error);
            this.game.handHistory.loadFromSupabase(this.supabase, this.game.userId).catch(console.error);
        }
    }

    async loadStatsFromSupabase(localTimestamp) {
        if (!this.game.userId) return;

        try {
            const { data, error } = await this.supabase
                .from('statistics')
                .select('*')
                .eq('user_id', this.game.userId)
                .single();

            if (data) {
                const remoteTimestamp = new Date(data.updated_at).getTime();

                if (remoteTimestamp > localTimestamp || localTimestamp === 0) {
                    this.game.balance = Number(data.balance);
                    this.game.wins = data.wins;
                    this.game.losses = data.losses;
                    this.game.blackjacks = data.blackjacks;
                    this.game.totalWinnings = Number(data.total_winnings);

                    this.game.updateUI();

                    const gameState = {
                        version: CONFIG.STORAGE_VERSION,
                        balance: this.game.balance,
                        wins: this.game.wins,
                        losses: this.game.losses,
                        blackjacks: this.game.blackjacks,
                        totalWinnings: this.game.totalWinnings,
                        totalAmountWagered: this.game.totalAmountWagered,
                        sessionBestBalance: this.game.sessionBestBalance,
                        sessionWorstBalance: this.game.sessionWorstBalance,
                        handCounter: this.game.handCounter,
                        gameStarted: this.game.engine.gameStarted,
                        updatedAt: Date.now()
                    };
                    StorageManager.set(this.game.getStorageKey(STORAGE_KEYS.GAME_SAVE), gameState);
                } else if (localTimestamp > remoteTimestamp) {
                    this.saveStatsToSupabase();
                }

                if (this.game.ui) this.game.ui.showToast('Progresso sincronizado!', 'success');
            } else if (error && error.code === 'PGRST116') {
                this.saveStatsToSupabase();
                if (this.game.ui) this.game.ui.showToast('Novo perfil criado na nuvem.', 'info');
            } else if (error) {
                console.error('Error fetching stats:', error);
                if (this.game.ui) this.game.ui.showToast('Erro ao baixar dados da nuvem.', 'error');
            }
        } catch (err) {
            console.error('Unexpected error loading stats:', err);
            if (this.game.ui) this.game.ui.showToast('Erro de conexão ao sincronizar.', 'error');
        }
    }

    saveSettings() {
        StorageManager.set(this.game.getStorageKey(STORAGE_KEYS.SETTINGS), this.game.settings);
    }

    loadSettings() {
        const savedSettings = StorageManager.get(this.game.getStorageKey(STORAGE_KEYS.SETTINGS));
        if (savedSettings) {
            try {
                const parsed = typeof savedSettings === 'object' ? savedSettings : JSON.parse(savedSettings);
                this.game.settings = { ...this.game.settings, ...parsed };
                if (this.game.soundManager) {
                    this.game.soundManager.setEnabled(this.game.settings.soundEnabled);
                    this.game.soundManager.setVolume(this.game.settings.volume);
                }
                if (this.game.ui) {
                    this.game.ui.setAnimationsEnabled(this.game.settings.animationsEnabled);
                    this.game.ui.setStatsVisibility(this.game.settings.showStats);
                    this.game.ui.setVolume(this.game.settings.volume);
                    if (this.game.settings.theme) this.game.ui.setTheme(this.game.settings.theme);
                    if (this.game.settings.trainingMode !== undefined) {
                        this.game.trainingMode = !!this.game.settings.trainingMode;
                    }
                }
            } catch {
                console.warn('Could not parse settings');
            }
        }
    }
}
