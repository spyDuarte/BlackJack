import { Deck } from './Deck.js';
import { CONFIG } from './Constants.js';
import * as HandUtils from '../utils/HandUtils.js';

/**
 * Core engine for Blackjack game logic.
 * Handles state, deck, hand manipulation, and rule evaluation.
 */
export class BlackjackEngine {
    constructor() {
        /** @type {Deck} */
        this.deck = new Deck();
        this.resetState();
    }

    /**
     * Resets the game state for a new round.
     */
    resetState() {
        /** @type {Array<Object>} Player's hands */
        this.playerHands = [];
        /** @type {Array<Object>} Dealer's hand */
        this.dealerHand = [];
        this.currentHandIndex = 0;
        this._dealerRevealed = false;
        this.gameStarted = false;
        this.gameOver = false;
        this.insuranceTaken = false;
    }

    /**
     * Shuffles the deck.
     */
    shuffleDeck() {
        this.deck.reset();
        this.deck.shuffle();
    }

    /**
     * Starts a new game round.
     * @param {number} bet - The bet amount.
     * @returns {Object} Initial deal state (hands).
     */
    startGame(bet) {
        if (this.deck.needsReshuffle) {
            this.shuffleDeck();
        }

        this.resetState();
        this.gameStarted = true;

        // Deal 2 cards to player and dealer
        // Standard dealing order: Player, Dealer, Player, Dealer
        const p1 = this.deck.draw();
        const d1 = this.deck.draw();
        const p2 = this.deck.draw();
        const d2 = this.deck.draw(); // Hole card, not counted yet

        this.playerHands = [{
            cards: [p1, p2],
            bet: bet,
            status: 'playing',
            splitFromAces: false
        }];
        this.dealerHand = [d1, d2];

        return {
            playerHands: this.playerHands,
            dealerHand: this.dealerHand
        };
    }

    /**
     * Gets the dealer's visible card.
     * @returns {Object} The first card of the dealer.
     */
    get dealerRevealed() {
        return this._dealerRevealed;
    }

    set dealerRevealed(value) {
        this._dealerRevealed = value;
    }

    get dealerUpCard() {
        return this.dealerHand[0];
    }

    /**
     * Adds a card to the specified player hand.
     * @param {number} handIndex - Index of the hand to hit.
     * @returns {Object|null} Result object with updated hand and drawn card, or null if invalid.
     */
    hit(handIndex) {
        const hand = this.playerHands[handIndex];
        if (!hand || hand.status !== 'playing') return null;

        const card = this.deck.draw();
        hand.cards.push(card);

        const newValue = HandUtils.calculateHandValue(hand.cards);
        if (newValue > 21) {
            hand.status = 'busted';
        } else if (newValue === 21) {
            hand.status = 'stand';
        }

        return { hand, card };
    }

    /**
     * Stands on the current hand.
     * @param {number} handIndex - Index of the hand.
     * @returns {Object|null} Updated hand object.
     */
    stand(handIndex) {
        const hand = this.playerHands[handIndex];
        if (!hand) return null;
        hand.status = 'stand';
        return { hand };
    }

    /**
     * Doubles down on the current hand (double bet, one card only).
     * @param {number} handIndex - Index of the hand.
     * @returns {Object|null} Result object or null if invalid.
     */
    double(handIndex) {
        const hand = this.playerHands[handIndex];
        if (!hand || hand.status !== 'playing') return null;

        const card = this.deck.draw();
        hand.cards.push(card);
        hand.bet *= 2;

        if (HandUtils.calculateHandValue(hand.cards) > 21) {
            hand.status = 'busted';
        } else {
            hand.status = 'stand';
        }

        return { hand, card };
    }

    /**
     * Splits the current hand into two.
     * @param {number} handIndex - Index of the hand.
     * @returns {Object|null} Result object containing split details or null if invalid.
     */
    split(handIndex) {
        const hand = this.playerHands[handIndex];
        if (!hand) return null;

        if (hand.cards.length !== 2) return null;
        // Strict equality check for split (e.g. 10 and J cannot be split in this rule set, only 10-10 or J-J)
        if (hand.cards[0].value !== hand.cards[1].value) return null;

        // No re-splitting Aces
        if (hand.splitFromAces) return null;

        const isSplittingAces = hand.cards[0].value === 'A';

        const splitCard = hand.cards.pop();
        const newHand = {
            cards: [splitCard],
            bet: hand.bet,
            status: 'playing',
            splitFromAces: isSplittingAces
        };

        // Deal new cards
        const c1 = this.deck.draw();
        const c2 = this.deck.draw();

        hand.cards.push(c1);
        newHand.cards.push(c2);

        hand.splitFromAces = isSplittingAces;

        this.playerHands.splice(handIndex + 1, 0, newHand);

        if (isSplittingAces) {
            hand.status = 'stand';
            newHand.status = 'stand';
        }

        return {
            handIndex,
            newHandIndex: handIndex + 1,
            isSplittingAces
        };
    }

