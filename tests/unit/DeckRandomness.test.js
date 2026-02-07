import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Deck } from '../../src/core/Deck.js';

describe('Deck Randomness', () => {
    let deck;

    beforeEach(() => {
        deck = new Deck(1);
    });

    it('uses _getRandomInt for randomness', () => {
        // Spy on _getRandomInt
        const spy = vi.spyOn(deck, '_getRandomInt');

        // Shuffle calls _getRandomInt for each card
        deck.shuffle();
        expect(spy).toHaveBeenCalled();
        // Loop runs from len-1 down to 1. i.e. 51 down to 1. That is 51 iterations.
        expect(spy).toHaveBeenCalledTimes(51);
    });

    it('uses crypto.getRandomValues when available', () => {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const spy = vi.spyOn(crypto, 'getRandomValues');

            // _getRandomInt is called during shuffle
            deck.shuffle();

            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        }
    });

    it('produces valid random integers', () => {
        const max = 10;
        for (let i = 0; i < 100; i++) {
            const val = deck._getRandomInt(max);
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThan(max);
            expect(Number.isInteger(val)).toBe(true);
        }
    });

    it('does not use Math.random when crypto is available', () => {
         if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
             const spy = vi.spyOn(Math, 'random');

             // Create a new deck to test reset() behavior which happens in constructor
             const d = new Deck(1);
             d.shuffle();
             d.reset();

             expect(spy).not.toHaveBeenCalled();

             spy.mockRestore();
         }
    });

    it('uses Math.random when crypto is NOT available', () => {
        const originalCrypto = global.crypto;

        // We cannot easily delete global.crypto in some environments, but assuming JSDOM/Node it works.
        // Or we can mock it to undefined.
        Object.defineProperty(global, 'crypto', {
            value: undefined,
            writable: true,
            configurable: true
        });

        const spy = vi.spyOn(Math, 'random');

        const d = new Deck(1);
        d.shuffle();

        expect(spy).toHaveBeenCalled();

        // Restore
        Object.defineProperty(global, 'crypto', {
            value: originalCrypto,
            writable: true,
            configurable: true
        });
        spy.mockRestore();
    });
});
