import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Deck } from '../../src/core/Deck.js';
import { Shuffler } from '../../src/core/Shuffler.js';
import * as RandomUtils from '../../src/utils/RandomUtils.js';

describe('Deck Randomness', () => {
    let deck;

    beforeEach(() => {
        deck = new Deck(1);
    });

    it('uses RandomUtils.getRandomInt for randomness during shuffle', () => {
        const spy = vi.spyOn(RandomUtils, 'getRandomInt');

        // New Deck constructor calls shuffleWithMode, which calls shuffle, which calls fisherYates
        // So it might have been called already.
        // We call it again explicitly.
        deck.shuffle();
        expect(spy).toHaveBeenCalled();

        spy.mockRestore();
    });

    it('uses Shuffler.fisherYates when shuffle() is called', () => {
        const spy = vi.spyOn(Shuffler.prototype, 'fisherYates');
        deck.shuffle();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('uses Shuffler.casinoShuffle when shuffleCasino() is called', () => {
        const spy = vi.spyOn(Shuffler.prototype, 'casinoShuffle');
        deck.shuffleCasino();
        expect(spy).toHaveBeenCalled();
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
        const fisherYatesSpy = vi.spyOn(Shuffler.prototype, 'fisherYates');

        fairDeck.shuffleWithMode('fair');

        expect(fisherYatesSpy).toHaveBeenCalled();

        fisherYatesSpy.mockRestore();

        const casinoDeck = new Deck(1);
        const casinoSpy = vi.spyOn(Shuffler.prototype, 'casinoShuffle');

        casinoDeck.shuffleWithMode('casino');

        expect(casinoSpy).toHaveBeenCalled();

        casinoSpy.mockRestore();
    });
});
