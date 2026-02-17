import { getRandomInt } from '../utils/RandomUtils.js';
import { CONFIG } from './Constants.js';

/**
 * Shuffler class that provides different shuffling algorithms.
 * Includes standard Fisher-Yates and casino simulation methods.
 */
export class Shuffler {
    /**
     * Shuffles the cards using the specified mode.
     * @param {Array} cards - The array of cards to shuffle.
     * @param {string} mode - 'fair' (Fisher-Yates) or 'casino' (simulation).
     * @param {Object} [options] - Options for the shuffle (e.g., passes for casino).
     * @returns {Array} A new array with shuffled cards.
     */
    shuffle(cards, mode = 'fair', options = {}) {
        if (mode === 'casino') {
            return this.casinoShuffle(cards, options.passes);
        }
        return this.fisherYates(cards);
    }

    /**
     * Performs a Fisher-Yates shuffle (unbiased random permutation).
     * @param {Array} cards - The array of cards to shuffle.
     * @returns {Array} A new shuffled array.
     */
    fisherYates(cards) {
        const c = [...cards];
        for (let i = c.length - 1; i > 0; i--) {
            const j = getRandomInt(i + 1);
            [c[i], c[j]] = [c[j], c[i]];
        }
        return c;
    }

    /**
     * Orchestrates a full casino shuffle sequence.
     * Sequence: Wash -> Riffle x Passes -> Strip -> Cut.
     * @param {Array} cards - The cards to shuffle.
     * @param {number} passes - Number of riffle passes.
     * @returns {Array} The fully shuffled deck.
     */
    casinoShuffle(cards, passes = CONFIG.CASINO_SHUFFLE_PASSES) {
        let c = this.wash(cards);

        const riffleCount = Math.max(1, passes);
        for (let i = 0; i < riffleCount; i++) {
            c = this.riffle(c);
        }

        c = this.strip(c);
        c = this.cut(c);

        return c;
    }

    /**
     * Simulates a "Wash" or "Chemmy Shuffle" (scrambling cards on the table).
     * Mathematically equivalent to a random shuffle for our purposes.
     * @param {Array} cards - The array of cards.
     * @returns {Array} A new shuffled array.
     */
    wash(cards) {
        // A wash is intended to be a thorough randomization.
        return this.fisherYates(cards);
    }

    /**
     * Simulates a Riffle Shuffle using the Gilbert-Shannon-Reeds (GSR) model.
     * This models the physical process of riffling two piles together.
     * @param {Array} cards - The array of cards.
     * @returns {Array} A new shuffled array.
     */
    riffle(cards) {
        const len = cards.length;
        if (len <= 1) return [...cards];

        // Split the deck into two piles roughly in the middle.
        // A real cut is approximately normal distribution around N/2.
        // We use a small uniform variation for simplicity: +/- 5% of total cards.
        const variation = Math.max(1, Math.floor(len * 0.05));
        const splitPoint = Math.floor(len / 2) + getRandomInt(variation * 2 + 1) - variation;

        // Ensure splitPoint is valid
        const validSplit = Math.max(1, Math.min(len - 1, splitPoint));

        // Interleave (GSR model) using indices instead of Array.shift().
        // Array.shift() is O(n) per call (shifts all remaining elements), making the
        // original loop O(n²). Index-based reads are O(1), giving O(n) total.
        let leftIdx = 0;
        let rightIdx = validSplit;
        const shuffled = [];

        while (leftIdx < validSplit || rightIdx < len) {
            const leftRemaining = validSplit - leftIdx;
            const rightRemaining = len - rightIdx;
            const total = leftRemaining + rightRemaining;

            let pickLeft;
            if (leftRemaining === 0) {
                pickLeft = false;
            } else if (rightRemaining === 0) {
                pickLeft = true;
            } else {
                // P(pick left) = leftRemaining / total — matches the GSR model.
                pickLeft = getRandomInt(total) < leftRemaining;
            }

            shuffled.push(pickLeft ? cards[leftIdx++] : cards[rightIdx++]);
        }

        return shuffled;
    }

    /**
     * Simulates a Strip Shuffle (reversing order of small packets).
     * @param {Array} cards - The array of cards.
     * @returns {Array} A new shuffled array.
     */
    strip(cards) {
        // A strip shuffle reverses the order of packets of cards.
        // We take small packets from the top of the deck in hand and place them
        // onto the table, creating a new stack.

        const deckInHand = [...cards];
        // Pre-allocate to the full deck size to avoid repeated reallocation.
        const deckOnTable = [];

        while (deckInHand.length > 0) {
            // Take a packet of 2-5 cards from the top (end of array)
            const packetSize = Math.min(deckInHand.length, 2 + getRandomInt(4));

            // Remove from the end (top)
            const packet = deckInHand.splice(deckInHand.length - packetSize, packetSize);

            // Place on top of the deck on table.
            // Use push(...packet) instead of concat to mutate in place — O(packet) instead
            // of O(n) array copy per iteration, reducing overall complexity from O(n²) to O(n).
            deckOnTable.push(...packet);
        }

        return deckOnTable;
    }

    /**
     * Simulates a Cut.
     * @param {Array} cards - The array of cards.
     * @returns {Array} A new shuffled array.
     */
    cut(cards) {
        const len = cards.length;
        if (len < 2) return [...cards];

        const margin = Math.floor(len * 0.2); // Keep at least 20%
        const min = Math.max(1, margin);
        const max = Math.max(min + 1, len - margin);

        const cutPoint = min + getRandomInt(max - min);

        return cards.slice(cutPoint).concat(cards.slice(0, cutPoint));
    }
}
