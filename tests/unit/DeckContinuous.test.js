import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Deck } from '../../src/core/Deck.js';
import { CONFIG } from '../../src/core/Constants.js';

describe('Deck Continuous Shuffle', () => {
    let deck;

    beforeEach(() => {
        // Ensure we are testing continuous mode
        // Note: We can't easily change the imported CONFIG directly if it's a const,
        // but we can rely on the default we just set, or use vi.mock if needed.
        // Since we changed the default in Constants.js to 'continuous', we expect it to be active.
        deck = new Deck(1);
    });

    it('should default to continuous mode', () => {
        expect(CONFIG.SHUFFLE_MODE).toBe('continuous');
    });

    it('should request reshuffle immediately after any card is drawn in continuous mode', () => {
        const total = deck.totalCards;
        expect(deck.remainingCards).toBe(total);

        // Fresh deck, needsReshuffle should be false (or true? logic says < total)
        // If remaining == total, it is false.
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
        // reset() puts cut card, shuffle doesn't change count.
        // burnCards() is usually called by Engine, not Deck constructor automatically?
        // Wait, Deck constructor calls shuffleWithMode, but NOT burnCards.
        // Engine calls burnCards.

        expect(deck.remainingCards).toBe(52);
        expect(deck.needsReshuffle).toBe(false);
    });
});
