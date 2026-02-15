import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Deck } from '../../src/core/Deck.js';
import { CONFIG } from '../../src/core/Constants.js';
import { Shuffler } from '../../src/core/Shuffler.js';

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

        expect(deck.remainingCards).toBe(total);
        expect(deck.needsReshuffle).toBe(false);

        deck.draw();

        expect(deck.remainingCards).toBe(total - 1);
        expect(deck.needsReshuffle).toBe(true);
        expect(deck.cutCardReached).toBe(false);
    });

    it('should shuffle before every draw in continuous mode', () => {
        const spy = vi.spyOn(Shuffler.prototype, 'fisherYates');
        spy.mockClear();

        deck.draw();
        expect(spy).toHaveBeenCalledTimes(1);

        deck.draw();
        expect(spy).toHaveBeenCalledTimes(2);

        spy.mockRestore();
    });

    it('should NOT shuffle before draw if not in continuous mode', () => {
        try {
            CONFIG.SHUFFLE_MODE = 'fair';

            const spy = vi.spyOn(Shuffler.prototype, 'fisherYates');
            spy.mockClear();

            deck.draw();
            expect(spy).not.toHaveBeenCalled();

            spy.mockRestore();
        } finally {
            CONFIG.SHUFFLE_MODE = originalMode;
        }
    });
});
