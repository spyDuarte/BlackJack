import { getRandomInt } from '../../utils/RandomUtils.js';
import { CONFIG } from '../Constants.js';

/**
 * Performs a Fisher-Yates shuffle (unbiased random permutation).
 * @param {Array} cards - The array of cards to shuffle.
 * @returns {Array} A new shuffled array.
 */
export function fisherYates(cards) {
    const c = [...cards];
    for (let i = c.length - 1; i > 0; i--) {
        const j = getRandomInt(i + 1);
        [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
}

/**
 * Simulates a "Wash" or "Chemmy Shuffle" (scrambling cards on the table).
 * Mathematically equivalent to a random shuffle for our purposes.
 * @param {Array} cards - The array of cards.
 * @returns {Array} A new shuffled array.
 */
export function wash(cards) {
    // A wash is intended to be a thorough randomization.
    return fisherYates(cards);
}

/**
 * Simulates a Riffle Shuffle using the Gilbert-Shannon-Reeds (GSR) model.
 * This models the physical process of riffling two piles together.
 * @param {Array} cards - The array of cards.
 * @returns {Array} A new shuffled array.
 */
export function riffle(cards) {
    const len = cards.length;
    if (len <= 1) return [...cards];

    // Split the deck into two piles roughly in the middle.
    // A real cut is approximately normal distribution around N/2.
    // We use a small uniform variation for simplicity: +/- 5% of total cards.
    const variation = Math.max(1, Math.floor(len * 0.05));
    const splitPoint = Math.floor(len / 2) + getRandomInt(variation * 2 + 1) - variation;

    // Ensure splitPoint is valid
    const validSplit = Math.max(1, Math.min(len - 1, splitPoint));

    const left = cards.slice(0, validSplit);
    const right = cards.slice(validSplit);
    const shuffled = [];

    // Interleave (GSR model)
    // Probability of taking next card from left pile is size(Left) / (size(Left) + size(Right)).
    while (left.length > 0 || right.length > 0) {
        if (left.length === 0) {
            shuffled.push(right.shift());
        } else if (right.length === 0) {
            shuffled.push(left.shift());
        } else {
            const total = left.length + right.length;
            // If random integer [0, total-1] is < left.length, pick left.
            // This corresponds to probability P = left.length / total.
            if (getRandomInt(total) < left.length) {
                shuffled.push(left.shift());
            } else {
                shuffled.push(right.shift());
            }
        }
    }
    return shuffled;
}

/**
 * Simulates a Strip Shuffle (reversing order of small packets).
 * @param {Array} cards - The array of cards.
 * @returns {Array} A new shuffled array.
 */
export function strip(cards) {
    // A strip shuffle reverses the order of packets of cards.
    // We take small packets from the top of the deck in hand and place them
    // onto the table, creating a new stack.

    const deckInHand = [...cards];
    let deckOnTable = [];

    while (deckInHand.length > 0) {
        // Take a packet of 2-5 cards from the top (end of array)
        const packetSize = Math.min(deckInHand.length, 2 + getRandomInt(4));

        // Remove from the end (top)
        const packet = deckInHand.splice(deckInHand.length - packetSize, packetSize);

        // Place on top of the deck on table.
        // Since deckOnTable builds up from bottom to top, and we place packets
        // sequentially, the first packet from top of hand becomes bottom of table stack.
        // So we append the packet to the end of deckOnTable.
        deckOnTable = deckOnTable.concat(packet);
    }

    return deckOnTable;
}

/**
 * Simulates a Cut.
 * @param {Array} cards - The array of cards.
 * @returns {Array} A new shuffled array.
 */
export function cut(cards) {
    const len = cards.length;
    if (len < 2) return [...cards];

    const margin = Math.floor(len * 0.2); // Keep at least 20%
    const min = Math.max(1, margin);
    const max = Math.max(min + 1, len - margin);

    const cutPoint = min + getRandomInt(max - min);

    return cards.slice(cutPoint).concat(cards.slice(0, cutPoint));
}

/**
 * Orchestrates a full casino shuffle sequence.
 * Sequence: Wash -> Riffle x Passes -> Strip -> Cut.
 * @param {Array} cards - The cards to shuffle.
 * @param {number} passes - Number of riffle passes.
 * @returns {Array} The fully shuffled deck.
 */
export function casinoShuffle(cards, passes = CONFIG.CASINO_SHUFFLE_PASSES) {
    let c = wash(cards);

    const riffleCount = Math.max(1, passes);
    for (let i = 0; i < riffleCount; i++) {
        c = riffle(c);
    }

    c = strip(c);
    c = cut(c);

    return c;
}
