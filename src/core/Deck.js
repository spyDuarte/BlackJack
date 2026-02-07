import { CONFIG } from './Constants.js';

/**
 * Represents a shoe of playing cards.
 * Handles shuffling, dealing, and cut card logic.
 */
export class Deck {
    /**
     * Creates a new Deck.
     * @param {number} numberOfDecks - Number of standard 52-card decks to include.
     */
    constructor(numberOfDecks = CONFIG.DECKS) {
        this.numberOfDecks = numberOfDecks;
        this.cards = [];
        this.cutCardReached = false;
        this.reset();
        this.shuffle();
    }

    /**
     * Total number of cards in the full shoe.
     * @returns {number}
     */
    get totalCards() {
        return this.numberOfDecks * 52;
    }

    /**
     * Resets the deck to a full, ordered state and places the cut card.
     */
    reset() {
        const suits = ['\u2660', '\u2665', '\u2666', '\u2663'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.cards = [];

        for (let i = 0; i < this.numberOfDecks; i++) {
            for (const suit of suits) {
                for (const value of values) {
                    this.cards.push({ suit, value });
                }
            }
        }

        this.cutCardReached = false;
        // Place cut card randomly between 60-80% penetration
        const minCut = Math.floor(this.totalCards * 0.2);
        const maxCut = Math.floor(this.totalCards * 0.4);
        this.cutCardPosition = minCut + this._getRandomInt(maxCut - minCut);
    }

    /**
     * Number of cards currently remaining in the shoe.
     * @returns {number}
     */
    get remainingCards() {
        return this.cards.length;
    }

    /**
     * Whether the cut card has been reached/passed.
     * @returns {boolean}
     */
    get needsReshuffle() {
        return this.cutCardReached;
    }

    /**
     * Shuffles the cards using Fisher-Yates algorithm.
     * Uses `crypto.getRandomValues` if available for better randomness.
     */
    shuffle() {
        // Fisher-Yates shuffle with cryptographically secure random values
        const len = this.cards.length;
        for (let i = len - 1; i > 0; i--) {
            const j = this._getRandomInt(i + 1);
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    /**
     * Generates a random integer between 0 and max-1 using crypto if available.
     * Uses rejection sampling to avoid modulo bias.
     * @param {number} max - The exclusive upper bound.
     * @returns {number} Random integer in [0, max-1].
     */
    _getRandomInt(max) {
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            // Rejection sampling to avoid modulo bias
            // We want a number in [0, max-1]
            // We generate a random 32-bit integer.
            // If the integer is >= limit, we reject and retry.
            // limit is the largest multiple of max <= 2^32.

            const maxUint32 = 4294967296;
            const limit = maxUint32 - (maxUint32 % max);
            const buffer = new Uint32Array(1);

            do {
                crypto.getRandomValues(buffer);
            } while (buffer[0] >= limit);

            return buffer[0] % max;
        } else {
            return Math.floor(Math.random() * max);
        }
    }

    /**
     * Draws a card from the top of the deck.
     * Reshuffles if empty. Updates cut card status.
     * @returns {Object} The drawn card {suit, value}.
     */
    draw() {
        if (this.cards.length === 0) {
            this.reset();
            this.shuffle();
        }

        // Check if cut card was reached during play (including the card being drawn now)
        // If cutCardPosition is 10, it means 10 cards are reserved.
        // If we have 11 cards, we are about to draw the 11th, leaving 10.
        // This effectively implies we hit the cut card marker.
        if (this.cards.length <= this.cutCardPosition + 1) {
            this.cutCardReached = true;
        }

        return this.cards.pop();
    }
}
