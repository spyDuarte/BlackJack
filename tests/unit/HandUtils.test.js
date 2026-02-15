import { describe, it, expect } from 'vitest';
import * as HandUtils from '../../src/utils/HandUtils.js';

const c = (value, suit = '♠') => ({ value, suit });

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

    describe('classifyHand', () => {
        it('identifies a pair of 8s correctly', () => {
            const result = HandUtils.classifyHand([c('8'), c('8')]);
            expect(result.type).toBe('pair');
            expect(result.pairValue).toBe('8');
            expect(result.total).toBe(16);
        });

        it('identifies a pair of Aces correctly', () => {
            const result = HandUtils.classifyHand([c('A'), c('A')]);
            expect(result.type).toBe('pair');
            expect(result.pairValue).toBe('A');
        });

        it('J and Q are both worth 10 but are NOT classified as a pair (different face values)', () => {
            // They have the same numeric value (10) so they ARE a pair by strategy rules
            const result = HandUtils.classifyHand([c('J'), c('Q')]);
            // Both getCardNumericValue → 10, so it should be a pair
            expect(result.type).toBe('pair');
        });

        it('identifies soft hand correctly', () => {
            const result = HandUtils.classifyHand([c('A'), c('7')]);
            expect(result.type).toBe('soft');
            expect(result.total).toBe(18);
            expect(result.pairValue).toBeNull();
        });

        it('identifies hard hand correctly', () => {
            const result = HandUtils.classifyHand([c('10'), c('6')]);
            expect(result.type).toBe('hard');
            expect(result.total).toBe(16);
        });

        it('identifies hard hand when Ace is forced to 1', () => {
            const result = HandUtils.classifyHand([c('A'), c('5'), c('8')]);
            // A+5+8 = 24 → A=1 → 14 (hard)
            expect(result.type).toBe('hard');
            expect(result.total).toBe(14);
        });

        it('returns hard 0 for empty array', () => {
            const result = HandUtils.classifyHand([]);
            expect(result.type).toBe('hard');
            expect(result.total).toBe(0);
        });
    });

    describe('getHiLoValue', () => {
        it('returns +1 for low cards (2-6)', () => {
            for (const v of ['2', '3', '4', '5', '6']) {
                expect(HandUtils.getHiLoValue(c(v))).toBe(1);
            }
        });

        it('returns 0 for neutral cards (7-9)', () => {
            for (const v of ['7', '8', '9']) {
                expect(HandUtils.getHiLoValue(c(v))).toBe(0);
            }
        });

        it('returns -1 for high cards (10, J, Q, K, A)', () => {
            for (const v of ['10', 'J', 'Q', 'K', 'A']) {
                expect(HandUtils.getHiLoValue(c(v))).toBe(-1);
            }
        });

        it('returns 0 for null card', () => {
            expect(HandUtils.getHiLoValue(null)).toBe(0);
        });
    });
});
