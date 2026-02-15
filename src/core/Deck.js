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
        this.shuffleWithMode(CONFIG.SHUFFLE_MODE);
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
        // Place cut card leaving 20-40% of cards remaining (60-80% penetration)
        // If PENETRATION_THRESHOLD is 0.2 (20%), we reserve 20-40% of cards at the end.
        // We place the cut card at 'total - reserved', so index is high.
        // Wait, cutCardPosition is usually the index *from the start* where we stop.
        // If threshold is 0.2, we want to stop when 20% remain.
        // So cutCardPosition should be around 80% of totalCards.
        // Logic below: minCut = 0.2 * total (e.g. 62 cards of 312).
        // cutCardPosition = 62...124. This is very early in the deck!
        // This implies we stop after dealing only ~20-40% of cards?
        // That contradicts "60-80% penetration".

        // CORRECTION: cutCardPosition should be the index where the cut card IS.
        // When cards.length <= cutCardPosition + 1, we reshuffle.
        // Deck is popped from end? No, draw() uses pop().
        // cards = [0, 1, ..., 311]. pop() returns 311.
        // remainingCards = length.
        // We want to reshuffle when remainingCards <= X (e.g. 60).
        // So cutCardPosition should be X.

        const minReserved = Math.floor(this.totalCards * CONFIG.PENETRATION_THRESHOLD);
        const maxReserved = Math.floor(this.totalCards * CONFIG.PENETRATION_THRESHOLD * 2);

        // We want cutCardPosition to represent the number of cards *remaining* when we cut.
        this.cutCardPosition = minReserved + this._getRandomInt(maxReserved - minReserved);
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
     * Simulates a casino-like shuffle sequence.
     * Sequence: multiple riffles, strip, and cut.
     * @param {number} passes - Number of riffle passes.
     */
    shuffleCasino(passes = CONFIG.CASINO_SHUFFLE_PASSES) {
        const rifflePasses = Math.max(1, Number.isFinite(passes) ? Math.floor(passes) : 1);

        for (let i = 0; i < rifflePasses; i++) {
            this._riffleShuffle();
        }

        this._stripShuffle();
        this._cutShuffle();
    }

    /**
     * Applies the configured shuffle mode.
     * Falls back to Fisher-Yates for unknown modes.
     * @param {string} mode
     */
    shuffleWithMode(mode = CONFIG.SHUFFLE_MODE) {
        if (mode === 'casino') {
            this.shuffleCasino();
            return;
        }
        this.shuffle();
    }

    /**
     * Burns cards from the top of the shoe.
     * @param {number} count - Number of cards to burn.
     * @returns {number} Number of cards actually burned.
     */
    burnCards(count = CONFIG.BURN_CARDS_AFTER_SHUFFLE) {
        const safeCount = Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0);
        const burnCount = Math.min(safeCount, this.cards.length);
        for (let i = 0; i < burnCount; i++) {
            this.cards.pop();
        }
        return burnCount;
    }

    _riffleShuffle() {
        const splitOffset = Math.floor(this.cards.length * 0.1);
        const splitPoint = Math.floor(this.cards.length / 2) + this._getRandomInt(splitOffset * 2 + 1) - splitOffset;
        const left = this.cards.slice(0, splitPoint);
        const right = this.cards.slice(splitPoint);
        const shuffled = [];

        while (left.length || right.length) {
            if (!left.length) {
                // Drop remaining right cards in groups
                const dropCount = Math.min(1 + this._getRandomInt(4), right.length);
                for (let i = 0; i < dropCount; i++) shuffled.push(right.shift());
                continue;
            }
            if (!right.length) {
                // Drop remaining left cards in groups
                const dropCount = Math.min(1 + this._getRandomInt(4), left.length);
                for (let i = 0; i < dropCount; i++) shuffled.push(left.shift());
                continue;
            }

            // Weight by pile size: larger pile has proportionally higher chance to drop
            const takeLeft = this._getRandomInt(left.length + right.length) < left.length;
            const pile = takeLeft ? left : right;
            // Drop 1-4 cards at once, simulating thumb releasing pressure
            const dropCount = Math.min(1 + this._getRandomInt(4), pile.length);
            for (let i = 0; i < dropCount; i++) shuffled.push(pile.shift());
        }

        this.cards = shuffled;
    }

    _stripShuffle() {
        const strips = [];
        let i = 0;
        while (i < this.cards.length) {
            const stripSize = 4 + this._getRandomInt(5); // 4..8, varies per strip
            strips.push(this.cards.slice(i, i + stripSize));
            i += stripSize;
        }
        // Randomly shuffle strips (Fisher-Yates) instead of just reversing
        for (let i = strips.length - 1; i > 0; i--) {
            const j = this._getRandomInt(i + 1);
            [strips[i], strips[j]] = [strips[j], strips[i]];
        }
        this.cards = strips.flat();
    }

    _cutShuffle() {
        const margin = Math.floor(this.cards.length * 0.2);
        const minCut = Math.max(1, margin);
        const maxCut = Math.max(minCut + 1, this.cards.length - margin);
        const cutPoint = minCut + this._getRandomInt(maxCut - minCut);
        this.cards = this.cards.slice(cutPoint).concat(this.cards.slice(0, cutPoint));
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

            if (!this._randomBuffer) {
                this._randomBuffer = new Uint32Array(1);
            }
            const buffer = this._randomBuffer;

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
            this.shuffleWithMode(CONFIG.SHUFFLE_MODE);
            this.burnCards(CONFIG.BURN_CARDS_AFTER_SHUFFLE);
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
