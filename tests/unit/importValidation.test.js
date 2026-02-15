import { describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/core/Constants.js';
import { ImportValidationError, validateImportedGameData } from '../../src/utils/importValidation.js';

function buildValidPayload(overrides = {}) {
    return {
        version: CONFIG.STORAGE_VERSION,
        gameState: {
            balance: 1500,
            wins: 3,
            losses: 1,
            blackjacks: 1,
            totalWinnings: 200,
            ...overrides.gameState,
        },
        settings: {
            soundEnabled: true,
            animationsEnabled: true,
            autoSave: true,
            showStats: false,
            volume: 0.6,
            theme: 'dark',
            trainingMode: false,
            ...overrides.settings,
        },
        ...overrides,
    };
}

describe('validateImportedGameData', () => {
    it('normaliza payload válido', () => {
        const payload = buildValidPayload({
            gameState: { balance: 2200, wins: 5 },
            settings: { volume: 0.25, theme: 'light' },
        });

        const result = validateImportedGameData(payload);

        expect(result.gameState.balance).toBe(2200);
        expect(result.gameState.wins).toBe(5);
        expect(result.settings.volume).toBe(0.25);
        expect(result.settings.theme).toBe('light');
    });

    it('falha quando faltam campos obrigatórios', () => {
        const payload = {
            version: CONFIG.STORAGE_VERSION,
            settings: { volume: 0.5, theme: 'dark' },
        };

        expect(() => validateImportedGameData(payload)).toThrowError(ImportValidationError);
        expect(() => validateImportedGameData(payload)).toThrow(/gameState/);
    });

    it('falha para tipos inválidos', () => {
        const payload = buildValidPayload({
            gameState: { balance: '1000' },
        });

        expect(() => validateImportedGameData(payload)).toThrowError(ImportValidationError);
        expect(() => validateImportedGameData(payload)).toThrow(/numérico finito/);
    });

    it('normaliza valores extremos e limites', () => {
        const payload = buildValidPayload({
            gameState: {
                balance: -999,
                wins: 4.9,
                losses: 2.2,
                blackjacks: 1.1,
            },
            settings: {
                volume: 1.75,
            },
        });

        const normalizedCounters = validateImportedGameData(payload);
        expect(normalizedCounters.gameState.wins).toBe(4);
        expect(normalizedCounters.gameState.losses).toBe(2);
        expect(normalizedCounters.gameState.blackjacks).toBe(1);

        const clampedPayload = buildValidPayload({
            gameState: {
                balance: -999,
                wins: 4,
                losses: 2,
                blackjacks: 1,
            },
            settings: {
                volume: -0.3,
            },
        });

        const result = validateImportedGameData(clampedPayload);

        expect(result.gameState.balance).toBe(0);
        expect(result.settings.volume).toBe(0);
    });

    it('falha para versão incompatível', () => {
        const payload = buildValidPayload({
            version: CONFIG.STORAGE_VERSION + 1,
        });

        expect(() => validateImportedGameData(payload)).toThrowError(ImportValidationError);
        expect(() => validateImportedGameData(payload)).toThrow(/Versão incompatível/);
    });
});
