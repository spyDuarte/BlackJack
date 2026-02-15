import { describe, it, expect, vi, beforeEach } from 'vitest';

const { storage, mockUpsert, mockSingle } = vi.hoisted(() => {
    const storage = new Map();
    return {
        storage,
        mockUpsert: vi.fn(async () => ({ error: null })),
        mockSingle: vi.fn(async () => ({ data: null, error: { code: 'PGRST116' } })),
    };
});

vi.mock('../../src/supabaseClient.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: mockSingle,
                })),
            })),
            upsert: mockUpsert,
        })),
        auth: {
            onAuthStateChange: vi.fn(),
            signOut: vi.fn(),
        },
    },
}));

vi.mock('../../src/utils/StorageManager.js', () => ({
    StorageManager: {
        get: vi.fn((key) => storage.get(key) ?? null),
        set: vi.fn((key, value) => {
            storage.set(key, value);
            return true;
        }),
    },
}));

import { GameManager } from '../../src/core/GameManager.js';
import { STORAGE_KEYS } from '../../src/core/Constants.js';
import { StorageManager } from '../../src/utils/StorageManager.js';

describe('GameManager guest persistence', () => {
    beforeEach(() => {
        storage.clear();
        vi.clearAllMocks();
        GameManager.instance = null;
    });

    it('salva, recarrega e recupera estado sem login', async () => {
        const game = new GameManager(null, null);
        const saveHistorySpy = vi.spyOn(game.handHistory, 'saveToSupabase');

        game.balance = 1337;
        game.wins = 4;
        game.losses = 2;
        game.blackjacks = 1;
        game.totalWinnings = 240;
        game.settings.theme = 'light';
        game.settings.volume = 0.9;

        game._saveGameImmediate();
        game.saveSettings();

        expect(StorageManager.set).toHaveBeenCalledWith(
            `${STORAGE_KEYS.GAME_SAVE}-guest`,
            expect.objectContaining({ balance: 1337, wins: 4 })
        );
        expect(StorageManager.set).toHaveBeenCalledWith(
            `${STORAGE_KEYS.SETTINGS}-guest`,
            expect.objectContaining({ theme: 'light', volume: 0.9 })
        );
        expect(saveHistorySpy).not.toHaveBeenCalled();
        expect(mockUpsert).not.toHaveBeenCalled();

        GameManager.instance = null;
        const reloadedGame = new GameManager(null, null);

        await reloadedGame.loadGame();

        expect(reloadedGame.balance).toBe(1337);
        expect(reloadedGame.wins).toBe(4);
        expect(reloadedGame.settings.theme).toBe('light');
        expect(reloadedGame.settings.volume).toBe(0.9);
        expect(mockSingle).not.toHaveBeenCalled();
    });

    it('isola chave guest da chave de usuário autenticado', async () => {
        const guestGame = new GameManager(null, null);
        guestGame.balance = 1111;
        guestGame.saveSettings();
        guestGame._saveGameImmediate();

        GameManager.instance = null;
        const authGame = new GameManager(null, null);
        authGame.userId = 'user-123';
        authGame.balance = 2222;
        authGame.settings.theme = 'neon';
        authGame.saveSettings();
        authGame._saveGameImmediate();

        expect(storage.get(`${STORAGE_KEYS.GAME_SAVE}-guest`).balance).toBe(1111);
        expect(storage.get(`${STORAGE_KEYS.GAME_SAVE}-user-123`).balance).toBe(2222);
        expect(storage.get(`${STORAGE_KEYS.SETTINGS}-user-123`).theme).toBe('neon');

        GameManager.instance = null;
        const reloadGuest = new GameManager(null, null);
        await reloadGuest.loadGame();
        expect(reloadGuest.balance).toBe(1111);

        GameManager.instance = null;
        const reloadAuth = new GameManager(null, null);
        reloadAuth.userId = 'user-123';
        await reloadAuth.loadGame();
        expect(reloadAuth.balance).toBe(2222);
        expect(reloadAuth.settings.theme).toBe('neon');
    });
});
