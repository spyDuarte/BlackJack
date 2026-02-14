import { describe, it, expect, beforeEach } from 'vitest';
import { BlackjackEngine } from '../../src/core/BlackjackEngine.js';
import { RULES } from '../../src/core/Constants.js';
import * as HandUtils from '../../src/utils/HandUtils.js';

describe('Rule Refinements', () => {
    let engine;

    beforeEach(() => {
        engine = new BlackjackEngine();
        engine.deck.cards = []; // Mock deck
        RULES.ACTIVE_PROFILE = 'vegas_strip';
        RULES.DOUBLE_TOTALS = 'any';
    });

    it('auto-stands on 21 when hitting', () => {
        engine.playerHands = [{
            cards: [{ value: '10', suit: 'H' }, { value: '5', suit: 'D' }],
            bet: 10,
            status: 'playing'
        }];

        engine.deck.draw = () => ({ value: '6', suit: 'S' });

        const result = engine.hit(0);

        expect(result).not.toBeNull();
        expect(HandUtils.calculateHandValue(engine.playerHands[0].cards)).toBe(21);
        expect(engine.playerHands[0].status).toBe('stand');
    });

    it('does not auto-stand on < 21', () => {
        engine.playerHands = [{
            cards: [{ value: '10', suit: 'H' }, { value: '5', suit: 'D' }],
            bet: 10,
            status: 'playing'
        }];

        engine.deck.draw = () => ({ value: '2', suit: 'S' });

        const result = engine.hit(0);

        expect(result).not.toBeNull();
        expect(engine.playerHands[0].status).toBe('playing');
    });

    it('prevents re-splitting Aces in vegas_strip', () => {
        RULES.ACTIVE_PROFILE = 'vegas_strip';
        engine.playerHands = [{
            cards: [{ value: 'A', suit: 'H' }, { value: 'A', suit: 'D' }],
            bet: 10,
            status: 'playing',
            splitFromAces: true
        }];

        const result = engine.split(0);

        expect(result).toBeNull();
    });

    it('allows re-splitting Aces in atlantic_city', () => {
        RULES.ACTIVE_PROFILE = 'atlantic_city';
        engine.playerHands = [{
            cards: [{ value: 'A', suit: 'H' }, { value: 'A', suit: 'D' }],
            bet: 10,
            status: 'playing',
            splitFromAces: true
        }];
        engine.deck.draw = () => ({ value: '2', suit: 'S' });

        const result = engine.split(0);

        expect(result).not.toBeNull();
    });

    it('prevents surrender after split', () => {
        engine.playerHands = [
            { cards: [{ value: '10' }, { value: '2' }], bet: 10, status: 'playing' },
            { cards: [{ value: '10' }, { value: '3' }], bet: 10, status: 'playing' }
        ];

        const result = engine.surrender(0);
        expect(result).toBeNull();
    });

    it('allows surrender on single hand when profile supports it', () => {
        engine.playerHands = [
            { cards: [{ value: '10' }, { value: '6' }], bet: 10, status: 'playing' }
        ];

        const result = engine.surrender(0);
        expect(result).not.toBeNull();
        expect(engine.playerHands[0].status).toBe('surrender');
    });

    it('blocks surrender when active profile disables it', () => {
        RULES.ACTIVE_PROFILE = 'european_no_hole_card';
        engine.playerHands = [
            { cards: [{ value: '10' }, { value: '6' }], bet: 10, status: 'playing' }
        ];

        expect(engine.surrender(0)).toBeNull();
    });

    it('permits double when all base conditions are valid', () => {
        engine.playerHands = [{
            cards: [{ value: '5', suit: 'H' }, { value: '4', suit: 'D' }],
            bet: 20,
            status: 'playing',
            splitFromAces: false
        }];

        engine.deck.draw = () => ({ value: 'K', suit: 'S' });

        const result = engine.double(0);

        expect(result).not.toBeNull();
        expect(engine.playerHands[0].bet).toBe(40);
        expect(engine.playerHands[0].cards.length).toBe(3);
    });

    it('denies double when hand is missing or not playing', () => {
        engine.playerHands = [{
            cards: [{ value: '5', suit: 'H' }, { value: '4', suit: 'D' }],
            bet: 20,
            status: 'stand',
            splitFromAces: false
        }];

        expect(engine.double(1)).toBeNull();
        expect(engine.double(0)).toBeNull();
    });

    it('denies double when hand does not have exactly 2 cards', () => {
        engine.playerHands = [{
            cards: [{ value: '5', suit: 'H' }, { value: '4', suit: 'D' }, { value: '2', suit: 'C' }],
            bet: 20,
            status: 'playing',
            splitFromAces: false
        }];

        expect(engine.double(0)).toBeNull();
    });

    it('denies double after split when profile has no DAS', () => {
        RULES.PROFILES.vegas_strip.doubleAfterSplit = false;

        engine.playerHands = [
            {
                cards: [{ value: '8', suit: 'H' }, { value: '2', suit: 'D' }],
                bet: 20,
                status: 'playing',
                splitFromAces: false
            },
            {
                cards: [{ value: '8', suit: 'C' }, { value: '3', suit: 'S' }],
                bet: 20,
                status: 'playing',
                splitFromAces: false
            }
        ];

        expect(engine.double(0)).toBeNull();
        RULES.PROFILES.vegas_strip.doubleAfterSplit = true;
    });

    it('respects DOUBLE_TOTALS when configured to 9/10/11', () => {
        RULES.DOUBLE_TOTALS = [9, 10, 11];

        engine.playerHands = [{
            cards: [{ value: '7', suit: 'H' }, { value: '2', suit: 'D' }],
            bet: 20,
            status: 'playing',
            splitFromAces: false
        }];
        engine.deck.draw = () => ({ value: '2', suit: 'S' });

        expect(engine.double(0)).not.toBeNull();

        engine.playerHands = [{
            cards: [{ value: '8', suit: 'H' }, { value: '8', suit: 'D' }],
            bet: 20,
            status: 'playing',
            splitFromAces: false
        }];

        expect(engine.double(0)).toBeNull();
    });

    it('changes soft-17 dealer behavior by profile', () => {
        engine.dealerHand = [{ value: 'A', suit: 'H' }, { value: '6', suit: 'D' }];

        RULES.ACTIVE_PROFILE = 'vegas_strip';
        expect(engine.dealerShouldHit()).toBe(true);

        RULES.ACTIVE_PROFILE = 'atlantic_city';
        expect(engine.dealerShouldHit()).toBe(false);
    });

    it('changes blackjack payout by profile', () => {
        engine.playerHands = [{
            cards: [{ value: 'A', suit: 'H' }, { value: 'K', suit: 'D' }],
            bet: 100,
            status: 'stand',
            splitFromAces: false
        }];
        engine.dealerHand = [{ value: '10', suit: 'S' }, { value: '9', suit: 'C' }];

        RULES.ACTIVE_PROFILE = 'vegas_strip';
        const vegasResult = engine.evaluateResults().results[0];

        RULES.ACTIVE_PROFILE = 'european_no_hole_card';
        const europeanResult = engine.evaluateResults().results[0];

        expect(vegasResult.result).toBe('win');
        expect(europeanResult.result).toBe('win');
        expect(vegasResult.payout).toBe(250);
        expect(europeanResult.payout).toBe(220);
    });
});
