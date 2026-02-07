import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlackjackEngine } from '../../src/core/BlackjackEngine.js';
import { Deck } from '../../src/core/Deck.js';

vi.mock('../../src/core/Deck.js', () => {
    return {
        Deck: vi.fn()
    };
});

describe('BlackjackEngine', () => {
    let engine;
    let mockDeckInstance;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock deck behavior
        mockDeckInstance = {
            reset: vi.fn(),
            shuffle: vi.fn(),
            draw: vi.fn().mockReturnValue({ suit: '♠', value: '10' }), // Default card
            cards: [],
            needsReshuffle: false,
            remainingCards: 52,
            totalCards: 312
        };

        Deck.mockImplementation(function() {
            return mockDeckInstance;
        });

        engine = new BlackjackEngine();
    });

    it('initializes correctly', () => {
        expect(engine.playerHands).toEqual([]);
        expect(engine.dealerHand).toEqual([]);
    });

    it('starts game correctly', () => {
        engine.startGame(100);

        expect(engine.gameStarted).toBe(true);
        expect(engine.playerHands.length).toBe(1);
        expect(engine.playerHands[0].cards.length).toBe(2);
        expect(engine.playerHands[0].bet).toBe(100);
        expect(engine.dealerHand.length).toBe(2);
        expect(mockDeckInstance.draw).toHaveBeenCalledTimes(4);
    });

    it('hit adds a card', () => {
        engine.startGame(100);
        const initialCount = engine.playerHands[0].cards.length;

        engine.hit(0);

        expect(engine.playerHands[0].cards.length).toBe(initialCount + 1);
        expect(mockDeckInstance.draw).toHaveBeenCalledTimes(5); // 4 initial + 1 hit
    });

    it('busts when hitting over 21', () => {
        // Mock draw to return 10s
        mockDeckInstance.draw.mockReturnValue({ suit: '♠', value: '10' }); // 10

        engine.startGame(100); // Player: 10, 10 = 20

        mockDeckInstance.draw.mockReturnValue({ suit: '♠', value: '5' }); // 5
        engine.hit(0); // Player: 20 + 5 = 25 -> Bust

        expect(engine.playerHands[0].status).toBe('busted');
    });

    it('stand updates status', () => {
        engine.startGame(100);
        engine.stand(0);
        expect(engine.playerHands[0].status).toBe('stand');
    });

    it('double down doubles bet and hits once', () => {
        mockDeckInstance.draw.mockReturnValue({ suit: '♠', value: '5' }); // 5
        engine.startGame(100); // Player: 5, 5 = 10

        mockDeckInstance.draw.mockReturnValue({ suit: '♠', value: '10' }); // Hit 10 -> 20
        engine.double(0);

        const hand = engine.playerHands[0];
        expect(hand.cards.length).toBe(3);
        expect(hand.bet).toBe(200);
        expect(hand.status).toBe('stand'); // Should stand automatically if not bust
    });

    it('split creates two hands', () => {
        // Setup initial pair (Dealing order: P, P, D, D)
        mockDeckInstance.draw
            .mockReturnValueOnce({ suit: '♠', value: '8' }) // Player 1
            .mockReturnValueOnce({ suit: '♣', value: '8' }) // Player 2
            .mockReturnValueOnce({ suit: '♥', value: '10' }) // Dealer 1
            .mockReturnValueOnce({ suit: '♦', value: '5' }); // Dealer 2

        engine.startGame(100);

        // Setup next cards for split hands
        mockDeckInstance.draw
            .mockReturnValueOnce({ suit: '♠', value: '2' }) // New card for hand 1
            .mockReturnValueOnce({ suit: '♣', value: '3' }); // New card for hand 2

        const result = engine.split(0);

        expect(result).not.toBeNull();
        expect(engine.playerHands.length).toBe(2);
        expect(engine.playerHands[0].cards.length).toBe(2);
        expect(engine.playerHands[1].cards.length).toBe(2);
        expect(engine.playerHands[0].cards[0].value).toBe('8');
        expect(engine.playerHands[1].cards[0].value).toBe('8');
    });

    it('dealerTurn hits until 17', () => {
        engine.startGame(100);
        // Setup dealer hand to be 10, 5 (15)
        engine.dealerHand = [
            { suit: '♠', value: '10' },
            { suit: '♥', value: '5' }
        ];

        // Next draws: 2 (17) -> Stop
        mockDeckInstance.draw.mockReturnValue({ suit: '♣', value: '2' });

        engine.dealerTurn();

        expect(engine.dealerHand.length).toBe(3);
        // Value should be 17
    });

    it('evaluateResults correctly identifies win', () => {
        // Player 20 vs Dealer 18
        engine.startGame(100);
        engine.playerHands[0].cards = [
             { suit: '♠', value: 'K' },
             { suit: '♣', value: 'K' }
        ]; // 20
        engine.dealerHand = [
             { suit: '♥', value: 'K' },
             { suit: '♦', value: '8' }
        ]; // 18

        const result = engine.evaluateResults();
        expect(result.results[0].result).toBe('win');
        expect(result.results[0].winMultiplier).toBe(2);
    });

    it('evaluateResults correctly identifies blackjack payout', () => {
        // Player BJ
        engine.startGame(100);
        engine.playerHands[0].cards = [
             { suit: '♠', value: 'A' },
             { suit: '♣', value: 'K' }
        ]; // 21 BJ
        engine.dealerHand = [
             { suit: '♥', value: 'K' },
             { suit: '♦', value: '8' }
        ]; // 18

        const result = engine.evaluateResults();
        expect(result.results[0].result).toBe('win');
        expect(result.results[0].winMultiplier).toBe(2.5); // CONFIG.PAYOUT.BLACKJACK
    });
});