    /**
     * Surrenders the current hand (gives up half bet).
     * @param {number} handIndex - Index of the hand.
     * @returns {Object|null} Updated hand object.
     */
    surrender(handIndex) {
        const hand = this.playerHands[handIndex];
        if (!hand) return null;

        // Late Surrender only allowed on initial hand (no splits)
        if (this.playerHands.length > 1) return null;
        if (hand.cards.length !== 2) return null;

        hand.status = 'surrender';
        return { hand };
    }

    /**
     * Determines if the dealer should hit based on Soft 17 rule.
     * @returns {boolean} True if dealer should hit.
     */
    dealerShouldHit() {
        const value = HandUtils.calculateHandValue(this.dealerHand);
        const isSoft = HandUtils.isSoftHand(this.dealerHand);
        return (value < 17 || (value === 17 && isSoft));
    }

    /**
     * Performs a single hit for the dealer if rules allow.
     * @returns {Object|null} The drawn card or null.
     */
    dealerHit() {
        if (this.dealerShouldHit()) {
            const card = this.deck.draw();
            this.dealerHand.push(card);
            return card;
        }
        return null;
    }

    /**
     * Simulates the entire dealer turn at once (for instant results).
     * @returns {Object} Final dealer hand and list of drawn cards.
     */
    dealerTurn() {
        this.dealerRevealed = true; // Setter handles counting
        const cardsDrawn = [];

        while (this.dealerShouldHit()) {
            const card = this.dealerHit();
            if (card) cardsDrawn.push(card);
        }

        return {
            dealerHand: this.dealerHand,
            cardsDrawn
        };
    }

    /**
     * Evaluates the game results for all hands against the dealer.
     * @returns {Object} Result summary including payouts.
     */
    evaluateResults() {
        const dealerValue = HandUtils.calculateHandValue(this.dealerHand);
        const dealerBJ = HandUtils.isNaturalBlackjack(this.dealerHand, 1);

        const results = this.playerHands.map(hand => {
            const playerValue = HandUtils.calculateHandValue(hand.cards);
            const playerBJ = HandUtils.isNaturalBlackjack(hand.cards, this.playerHands.length);

            let result = 'lose';
            let winMultiplier = 0;

            if (hand.status === 'surrender') {
                result = 'surrender';
                winMultiplier = 0.5;
            } else if (hand.status === 'busted') {
                result = 'lose';
                winMultiplier = 0;
            } else if (dealerBJ) {
                if (playerBJ) {
                    result = 'tie';
                    winMultiplier = 1;
                } else {
                    result = 'lose';
                    winMultiplier = 0;
                }
            } else if (dealerValue > 21) {
                result = 'win';
                winMultiplier = 2;
                if (playerBJ) winMultiplier = CONFIG.PAYOUT.BLACKJACK;
            } else if (playerBJ) {
                result = 'win';
                winMultiplier = CONFIG.PAYOUT.BLACKJACK;
            } else if (playerValue > dealerValue) {
                result = 'win';
                winMultiplier = 2;
            } else if (playerValue === dealerValue) {
                result = 'tie';
                winMultiplier = 1;
            } else {
                result = 'lose';
                winMultiplier = 0;
            }

            return {
                hand,
                result,
                winMultiplier,
                payout: Math.floor(hand.bet * winMultiplier)
            };
        });

        return {
            dealerValue,
            dealerBJ,
            results
        };
    }

    /**
     * Gets the current public state of the engine.
     * @returns {Object} Game state.
     */
    getState() {
        return {
            playerHands: this.playerHands,
            dealerHand: this.dealerHand,
            currentHandIndex: this.currentHandIndex,
            dealerRevealed: this.dealerRevealed,
            gameStarted: this.gameStarted,
            gameOver: this.gameOver,
            remainingCards: this.deck.remainingCards,
            totalCards: this.deck.totalCards
        };
    }
}
