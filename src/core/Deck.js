import { CONFIG } from './Constants.js';

export class Deck {
    constructor(numberOfDecks = CONFIG.DECKS) {
        this.numberOfDecks = numberOfDecks;
        this.cards = [];
        this.cutCardReached = false;
        this.reset();
        this.shuffle();
    }

    get totalCards() {
        return this.numberOfDecks * 52;
    }

    reset() {
        const suits = ['\u2660', '\u2665', '\u2666', '\u2663'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.cards = [];

        for (let i = 0; i < this.numberOfDecks; i++) {
            for (let suit of suits) {
                for (let value of values) {
                    this.cards.push({ suit, value });
                }
            }
        }

        this.cutCardReached = false;
        // Place cut card randomly between 60-80% penetration
        const minCut = Math.floor(this.totalCards * 0.2);
        const maxCut = Math.floor(this.totalCards * 0.4);
        this.cutCardPosition = minCut + Math.floor(Math.random() * (maxCut - minCut));
    }

    get remainingCards() {
        return this.cards.length;
    }

    get needsReshuffle() {
        return this.cutCardReached;
    }

    shuffle() {
        // Fisher-Yates shuffle with cryptographically secure random values
        const len = this.cards.length;
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
            const randomValues = new Uint32Array(len);
            crypto.getRandomValues(randomValues);
            for (let i = len - 1; i > 0; i--) {
                const j = randomValues[i] % (i + 1);
                [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
            }
        } else {
            // Fallback to Math.random for environments without crypto
            for (let i = len - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
            }
        }
    }

    draw() {
        if (this.cards.length === 0) {
            this.reset();
            this.shuffle();
        }

        // Check if cut card was reached during play
        if (this.cards.length <= this.cutCardPosition) {
            this.cutCardReached = true;
        }

        return this.cards.pop();
    }
}
