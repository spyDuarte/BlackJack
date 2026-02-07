import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Deck } from '../../src/core/Deck.js';
import { CONFIG } from '../../src/core/Constants.js';

describe('Deck', () => {
    let deck;

    beforeEach(() => {
        deck = new Deck(1); // 1 deck for simplicity
    });

    it('initializes with correct number of cards', () => {
        expect(deck.cards.length).toBe(52);
        expect(deck.totalCards).toBe(52);
    });

    it('initializes with multiple decks correctly', () => {
        const d = new Deck(6);
        expect(d.cards.length).toBe(6 * 52);
        expect(d.totalCards).toBe(312);
    });

    it('has correct card distribution', () => {
        // Count cards
        const suits = {};
        const values = {};
        deck.cards.forEach(c => {
            suits[c.suit] = (suits[c.suit] || 0) + 1;
            values[c.value] = (values[c.value] || 0) + 1;
        });

        expect(Object.keys(suits).length).toBe(4);
        expect(Object.keys(values).length).toBe(13);

        // Each suit should have 13 cards
        Object.values(suits).forEach(count => expect(count).toBe(13));
        // Each value should have 4 cards (in 1 deck)
        Object.values(values).forEach(count => expect(count).toBe(4));
    });

    it('shuffles cards', () => {
        // Create a deck, clone its order
        const originalOrder = [...deck.cards];

        // Shuffle
        deck.shuffle();

        // Check it's different (extremely unlikely to be same)
        // With 52! permutations, this is safe.
        let same = true;
        for (let i = 0; i < deck.cards.length; i++) {
            if (deck.cards[i].suit !== originalOrder[i].suit ||
                deck.cards[i].value !== originalOrder[i].value) {
                same = false;
                break;
            }
        }
        expect(same).toBe(false);
    });

    it('draw removes card from deck', () => {
        const initialLen = deck.cards.length;
        const card = deck.draw();
        expect(card).toBeDefined();
        expect(deck.cards.length).toBe(initialLen - 1);
        expect(deck.remainingCards).toBe(initialLen - 1);
    });

    it('reshuffles when empty', () => {
        deck.cards = []; // Empty deck

        const card = deck.draw();

        expect(card).toBeDefined();
        expect(deck.cards.length).toBe(51); // 52 - 1
    });

    it('detects cut card logic', () => {
        // Force cutCardPosition to 10 cards remaining
        deck.cutCardPosition = 10;

        // Deck starts with 52 cards.
        // We want to reach <= 10.

        // Currently 52.
        // Draw 41 times -> 11 cards remaining.
        for (let i = 0; i < 41; i++) {
             deck.draw();
        }

        expect(deck.cards.length).toBe(11);
        expect(deck.cutCardReached).toBe(false);

        // Draw 1 more -> 10 cards remaining.
        // Logic: if (this.cards.length <= this.cutCardPosition) this.cutCardReached = true;
        // After pop(), length is 10. 10 <= 10 is true.
        deck.draw();

        expect(deck.cards.length).toBe(10);
        expect(deck.cutCardReached).toBe(true);
        expect(deck.needsReshuffle).toBe(true);
    });

    it('uses crypto random if available', () => {
        // In Node 20+, global.crypto is read-only or managed differently in Vitest environment.
        // We can spy on it instead of reassigning if it exists.

        if (global.crypto && global.crypto.getRandomValues) {
            const spy = vi.spyOn(global.crypto, 'getRandomValues');
            const d = new Deck(1);
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        } else {
             // If for some reason test env doesn't have it, skip or mock if possible.
             // But usually Node env has it.
             // We can try defining it if undefined, or skipping.
             console.warn('Crypto not available in test environment');
        }
    });

    it('falls back to Math.random if crypto unavailable', () => {
        const originalCrypto = global.crypto;
        // @ts-ignore
        delete global.crypto;

        const mathSpy = vi.spyOn(Math, 'random');

        const d = new Deck(1);

        expect(mathSpy).toHaveBeenCalled();

        global.crypto = originalCrypto;
        mathSpy.mockRestore();
    });
});
