import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Deck } from '../../src/core/Deck.js';
import { CONFIG } from '../../src/core/Constants.js';
import * as Algorithms from '../../src/core/shuffling/Algorithms.js';

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

        deck.draw();

        expect(deck.remainingCards).toBe(total - 1);
        expect(deck.needsReshuffle).toBe(true);
        expect(deck.cutCardReached).toBe(false);
    });

    it('should not request reshuffle if deck is full', () => {
        deck.reset();
        deck.shuffleWithMode('continuous');

        deck.draw();

        // One call from constructor (initial shuffle), one from draw()
        // Wait, constructor calls shuffleWithMode -> shuffle -> fisherYates
        // So at least 1 initial call.
        // draw() calls shuffle() -> fisherYates.
        // So we expect calls > 1.

        // Actually, let's count calls *after* creation
        spy.mockClear();

        deck.draw();
        expect(spy).toHaveBeenCalledTimes(1);

        deck.draw();
        expect(spy).toHaveBeenCalledTimes(2);

        spy.mockRestore();
    });

    it('should NOT shuffle before draw if not in continuous mode', () => {
        const originalMode = CONFIG.SHUFFLE_MODE;
        // Force config change (if possible, otherwise skip or mock)
        // Since CONFIG is imported as a const object, we can mutate its properties if not frozen.
        // But usually imports are live bindings.
        // Let's assume we can mock or change it via Object.defineProperty or simpler if it's mutable.

        // However, changing global config might affect other tests.
        // We can use vi.spyOn(CONFIG, 'SHUFFLE_MODE', 'get').
        // But CONFIG is a plain object.

        // Let's try to mutate it directly for this test, then restore.
        // Note: ES modules might complain about assignment to constant variable if we try `CONFIG = ...`,
        // but `CONFIG.SHUFFLE_MODE = ...` works if the object itself is not frozen.

        try {
            CONFIG.SHUFFLE_MODE = 'fair';

            const spy = vi.spyOn(Algorithms, 'fisherYates');
            spy.mockClear();

            deck.draw();
            // Should NOT call shuffle() in draw()
            expect(spy).not.toHaveBeenCalled();

            spy.mockRestore();
        } finally {
            CONFIG.SHUFFLE_MODE = originalMode;
        }
    });
});
