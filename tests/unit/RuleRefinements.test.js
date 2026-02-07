import { describe, it, expect, beforeEach } from 'vitest';
import { BlackjackEngine } from '../../src/core/BlackjackEngine.js';
import * as HandUtils from '../../src/utils/HandUtils.js';

describe('Rule Refinements', () => {
    let engine;

    beforeEach(() => {
        engine = new BlackjackEngine();
        engine.deck.cards = []; // Mock deck
    });

    it('auto-stands on 21 when hitting', () => {
        // Setup hand: 10, 5 (15)
        engine.playerHands = [{
            cards: [{ value: '10', suit: 'H' }, { value: '5', suit: 'D' }],
            bet: 10,
            status: 'playing'
        }];

        // Mock deck: draw a 6
        engine.deck.draw = () => ({ value: '6', suit: 'S' });

        const result = engine.hit(0);

        expect(result).not.toBeNull();
        expect(HandUtils.calculateHandValue(engine.playerHands[0].cards)).toBe(21);
        expect(engine.playerHands[0].status).toBe('stand');
    });

    it('does not auto-stand on < 21', () => {
        // Setup hand: 10, 5 (15)
        engine.playerHands = [{
            cards: [{ value: '10', suit: 'H' }, { value: '5', suit: 'D' }],
            bet: 10,
            status: 'playing'
        }];

        // Mock deck: draw a 2 (17)
        engine.deck.draw = () => ({ value: '2', suit: 'S' });

        const result = engine.hit(0);

        expect(result).not.toBeNull();
        expect(engine.playerHands[0].status).toBe('playing');
    });

    it('prevents re-splitting Aces', () => {
        // Setup hand: A, A (already split from aces)
        engine.playerHands = [{
            cards: [{ value: 'A', suit: 'H' }, { value: 'A', suit: 'D' }],
            bet: 10,
            status: 'playing', // Should be stand technically if split aces rules force stand, but if user somehow has playing status...
            splitFromAces: true
        }];

        // Attempt split
        const result = engine.split(0);

        expect(result).toBeNull();
    });

    it('allows splitting non-Aces normally', () => {
        engine.playerHands = [{
            cards: [{ value: '8', suit: 'H' }, { value: '8', suit: 'D' }],
            bet: 10,
            status: 'playing',
            splitFromAces: false
        }];

        engine.deck.draw = () => ({ value: '2', suit: 'S' });

        const result = engine.split(0);
        expect(result).not.toBeNull();
    });

    it('prevents surrender after split', () => {
        // Setup 2 hands
        engine.playerHands = [
            { cards: [{value: '10'}, {value: '2'}], bet: 10, status: 'playing' },
            { cards: [{value: '10'}, {value: '3'}], bet: 10, status: 'playing' }
        ];

        const result = engine.surrender(0);
        expect(result).toBeNull();
    });

    it('allows surrender on single hand', () => {
        engine.playerHands = [
            { cards: [{value: '10'}, {value: '6'}], bet: 10, status: 'playing' }
        ];

        const result = engine.surrender(0);
        expect(result).not.toBeNull();
        expect(engine.playerHands[0].status).toBe('surrender');
    });
});
