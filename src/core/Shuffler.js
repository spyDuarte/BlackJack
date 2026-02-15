import { FisherYatesStrategy } from './shuffling/strategies/FisherYatesStrategy.js';
import { CasinoStrategy } from './shuffling/strategies/CasinoStrategy.js';
import { CONFIG } from './Constants.js';

/**
 * Shuffler class acting as a Strategy Context.
 * Delegates shuffling to the configured strategy.
 */
export class Shuffler {
    /**
     * Creates a Shuffler with a specific strategy.
     * @param {ShuffleStrategy} strategy - The shuffling strategy to use.
     */
    constructor(strategy) {
        this.strategy = strategy || Shuffler.createStrategy(CONFIG.SHUFFLE_MODE);
    }

    /**
     * Factory method to create a strategy based on mode.
     * @param {string} mode - 'fair', 'casino', or 'continuous'.
     * @param {Object} [options] - Strategy options.
     * @returns {ShuffleStrategy}
     */
    static createStrategy(mode, options = {}) {
        if (mode === 'casino') {
            return new CasinoStrategy(options.passes);
        }
        // 'continuous' and 'fair' both use Fisher-Yates (perfect randomness)
        return new FisherYatesStrategy();
    }

    /**
     * Sets the shuffling strategy.
     * @param {ShuffleStrategy} strategy
     */
    setStrategy(strategy) {
        this.strategy = strategy;
    }

    /**
     * Shuffles the cards using the current strategy.
     * @param {Array} cards
     * @returns {Array} Shuffled cards.
     */
    shuffle(cards) {
        return this.strategy.shuffle(cards);
    }
}
