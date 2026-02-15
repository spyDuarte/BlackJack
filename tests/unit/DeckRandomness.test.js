import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Deck } from '../../src/core/Deck.js';
import * as RandomUtils from '../../src/utils/RandomUtils.js';
import { Shuffler } from '../../src/core/Shuffler.js';

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

    it('uses Shuffler.fisherYates when shuffle() is called', () => {
        const spy = vi.spyOn(Shuffler, 'fisherYates');
        deck.shuffle();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    it('uses Shuffler.casinoShuffle when shuffleCasino() is called', () => {
        const spy = vi.spyOn(Shuffler, 'casinoShuffle');
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
        // Spy on riffle since fair shuffle (Fisher-Yates) shouldn't use it, but casino shuffle should.
        const riffleSpy = vi.spyOn(Shuffler, 'riffle');
        const fisherYatesSpy = vi.spyOn(Shuffler, 'fisherYates');

        fairDeck.shuffleWithMode('fair');

        expect(fisherYatesSpy).toHaveBeenCalled();
        expect(riffleSpy).not.toHaveBeenCalled();

        riffleSpy.mockRestore();
        fisherYatesSpy.mockRestore();

        const casinoDeck = new Deck(1);
        const casinoSpy = vi.spyOn(Shuffler, 'casinoShuffle');
        const casinoRiffleSpy = vi.spyOn(Shuffler, 'riffle');

        casinoDeck.shuffleWithMode('casino');

        expect(casinoSpy).toHaveBeenCalled();
        expect(casinoRiffleSpy).toHaveBeenCalled();

        casinoSpy.mockRestore();
        casinoRiffleSpy.mockRestore();
    });
});
