import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameManager } from './GameManager.js';

describe('GameManager facade contract', () => {
    beforeEach(() => {
        GameManager.instance = null;
    });

    afterEach(() => {
        GameManager.instance = null;
    });

    it('delegates auth operations to AuthService', async () => {
        const game = new GameManager(null, null);
        game.authService = {
            setupAuthListener: vi.fn(),
            onUserSignIn: vi.fn(),
            onUserSignOut: vi.fn(),
            logout: vi.fn().mockResolvedValue(undefined),
        };

        game.onUserSignIn({ user: { id: 'abc' } });
        game.onUserSignOut();
        await game.logout();

        expect(game.authService.onUserSignIn).toHaveBeenCalled();
        expect(game.authService.onUserSignOut).toHaveBeenCalled();
        expect(game.authService.logout).toHaveBeenCalled();
    });

    it('delegates persistence operations to PersistenceService', async () => {
        const game = new GameManager(null, null);
        game.persistenceService = {
            _saveGameImmediate: vi.fn(),
            saveStatsToSupabase: vi.fn().mockResolvedValue(undefined),
            migrateData: vi.fn().mockReturnValue({ version: 3 }),
            loadGame: vi.fn().mockResolvedValue(undefined),
            loadStatsFromSupabase: vi.fn().mockResolvedValue(undefined),
            saveSettings: vi.fn(),
            loadSettings: vi.fn(),
        };

        game._saveGameImmediate();
        await game.saveStatsToSupabase();
        const migrated = game.migrateData({ version: 1 });
        await game.loadGame();
        await game.loadStatsFromSupabase(1);
        game.saveSettings();
        game.loadSettings();

        expect(game.persistenceService._saveGameImmediate).toHaveBeenCalled();
        expect(game.persistenceService.saveStatsToSupabase).toHaveBeenCalled();
        expect(game.persistenceService.migrateData).toHaveBeenCalled();
        expect(migrated).toEqual({ version: 3 });
        expect(game.persistenceService.loadGame).toHaveBeenCalled();
        expect(game.persistenceService.loadStatsFromSupabase).toHaveBeenCalledWith(1);
        expect(game.persistenceService.saveSettings).toHaveBeenCalled();
        expect(game.persistenceService.loadSettings).toHaveBeenCalled();
    });

    it('delegates round flow actions to RoundController', () => {
        const game = new GameManager(null, null);
        game.roundController = {
            startGame: vi.fn(),
            startPlayerTurn: vi.fn(),
            checkDealerBlackjack: vi.fn(),
            respondToInsurance: vi.fn(),
            hit: vi.fn(),
            stand: vi.fn(),
            canDouble: vi.fn().mockReturnValue(true),
            double: vi.fn(),
            split: vi.fn(),
            surrender: vi.fn(),
            nextHand: vi.fn(),
            playDealer: vi.fn(),
            endGame: vi.fn(),
        };

        game.startGame();
        game.startPlayerTurn();
        game.checkDealerBlackjack();
        game.respondToInsurance(true);
        game.hit();
        game.stand();
        expect(game.canDouble(0)).toBe(true);
        game.double();
        game.split();
        game.surrender();
        game.nextHand();
        game.playDealer();
        game.endGame();

        expect(game.roundController.startGame).toHaveBeenCalled();
        expect(game.roundController.respondToInsurance).toHaveBeenCalledWith(true);
        expect(game.roundController.canDouble).toHaveBeenCalledWith(0);
        expect(game.roundController.endGame).toHaveBeenCalled();
    });
});
