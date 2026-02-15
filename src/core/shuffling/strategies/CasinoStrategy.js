import { ShuffleStrategy } from './ShuffleStrategy.js';
import { casinoShuffle } from '../Algorithms.js';
import { CONFIG } from '../../Constants.js';

/**
 * Strategy for Casino-like shuffle simulation.
 * Wash -> Riffle -> Strip -> Cut.
 */
export class CasinoStrategy extends ShuffleStrategy {
    /**
     * @param {number} passes - Number of riffle passes.
     */
    constructor(passes = CONFIG.CASINO_SHUFFLE_PASSES) {
        super();
        this.passes = passes;
    }

    shuffle(cards) {
        return casinoShuffle(cards, this.passes);
    }
}
