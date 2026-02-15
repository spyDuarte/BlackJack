import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Deck } from '../../src/core/Deck.js';
import { CONFIG } from '../../src/core/Constants.js';

describe('Deck Continuous Shuffle', () => {
    let deck;
    let originalMode;

    beforeEach(() => {
        originalMode = CONFIG.SHUFFLE_MODE;
        CONFIG.SHUFFLE_MODE = 'continuous';
        deck = new Deck(1);
    });

    afterEach(() => {
        CONFIG.SHUFFLE_MODE = originalMode;
    });

    it('should request reshuffle immediately after any card is drawn in continuous mode', () => {
        const total = deck.totalCards;

        // Fresh deck, needsReshuffle should be false (or true? logic says < total)
        // If remaining == total, it is false.
        expect(deck.remainingCards).toBe(total);
        expect(deck.needsReshuffle).toBe(false);

        // Draw one card
        deck.draw();

        expect(deck.remainingCards).toBe(total - 1);

        // In continuous mode, any depletion triggers reshuffle request
        expect(deck.needsReshuffle).toBe(true);

        // Cut card should NOT be reached yet (statistically impossible with 1 card drawn from 52)
        expect(deck.cutCardReached).toBe(false);
    });

    it('should not request reshuffle if deck is full', () => {
        deck.reset();
        deck.shuffleWithMode('continuous');

        expect(deck.remainingCards).toBe(52);
        expect(deck.needsReshuffle).toBe(false);
    });
});
