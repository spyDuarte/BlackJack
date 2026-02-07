import { describe, it, expect } from 'vitest';
import * as HandUtils from '../../src/utils/HandUtils.js';

describe('HandUtils', () => {
    describe('getCardNumericValue', () => {
        it('returns correct value for number cards', () => {
            expect(HandUtils.getCardNumericValue({ value: '2' })).toBe(2);
            expect(HandUtils.getCardNumericValue({ value: '10' })).toBe(10);
        });

        it('returns 10 for face cards', () => {
            expect(HandUtils.getCardNumericValue({ value: 'J' })).toBe(10);
            expect(HandUtils.getCardNumericValue({ value: 'Q' })).toBe(10);
            expect(HandUtils.getCardNumericValue({ value: 'K' })).toBe(10);
        });

        it('returns 11 for Aces initially', () => {
            expect(HandUtils.getCardNumericValue({ value: 'A' })).toBe(11);
        });

        it('handles null/undefined gracefully', () => {
            expect(HandUtils.getCardNumericValue(null)).toBe(0);
        });
    });

    describe('calculateHandValue', () => {
        it('calculates simple hands correctly', () => {
            const hand = [
                { value: '2', suit: '♠' },
                { value: '3', suit: '♥' }
            ];
            expect(HandUtils.calculateHandValue(hand)).toBe(5);
        });

        it('calculates face cards correctly', () => {
            const hand = [
                { value: 'J', suit: '♠' },
                { value: 'K', suit: '♥' }
            ];
            expect(HandUtils.calculateHandValue(hand)).toBe(20);
        });

        it('calculates soft hands (Ace as 11)', () => {
            const hand = [
                { value: 'A', suit: '♠' },
                { value: '5', suit: '♥' }
            ];
            expect(HandUtils.calculateHandValue(hand)).toBe(16);
        });

        it('calculates hard hands (Ace as 1)', () => {
            const hand = [
                { value: 'A', suit: '♠' }, // 11 -> 1
                { value: '5', suit: '♥' }, // 16 -> 6
                { value: '8', suit: '♦' }  // 24 -> 14
            ];
            expect(HandUtils.calculateHandValue(hand)).toBe(14);
        });

        it('handles multiple Aces correctly', () => {
            const hand = [
                { value: 'A', suit: '♠' }, // 11
                { value: 'A', suit: '♥' }  // 22 -> 12
            ];
            expect(HandUtils.calculateHandValue(hand)).toBe(12);

            const hand2 = [
                { value: 'A', suit: '♠' },
                { value: 'A', suit: '♥' },
                { value: 'A', suit: '♦' },
                { value: 'K', suit: '♣' } // 3 + 10 = 13
            ];
            expect(HandUtils.calculateHandValue(hand2)).toBe(13);
        });
    });

    describe('isSoftHand', () => {
        it('returns true for soft hands', () => {
            const hand = [
                { value: 'A', suit: '♠' },
                { value: '5', suit: '♥' }
            ];
            expect(HandUtils.isSoftHand(hand)).toBe(true);
        });

        it('returns false for hard hands without Ace', () => {
            const hand = [
                { value: '10', suit: '♠' },
                { value: '5', suit: '♥' }
            ];
            expect(HandUtils.isSoftHand(hand)).toBe(false);
        });

        it('returns false for hard hands with Ace (converted to 1)', () => {
            const hand = [
                { value: 'A', suit: '♠' },
                { value: '5', suit: '♥' },
                { value: '8', suit: '♦' } // Total 14 (hard)
            ];
            expect(HandUtils.isSoftHand(hand)).toBe(false);
        });
    });

    describe('isNaturalBlackjack', () => {
        it('returns true for Ace + 10/Face on first 2 cards', () => {
            const hand = [
                { value: 'A', suit: '♠' },
                { value: 'K', suit: '♥' }
            ];
            expect(HandUtils.isNaturalBlackjack(hand, 1)).toBe(true);
        });

        it('returns false for 21 with more than 2 cards', () => {
            const hand = [
                { value: '7', suit: '♠' },
                { value: '5', suit: '♥' },
                { value: '9', suit: '♦' }
            ];
            expect(HandUtils.isNaturalBlackjack(hand, 1)).toBe(false);
        });

        it('returns false for 21 after split', () => {
            const hand = [
                { value: 'A', suit: '♠' },
                { value: 'K', suit: '♥' }
            ];
            // handsCount > 1 implies split
            expect(HandUtils.isNaturalBlackjack(hand, 2)).toBe(false);
        });
    });
});
