import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Deck } from '../../src/core/Deck.js';

describe('Deck Randomness', () => {
    let deck;

    beforeEach(() => {
        deck = new Deck(1);
    });

    it('uses _getRandomInt for randomness', () => {
        const spy = vi.spyOn(deck, '_getRandomInt');

        deck.shuffle();
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledTimes(51);
    });

    it('uses crypto.getRandomValues when available', () => {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const spy = vi.spyOn(crypto, 'getRandomValues');
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
            const d = new Deck(1);
            d.shuffle();
            d.reset();

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

        const d = new Deck(1);
        d.shuffle();

        expect(spy).toHaveBeenCalled();

        Object.defineProperty(global, 'crypto', {
            value: originalCrypto,
            writable: true,
            configurable: true
        });
        spy.mockRestore();
    });

    it('burnCards reduces deck size by requested amount', () => {
        const initial = deck.remainingCards;
        const burned = deck.burnCards(3);

        expect(burned).toBe(3);
        expect(deck.remainingCards).toBe(initial - 3);
    });

    it('preserves expected shoe total across casino shuffle and burn', () => {
        const shoe = new Deck(6);
        const expectedTotal = shoe.totalCards;

        shoe.shuffleCasino(5);
        expect(shoe.remainingCards).toBe(expectedTotal);

        const burnCount = 4;
        shoe.burnCards(burnCount);
        expect(shoe.remainingCards).toBe(expectedTotal - burnCount);
    });

    it('triggers the selected shuffle mode', () => {
        const fairDeck = new Deck(1);
        const fairSpy = vi.spyOn(fairDeck, 'shuffle');
        const fairCasinoSpy = vi.spyOn(fairDeck, 'shuffleCasino');

        fairDeck.shuffleWithMode('fair');

        expect(fairSpy).toHaveBeenCalled();
        expect(fairCasinoSpy).not.toHaveBeenCalled();

        const casinoDeck = new Deck(1);
        const casinoSpy = vi.spyOn(casinoDeck, 'shuffleCasino');
        const casinoFairSpy = vi.spyOn(casinoDeck, 'shuffle');

        casinoDeck.shuffleWithMode('casino');

        expect(casinoSpy).toHaveBeenCalled();
        expect(casinoFairSpy).not.toHaveBeenCalled();
    });
});
