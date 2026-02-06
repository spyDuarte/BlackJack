import { CONFIG } from './Constants.js';

export class Deck {
    constructor(numberOfDecks = CONFIG.DECKS) {
        this.numberOfDecks = numberOfDecks;
        this.cards = [];
        this.reset();
        this.shuffle();
    }

    reset() {
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.cards = [];

        for (let i = 0; i < this.numberOfDecks; i++) {
            for (let suit of suits) {
                for (let value of values) {
                    this.cards.push({ suit, value });
                }
            }
        }
    }

    get remainingCards() {
        return this.cards.length;
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
        return this.cards.pop();
    }
}
