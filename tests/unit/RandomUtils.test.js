import { describe, it, expect, vi } from 'vitest';
import * as RandomUtils from '../../src/utils/RandomUtils.js';

describe('RandomUtils', () => {
    it('produces valid random integers', () => {
        const max = 10;
        for (let i = 0; i < 100; i++) {
            const val = RandomUtils.getRandomInt(max);
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThan(max);
            expect(Number.isInteger(val)).toBe(true);
        }
    });

    it('uses crypto.getRandomValues when available', () => {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const spy = vi.spyOn(crypto, 'getRandomValues');
            RandomUtils.getRandomInt(10);
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        }
    });

    it('does not use Math.random when crypto is available', () => {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const spy = vi.spyOn(Math, 'random');
            RandomUtils.getRandomInt(10);
            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        }
    });

    it('uses Math.random when crypto is NOT available', () => {
        const originalCrypto = global.crypto;

        Object.defineProperty(global, 'crypto', {
            value: undefined,
            writable: true,
            configurable: true
        });

        const spy = vi.spyOn(Math, 'random');

        RandomUtils.getRandomInt(10);

        expect(spy).toHaveBeenCalled();

        Object.defineProperty(global, 'crypto', {
            value: originalCrypto,
            writable: true,
            configurable: true
        });
        spy.mockRestore();
    });
});
