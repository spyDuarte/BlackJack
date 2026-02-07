import { describe, it, expect, beforeEach } from 'vitest';
import * as HandUtils from '../../src/utils/HandUtils.js';
import { BlackjackEngine } from '../../src/core/BlackjackEngine.js';

describe('Card Counting (Hi-Lo)', () => {
    describe('getHiLoValue', () => {
        it('returns +1 for 2-6', () => {
            expect(HandUtils.getHiLoValue({ value: '2' })).toBe(1);
            expect(HandUtils.getHiLoValue({ value: '3' })).toBe(1);
            expect(HandUtils.getHiLoValue({ value: '4' })).toBe(1);
            expect(HandUtils.getHiLoValue({ value: '5' })).toBe(1);
            expect(HandUtils.getHiLoValue({ value: '6' })).toBe(1);
        });

        it('returns 0 for 7-9', () => {
            expect(HandUtils.getHiLoValue({ value: '7' })).toBe(0);
            expect(HandUtils.getHiLoValue({ value: '8' })).toBe(0);
            expect(HandUtils.getHiLoValue({ value: '9' })).toBe(0);
        });

        it('returns -1 for 10-A', () => {
            expect(HandUtils.getHiLoValue({ value: '10' })).toBe(-1);
            expect(HandUtils.getHiLoValue({ value: 'J' })).toBe(-1);
            expect(HandUtils.getHiLoValue({ value: 'Q' })).toBe(-1);
            expect(HandUtils.getHiLoValue({ value: 'K' })).toBe(-1);
            expect(HandUtils.getHiLoValue({ value: 'A' })).toBe(-1);
        });
    });

    describe('BlackjackEngine Running Count', () => {
        let engine;

        beforeEach(() => {
            engine = new BlackjackEngine();
            // Mock deck for deterministic card drawing
            engine.deck.draw = () => ({ value: 'K', suit: 'H' }); // Default mock
        });

        it('starts at 0', () => {
            expect(engine.runningCount).toBe(0);
        });

        it('resets on shuffle', () => {
            engine.runningCount = 10;
            engine.shuffleDeck();
            expect(engine.runningCount).toBe(0);
        });

        it('updates count on deal', () => {
            // Setup deck for startGame: P1(2), P2(3), D1(K), D2(A)
            const cards = [
                { value: '2' }, // P1 (+1)
                { value: '3' }, // P2 (+1)
                { value: 'K' }, // D1 (-1)
                { value: 'A' }  // D2 (-1) - Hidden initially
            ];
            let idx = 0;
            engine.deck.draw = () => cards[idx++] || { value: '2' };

            engine.startGame(10);

            // Expected: 2(+1) + 3(+1) + K(-1) = +1.
            // D2(A) is hidden, not counted yet.
            expect(engine.runningCount).toBe(1);
        });

        it('updates count on hit', () => {
            // Setup initial state manually to avoid startGame complexity
            engine.runningCount = 5;
            engine.playerHands = [{ cards: [], bet: 10, status: 'playing' }];

            engine.deck.draw = () => ({ value: '5' }); // +1
            engine.hit(0);

            expect(engine.runningCount).toBe(6);
        });

        it('updates count on dealer hole card reveal', () => {
            // Mock engine state where dealer has hole card
            engine.dealerHand = [{ value: '10' }, { value: '5' }]; // 10 (-1), 5 (+1)
            engine.runningCount = -1; // Assuming 10 was counted
            engine._dealerRevealed = false;

            // Trigger reveal via setter logic
            engine.dealerRevealed = true;

            // Should add +1 for the 5
            expect(engine.runningCount).toBe(0);
        });
    });
});
