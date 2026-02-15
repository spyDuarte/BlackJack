/**
 * Abstract class representing a shuffling strategy.
 */
export class ShuffleStrategy {
    /**
     * Shuffles the given array of cards.
     * @param {Array} _cards - The cards to shuffle.
     * @returns {Array} The shuffled cards.
     */
    shuffle(_cards) {
        throw new Error('shuffle() method must be implemented by concrete strategy');
    }
}
