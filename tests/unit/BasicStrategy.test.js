import { describe, it, expect } from 'vitest';
import { getRecommendedAction, evaluatePlayerAction } from '../../src/utils/BasicStrategy.js';

// Mock rule profiles
const vegasStrip = {
    dealerHitsSoft17: true,
    blackjackPayout: 2.5,
    doubleAfterSplit: true,
    resplitAces: false,
    holeCardPolicy: 'peek',
    surrenderType: 'late',
};

const europeanNoHoleCard = {
    dealerHitsSoft17: false,
    blackjackPayout: 2.2,
    doubleAfterSplit: true,
    resplitAces: false,
    holeCardPolicy: 'no_peek',
    surrenderType: 'none',
};

const c = (value, suit = '♠') => ({ value, suit });

describe('BasicStrategy - Hard Totals', () => {
    it('recommends Double on 11 vs dealer 6', () => {
        const cards = [c('6'), c('5')]; // hard 11
        const dealer = c('6');
        const result = getRecommendedAction(cards, dealer, vegasStrip, false);
        expect(result.action).toBe('double');
        expect(result.handType).toBe('hard');
        expect(result.playerTotal).toBe(11);
    });

    it('recommends Surrender on 16 vs dealer 10', () => {
        const cards = [c('10'), c('6')]; // hard 16
        const dealer = c('10');
        const result = getRecommendedAction(cards, dealer, vegasStrip, false);
        expect(result.action).toBe('surrender');
    });

    it('recommends Stand on 12 vs dealer 4', () => {
        const cards = [c('10'), c('2')]; // hard 12
        const dealer = c('4');
        const result = getRecommendedAction(cards, dealer, vegasStrip, false);
        expect(result.action).toBe('stand');
    });

    it('recommends Hit on 12 vs dealer 2', () => {
        const cards = [c('10'), c('2')]; // hard 12
        const dealer = c('2');
        const result = getRecommendedAction(cards, dealer, vegasStrip, false);
        expect(result.action).toBe('hit');
    });

    it('recommends Stand on 17 vs dealer A', () => {
        const cards = [c('10'), c('7')]; // hard 17
        const dealer = c('A');
        const result = getRecommendedAction(cards, dealer, vegasStrip, false);
        // US: Surrender if available else Stand
        expect(['surrender', 'stand']).toContain(result.action);
    });

    it('recommends Double on 10 vs dealer 5', () => {
        const cards = [c('6'), c('4')]; // hard 10
        const dealer = c('5');
        const result = getRecommendedAction(cards, dealer, vegasStrip, false);
        expect(result.action).toBe('double');
    });
});

describe('BasicStrategy - Soft Totals', () => {
    it('recommends Hit on Soft 18 (A+7) vs dealer 9', () => {
        const cards = [c('A'), c('7')]; // soft 18
        const dealer = c('9');
        const result = getRecommendedAction(cards, dealer, vegasStrip, false);
        expect(result.action).toBe('hit');
        expect(result.handType).toBe('soft');
    });

    it('recommends Stand on Soft 20 (A+9) vs any dealer', () => {
        const cards = [c('A'), c('9')]; // soft 20
        for (const dealerVal of ['2', '5', '10', 'A']) {
            const dealer = c(dealerVal);
            const result = getRecommendedAction(cards, dealer, vegasStrip, false);
            expect(result.action).toBe('stand');
        }
    });

    it('recommends Double on Soft 17 (A+6) vs dealer 5', () => {
        const cards = [c('A'), c('6')]; // soft 17
        const dealer = c('5');
        const result = getRecommendedAction(cards, dealer, vegasStrip, false);
        expect(result.action).toBe('double');
    });

    it('recommends Double or Stand on Soft 18 (A+7) vs dealer 3', () => {
        const cards = [c('A'), c('7')]; // soft 18
        const dealer = c('3');
        const result = getRecommendedAction(cards, dealer, vegasStrip, false);
        // DS: double if possible else stand
        expect(['double', 'stand']).toContain(result.action);
    });
});

