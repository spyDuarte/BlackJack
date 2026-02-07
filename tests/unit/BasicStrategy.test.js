import { describe, it, expect } from 'vitest';
import { BasicStrategy } from '../../src/utils/BasicStrategy.js';

describe('BasicStrategy', () => {
    it('should return correct move for Hard 17+', () => {
        expect(BasicStrategy.getBestMove({ cards: [{value: '10'}, {value: '7'}] }, { value: '10' })).toBe('stand');
    });

    it('should return correct move for Hard 16 vs 7+', () => {
        expect(BasicStrategy.getBestMove({ cards: [{value: '10'}, {value: '6'}] }, { value: '7' })).toBe('hit');
    });

    it('should return correct move for Hard 16 vs 6-', () => {
        expect(BasicStrategy.getBestMove({ cards: [{value: '10'}, {value: '6'}] }, { value: '6' })).toBe('stand');
    });

    it('should return double for 11 vs 10-', () => {
        expect(BasicStrategy.getBestMove({ cards: [{value: '8'}, {value: '3'}] }, { value: '6' })).toBe('double');
    });

    it('should return split for Aces', () => {
        expect(BasicStrategy.getBestMove({ cards: [{value: 'A'}, {value: 'A'}] }, { value: '10' })).toBe('split');
    });
});
