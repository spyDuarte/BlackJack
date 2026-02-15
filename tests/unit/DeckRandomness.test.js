import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Deck } from '../../src/core/Deck.js';
import * as RandomUtils from '../../src/utils/RandomUtils.js';
import * as Algorithms from '../../src/core/shuffling/Algorithms.js';

describe('Deck Randomness', () => {
    let deck;

    beforeEach(() => {
        deck = new Deck(1);
    });

    it('uses RandomUtils.getRandomInt for randomness during shuffle', () => {
        const spy = vi.spyOn(RandomUtils, 'getRandomInt');

        deck.shuffle();
        expect(spy).toHaveBeenCalled();
        // Fisher-Yates on 52 cards calls it 51 times.
        expect(spy).toHaveBeenCalledTimes(51);

        spy.mockRestore();
    });

    it('uses Algorithms.fisherYates when shuffle() is called', () => {
        const spy = vi.spyOn(Algorithms, 'fisherYates');
        deck.shuffle();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('uses Algorithms.casinoShuffle when shuffleCasino() is called', () => {
        const spy = vi.spyOn(Algorithms, 'casinoShuffle');
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
        const fisherYatesSpy = vi.spyOn(Algorithms, 'fisherYates');

        fairDeck.shuffleWithMode('fair');

        expect(fisherYatesSpy).toHaveBeenCalled();

        fisherYatesSpy.mockRestore();

        const casinoDeck = new Deck(1);
        const casinoSpy = vi.spyOn(Algorithms, 'casinoShuffle');

        casinoDeck.shuffleWithMode('casino');

        expect(casinoSpy).toHaveBeenCalled();

        casinoSpy.mockRestore();
    });
});
