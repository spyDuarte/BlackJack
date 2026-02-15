import { describe, it, expect } from 'vitest';
import { computeAdvancedStats } from '../../src/utils/AdvancedStats.js';

function makeEntry({ result, actions = [], wasStrategyOptimal = null, netChange = 0 }) {
    return {
        result,
        actions,
        wasStrategyOptimal,
        netChange,
        handNumber: 1,
        timestamp: Date.now(),
        betAmount: 50,
    };
}

describe('computeAdvancedStats', () => {
    describe('Win rate', () => {
        it('returns 0 when no hands played', () => {
            const stats = computeAdvancedStats([], { wins: 0, losses: 0 });
            expect(stats.winRate).toBe(0);
        });

        it('calculates win rate correctly', () => {
            const stats = computeAdvancedStats([], { wins: 3, losses: 1 });
            expect(stats.winRate).toBe(75);
        });
    });

    describe('Net ROI', () => {
        it('returns 0 when nothing wagered', () => {
            const stats = computeAdvancedStats([], { totalWinnings: 100, totalAmountWagered: 0 });
            expect(stats.netROI).toBe(0);
        });

        it('returns positive ROI when winnings > 0', () => {
            const stats = computeAdvancedStats([], {
                totalWinnings: 50,
                totalAmountWagered: 500,
            });
            expect(stats.netROI).toBe(10);
        });

        it('returns negative ROI when losses', () => {
            const stats = computeAdvancedStats([], {
                totalWinnings: -100,
                totalAmountWagered: 500,
            });
            expect(stats.netROI).toBe(-20);
        });
    });

    describe('Streaks', () => {
        it('computes longest win streak correctly', () => {
            // history is newest-first: [L, L, W, W, W]
            // chronological order:      W, W, W, L, L
            // → longestWinStreak=3, longestLossStreak=2
            const history = [
                makeEntry({ result: 'lose' }),
                makeEntry({ result: 'lose' }),
                makeEntry({ result: 'win' }),
                makeEntry({ result: 'win' }),
                makeEntry({ result: 'win' }),
            ];
            const stats = computeAdvancedStats(history, { wins: 3, losses: 2 });
            expect(stats.longestWinStreak).toBe(3);
            expect(stats.longestLossStreak).toBe(2);
        });

        it('W W W L L → longestWin=3, longestLoss=2', () => {
            // history is newest-first, so [L,L,W,W,W]
            const history = [
                makeEntry({ result: 'lose' }),
                makeEntry({ result: 'lose' }),
                makeEntry({ result: 'win' }),
                makeEntry({ result: 'win' }),
                makeEntry({ result: 'win' }),
            ];
            const stats = computeAdvancedStats(history, { wins: 3, losses: 2 });
            // chronological order: W,W,W,L,L → longestWin=3, longestLoss=2
            expect(stats.longestWinStreak).toBe(3);
            expect(stats.longestLossStreak).toBe(2);
        });

        it('currentStreak reflects the most recent run', () => {
            // Newest 3 are losses
            const history = [
                makeEntry({ result: 'lose' }),
                makeEntry({ result: 'lose' }),
                makeEntry({ result: 'lose' }),
                makeEntry({ result: 'win' }),
            ];
            const stats = computeAdvancedStats(history, { wins: 1, losses: 3 });
            expect(stats.currentStreak.type).toBe('loss');
            expect(stats.currentStreak.count).toBe(3);
        });

        it('returns count=0 streak for empty history', () => {
            const stats = computeAdvancedStats([], {});
            expect(stats.currentStreak.count).toBe(0);
        });
    });

    describe('Double down efficiency', () => {
        it('calculates efficiency as percentage', () => {
            const history = [
                makeEntry({ result: 'win', actions: ['double'] }),
                makeEntry({ result: 'win', actions: ['double'] }),
                makeEntry({ result: 'win', actions: ['double'] }),
                makeEntry({ result: 'lose', actions: ['double'] }),
                makeEntry({ result: 'lose', actions: ['double'] }),
            ];
            const stats = computeAdvancedStats(history, {});
            expect(stats.doubleDownEfficiency).toBe(60);
        });

        it('returns null when no doubles played', () => {
            const history = [makeEntry({ result: 'win', actions: ['hit'] })];
            const stats = computeAdvancedStats(history, {});
            expect(stats.doubleDownEfficiency).toBeNull();
        });
    });

    describe('Strategy compliance', () => {
        it('returns null when no training data exists', () => {
            const history = [
                makeEntry({ result: 'win', wasStrategyOptimal: null }),
                makeEntry({ result: 'lose', wasStrategyOptimal: null }),
            ];
            const stats = computeAdvancedStats(history, {});
            expect(stats.strategyComplianceRate).toBeNull();
        });

        it('calculates compliance rate correctly', () => {
            const history = [
                makeEntry({ result: 'win', wasStrategyOptimal: true }),
                makeEntry({ result: 'win', wasStrategyOptimal: true }),
                makeEntry({ result: 'win', wasStrategyOptimal: true }),
                makeEntry({ result: 'lose', wasStrategyOptimal: false }),
            ];
            const stats = computeAdvancedStats(history, {});
            expect(stats.strategyComplianceRate).toBe(75);
        });
    });

    describe('Session extremes', () => {
        it('passes through sessionBestBalance and sessionWorstBalance', () => {
            const stats = computeAdvancedStats([], {
                sessionBestBalance: 1500,
                sessionWorstBalance: 800,
            });
            expect(stats.sessionBestBalance).toBe(1500);
            expect(stats.sessionWorstBalance).toBe(800);
        });
    });

    describe('handsPlayed', () => {
        it('reflects the history array length', () => {
            const history = [makeEntry({ result: 'win' }), makeEntry({ result: 'lose' })];
            const stats = computeAdvancedStats(history, {});
            expect(stats.handsPlayed).toBe(2);
        });
    });
});