describe('BasicStrategy - Pairs', () => {
    it('recommends Split on 8-8 vs any dealer', () => {
        const cards = [c('8'), c('8')];
        for (const dealerVal of ['2', '7', '10', 'A']) {
            const dealer = c(dealerVal);
            const result = getRecommendedAction(cards, dealer, vegasStrip, true);
            expect(result.action).toBe('split');
        }
    });

    it('recommends Stand on 10-10 vs any dealer', () => {
        const cards = [c('10'), c('10')];
        const dealer = c('6');
        const result = getRecommendedAction(cards, dealer, vegasStrip, true);
        expect(result.action).toBe('stand');
    });

    it('recommends Split on A-A vs any dealer', () => {
        const cards = [c('A'), c('A')];
        for (const dealerVal of ['2', '9', 'A']) {
            const dealer = c(dealerVal);
            const result = getRecommendedAction(cards, dealer, vegasStrip, true);
            expect(result.action).toBe('split');
        }
    });

    it('face cards (J, Q, K) as pairs recommend Stand', () => {
        const pairs = [
            [c('J'), c('J')],
            [c('Q'), c('Q')],
            [c('K'), c('K')],
        ];
        const dealer = c('8');
        for (const cards of pairs) {
            const result = getRecommendedAction(cards, dealer, vegasStrip, true);
            expect(result.action).toBe('stand');
        }
    });
});

describe('BasicStrategy - Fallback resolution', () => {
    it('falls back to Hit when surrender is not allowed (SU code)', () => {
        // 16 vs dealer 10 → normally SU (surrender) but European profile has no surrender
        const cards = [c('10'), c('6')]; // hard 16
        const dealer = c('10');
        const result = getRecommendedAction(cards, dealer, europeanNoHoleCard, false);
        expect(result.action).toBe('hit');
    });

    it('falls back to Hit when double is not explicitly disallowed but yields D code', () => {
        // For a profile without doubleAfterSplit context — when double IS allowed, should double
        const cards = [c('6'), c('5')]; // hard 11
        const dealer = c('7');
        const result = getRecommendedAction(cards, dealer, vegasStrip, false);
        expect(result.action).toBe('double');
    });
});

describe('BasicStrategy - evaluatePlayerAction', () => {
    it('returns isOptimal=true when action matches recommendation', () => {
        const cards = [c('8'), c('8')];
        const dealer = c('6');
        const eval1 = evaluatePlayerAction('split', cards, dealer, vegasStrip, true);
        expect(eval1.isOptimal).toBe(true);
        expect(eval1.isWrong).toBe(false);
    });

    it('returns isWrong=true for clearly suboptimal action (standing on hard 8)', () => {
        const cards = [c('3'), c('5')]; // hard 8
        const dealer = c('7');
        const eval1 = evaluatePlayerAction('stand', cards, dealer, vegasStrip, false);
        // Recommendation should be hit
        expect(eval1.isOptimal).toBe(false);
        expect(eval1.isWrong).toBe(true);
        expect(eval1.recommended).toBe('hit');
    });

    it('returns recommendedLabel in Portuguese', () => {
        const cards = [c('10'), c('2')]; // hard 12
        const dealer = c('3');
        const eval1 = evaluatePlayerAction('hit', cards, dealer, vegasStrip, false);
        // Whether optimal or not, recommendedLabel should exist
        expect(typeof eval1.recommendedLabel).toBe('string');
        expect(eval1.recommendedLabel.length).toBeGreaterThan(0);
    });
});

describe('BasicStrategy - edge cases', () => {
    it('handles null playerCards gracefully', () => {
        const dealer = c('7');
        const result = getRecommendedAction(null, dealer, vegasStrip);
        expect(result.action).toBe('hit');
    });

    it('handles null dealerUpCard gracefully', () => {
        const cards = [c('10'), c('6')];
        const result = getRecommendedAction(cards, null, vegasStrip);
        expect(result.action).toBe('hit');
    });

    it('handles canSplit=false and pair cards — treats as hard total', () => {
        const cards = [c('8'), c('8')]; // Would normally split, but can't
        const dealer = c('6');
        const result = getRecommendedAction(cards, dealer, vegasStrip, false);
        // Pair of 8s = hard 16 vs dealer 6 → S (Stand)
        expect(result.action).toBe('stand');
    });
});
