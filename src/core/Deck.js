import { CONFIG } from './Constants.js';
import { Shuffler } from './Shuffler.js';
import { getRandomInt } from '../utils/RandomUtils.js';

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

        const minReserved = Math.floor(this.totalCards * CONFIG.PENETRATION_THRESHOLD);
        const maxReserved = Math.floor(this.totalCards * CONFIG.PENETRATION_THRESHOLD * 2);

        // We want cutCardPosition to represent the number of cards *remaining* when we cut.
        this.cutCardPosition = minReserved + getRandomInt(maxReserved - minReserved);
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
        this.cards = Shuffler.fisherYates(this.cards);
    }

    /**
     * Simulates a casino-like shuffle sequence.
     * Sequence: Wash -> Riffle x Passes -> Strip -> Cut.
     * @param {number} passes - Number of riffle passes.
     */
    shuffleCasino(passes = CONFIG.CASINO_SHUFFLE_PASSES) {
        this.cards = Shuffler.casinoShuffle(this.cards, passes);
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
        if (this.cards.length <= this.cutCardPosition + 1) {
            this.cutCardReached = true;
        }

        return this.cards.pop();
    }
}
